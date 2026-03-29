import type { GeneratedImage } from '../types';

/**
 * Download image URL as ArrayBuffer via fetch.
 */
export async function downloadImage(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Trigger a browser-native download of the image.
 * Works inside Tauri WebView without needing fs plugin permissions.
 */
export function saveImageLocally(image: GeneratedImage, data: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([data], { type: 'image/png' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `ai-studio-${image.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    resolve(objectUrl);
  });
}
