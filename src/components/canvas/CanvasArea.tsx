import React from 'react';
import { EmptyState } from './EmptyState';
import { ImageCard } from './ImageCard';
import { useGallery } from '../../hooks/useGallery';
import { useImageStore } from '../../store/imageStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { invoke } from '@tauri-apps/api/core';
import type { GeneratedImage } from '../../types';

interface CanvasAreaProps {
  onReusePrompt: (prompt: string) => void;
  onUseAsReference?: (url: string) => void;
}

export function CanvasArea({ onReusePrompt, onUseAsReference }: CanvasAreaProps) {
  const { images, handleRemove, selectedImageId } = useGallery();
  const { setViewedImage } = useImageStore();
  const currentJob = useImageStore((s) => s.currentJob);

  const handleDownload = async (img: GeneratedImage) => {
    try {
      const { settings } = useSettingsStore.getState();
      const showToast = useNotificationStore.getState().show;
      console.log('Downloading image:', img.url, 'to', settings.saveDir || 'default');
      await invoke('download_image', { 
        url: img.url, 
        filename: `doubao_${img.id}.png`,
        saveDir: settings.saveDir || null
      });
      showToast('图片下载成功！');
    } catch (err) {
      const showToast = useNotificationStore.getState().show;
      console.error('Download failed:', err);
      showToast('获取到图片链接，请在浏览器中保存', 'error');
      window.open(img.url, '_blank');
    }
  };

  const isGenerating = currentJob?.status === 'generating';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0f0f10]">
      {images.length === 0 && !isGenerating ? (
        <EmptyState />
      ) : (
        <div 
          className="max-w-[1600px] mx-auto grid gap-4" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          {isGenerating && (
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] flex items-center justify-center aspect-square">
              <div className="flex flex-col items-center gap-2.5">
                <span className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Generating...</span>
              </div>
            </div>
          )}
          {images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              selected={selectedImageId === img.id}
              onSelect={() => setViewedImage(img.id)}
              onRemove={() => handleRemove(img.id)}
              onReuse={onReusePrompt}
              onDownload={() => handleDownload(img)}
              onUseAsReference={onUseAsReference}
            />
          ))}
        </div>
      )}
    </div>
  );
}
