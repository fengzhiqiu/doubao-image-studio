import { invoke } from '@tauri-apps/api/core';
import type { AspectRatio } from '../types';

const MODEL = 'db';

export function getBaseUrl(wsUrl: string): string {
  return wsUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://')
    .replace('/ws', '');
}

async function httpPost(url: string, body: string): Promise<string> {
  // Try Tauri invoke first (bypasses WKWebView ATS), fallback to native fetch
  try {
    return await invoke<string>('generate_image_request', { url, body });
  } catch {
    const res = await window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return res.text();
  }
}

async function httpGet(url: string): Promise<unknown> {
  try {
    return await invoke<boolean>('check_worker', { url });
  } catch {
    const res = await window.fetch(url);
    return res.json();
  }
}

export interface ImageResult {
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

export async function generateImages(
  prompt: string,
  aspectRatio: AspectRatio,
  serverUrl: string,
  switchToImageMode: boolean = false,
  referenceImages: string[] = []
): Promise<ImageResult[]> {
  const base = getBaseUrl(serverUrl);
  const url = `${base}/api/images/generate`;
  const body = JSON.stringify({
    model: MODEL,
    prompt,
    aspect_ratio: aspectRatio,
    reference_images: referenceImages,
    switch_to_image_mode: switchToImageMode,
  });

  const text = await httpPost(url, body);
  const data = JSON.parse(text) as {
    success: boolean;
    images: { url?: string; imageUrl?: string; thumbnail_url?: string; width?: number; height?: number }[];
    error?: string;
  };

  if (!data.success) throw new Error(data.error ?? '生成失败');
  if (!data.images?.length) throw new Error('未返回图片');

  return data.images
    .map((img) => ({
      url: img.url ?? img.imageUrl ?? '',
      thumbnail_url: img.thumbnail_url,
      width: img.width,
      height: img.height
    }))
    .filter((img) => img.url !== '');
}

export async function checkWorkerStatus(serverUrl: string): Promise<boolean> {
  const base = getBaseUrl(serverUrl);
  const healthUrl = `${base}/api/health`;
  try {
    const result = await httpGet(healthUrl);
    if (typeof result === 'boolean') return result;
    const data = result as { registeredModels?: string[] };
    return (data.registeredModels?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
