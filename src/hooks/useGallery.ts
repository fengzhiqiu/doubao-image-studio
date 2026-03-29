import { useImageStore } from '../store/imageStore';
import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { GeneratedImage } from '../types';

export function useGallery() {
  const { images, removeImage, clearImages: storeClearImages, selectImage, selectedImageId } = useImageStore();

  const selected = images.find((img) => img.id === selectedImageId) ?? null;

  const handleSelect = useCallback(
    (img: GeneratedImage) => {
      selectImage(img.id === selectedImageId ? null : img.id);
    },
    [selectImage, selectedImageId]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      const img = images.find(i => i.id === id);
      if (img?.localPath) {
        try {
          await invoke('delete_file', { path: img.localPath });
        } catch (err) {
          console.error('Failed to delete local file:', err);
        }
      }
      removeImage(id);
      if (selectedImageId === id) selectImage(null);
    },
    [images, removeImage, selectImage, selectedImageId]
  );

  const handleClear = useCallback(async () => {
    if (confirm('确定要清空所有历史记录和本地图片吗？')) {
      try {
        await invoke('clear_history_images');
      } catch (err) {
        console.error('Failed to clear history images:', err);
      }
      storeClearImages();
      selectImage(null);
    }
  }, [storeClearImages, selectImage]);

  return {
    images,
    selected,
    selectedImageId,
    handleSelect,
    handleRemove,
    clearImages: handleClear,
  };
}
