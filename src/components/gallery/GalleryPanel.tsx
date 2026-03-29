import React from 'react';
import { Trash2, Images } from 'lucide-react';
import { GalleryItem } from './GalleryItem';
import { useGallery } from '../../hooks/useGallery';

interface GalleryPanelProps {
  onReusePrompt: (prompt: string) => void;
  onUseAsReference?: (url: string) => void;
}

export function GalleryPanel({ onReusePrompt, onUseAsReference }: GalleryPanelProps) {
  const { images, selected, handleSelect, handleRemove, clearImages } = useGallery();

  return (
    <aside className="w-60 h-full flex flex-col border-l border-white/[0.06] bg-[#0f0f10] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Images size={14} className="text-white/30" />
          <span className="text-xs font-semibold text-white/50">历史记录</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">
            {images.length}
          </span>
        </div>
        {images.length > 0 && (
          <button
            onClick={clearImages}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/15 transition-all"
            title="清空全部"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-xs text-white/20">暂无历史记录</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {images.slice(0, 100).map((img) => (
              <GalleryItem
                key={img.id}
                image={img}
                selected={img.id === selected?.id}
                onSelect={() => handleSelect(img)}
                onRemove={() => handleRemove(img.id)}
                onReuse={onReusePrompt}
                onUseAsReference={onUseAsReference}
              />
            ))}
            {images.length > 100 && (
              <p className="text-[10px] text-white/20 text-center py-2">
                仅显示最近 100 条记录
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
