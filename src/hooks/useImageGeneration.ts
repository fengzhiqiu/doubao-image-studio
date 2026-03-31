import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useImageStore, makeJob } from '../store/imageStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateImages } from '../services/doubaoApi';
import { getBaseUrl } from '../services/doubaoApi';
import type { AspectRatio } from '../types';

export function useImageGeneration() {
  const { settings } = useSettingsStore();
  const { setCurrentJob, updateCurrentJob, addImage, currentJob } = useImageStore();

  const generate = useCallback(
    async (prompt: string, _model?: string, aspectRatio?: AspectRatio, switchToImageMode?: boolean, referenceImages?: string[]) => {
      const targetRatio = aspectRatio ?? settings.defaultAspectRatio;
      const job = makeJob(prompt, 'doubao', targetRatio);
      
      // Add reference images to job state
      const jobWithRefs = { ...job, referenceImages };
      setCurrentJob(jobWithRefs);
      updateCurrentJob({ status: 'generating', progressText: '正在连接豆包...' });

      // Start polling for progress
      const base = getBaseUrl(settings.websocketUrl);
      const progressUrl = `${base}/api/progress`;
      let polling = true;
      
      const pollProgress = async () => {
        while (polling) {
          try {
            const text = await invoke<string>('fetch_text', { url: progressUrl });
            const data = JSON.parse(text) as { text: string; active: boolean };
            if (data.text && polling) {
              updateCurrentJob({ progressText: data.text });
            }
          } catch {
            // ignore polling errors
          }
          await new Promise(r => setTimeout(r, 1500));
        }
      };
      
      // Start polling in background
      pollProgress();

      try {
        const results = await generateImages(
          prompt, 
          targetRatio, 
          settings.websocketUrl, 
          switchToImageMode ?? false, 
          referenceImages
        );

        // Stop polling
        polling = false;

        const batchId = crypto.randomUUID();

        // Create image objects immediately using remote URLs
        const generatedImages = results.map((result) => {
          const id = crypto.randomUUID();
          return {
            id,
            batchId,
            url: result.url,
            thumbnailUrl: result.thumbnail_url,
            width: result.width,
            height: result.height,
            prompt,
            model: 'doubao' as const,
            aspectRatio: targetRatio,
            createdAt: Date.now(),
          };
        });

        // Add all returned images to gallery and sync to SQLite
        [...generatedImages].reverse().forEach(async (img) => {
          addImage(img);
          // Sync to SQLite (don't await to keep UI fast)
          fetch(`${base}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(img)
          }).catch(e => console.warn('History sync failed:', e));
        });

        updateCurrentJob({ status: 'success', result: generatedImages[0] });
      } catch (error) {
        polling = false;
        updateCurrentJob({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [settings, setCurrentJob, updateCurrentJob, addImage]
  );

  return { generate, currentJob };
}
