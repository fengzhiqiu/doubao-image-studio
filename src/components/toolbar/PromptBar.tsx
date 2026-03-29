import React, { useState, useRef, useCallback } from 'react';
import { Send, Sparkles, ImagePlay, Image as ImageIcon, X } from 'lucide-react';
import { AspectRatioSelector } from './AspectRatioSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { AspectRatio } from '../../types';

interface PromptBarProps {
  onSubmit: (prompt: string, aspectRatio: AspectRatio, switchToImageMode: boolean, referenceImages?: string[]) => void;
  disabled?: boolean;
  initialPrompt?: string;
  initialReferenceImage?: string;
}

export function PromptBar({ onSubmit, disabled, initialPrompt = '', initialReferenceImage }: PromptBarProps) {
  const { settings } = useSettingsStore();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(settings.defaultAspectRatio);
  const [switchMode, setSwitchMode] = useState(false);
  const [refImage, setRefImage] = useState<string | null>(initialReferenceImage || null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, aspectRatio, switchMode, refImage ? [refImage] : []);
    setSwitchMode(false);
    setPrompt('');
    setRefImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [prompt, aspectRatio, disabled, switchMode, refImage, onSubmit]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setRefImage(base64);
    };
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be picked again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      textareaRef.current?.focus();
    }
  }, [initialPrompt]);

  React.useEffect(() => {
    if (initialReferenceImage) {
      setRefImage(initialReferenceImage);
    }
  }, [initialReferenceImage]);

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      <div className="w-full glass-panel border border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden relative before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:to-transparent before:pointer-events-none">
        
        {/* Reference Image Preview */}
        {refImage && (
          <div className="px-4 pt-3 flex items-start">
            <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/20">
              <img src={refImage} className="w-full h-full object-cover" />
              <button 
                onClick={() => setRefImage(null)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={refImage ? "基于这张图片描述你的修改或风格..." : "描述你想要生成的图片，例如：星空下奔跑的赛博朋克狐狸..."}
          rows={1}
          disabled={disabled}
          className="w-full text-sm text-white/85 placeholder-white/20 resize-none outline-none bg-transparent leading-relaxed"
          style={{ padding: refImage ? '8px 16px 6px' : '12px 16px 6px' }}
        />
        <div className="flex items-center justify-between px-4 pb-2 pt-1 min-h-[44px]">
          <div className="flex items-center" style={{ gap: '12px' }}>
            <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
            <div className="w-px h-3 bg-white/10 mx-0.5" />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center rounded-lg transition-all duration-150 ${
                refImage ? 'text-violet-400 bg-violet-500/10' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.06]'
              }`}
              style={{ height: '30px', padding: '0 12px', gap: '6px' }}
              title="上传参考图"
            >
              <ImageIcon size={13} />
              <span className="text-[11px]">{refImage ? '已选择' : '上传图'}</span>
            </button>

            <div className="w-px h-3 bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={() => setSwitchMode(v => !v)}
              title={switchMode ? '将切换到图像模式后发送' : '已在图像模式，直接发送'}
              className={`flex items-center justify-center text-[11px] rounded-lg transition-all duration-150 ${
                switchMode
                  ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                  : 'text-white/35 hover:text-white/65 hover:bg-white/[0.06]'
              }`}
              style={{ height: '30px', padding: '0 12px', gap: '6px' }}
            >
              <ImagePlay size={13} />
              <span>{switchMode ? '切换模式' : '图像模式'}</span>
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || disabled}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 text-white hover:from-violet-400 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-violet-900/50"
          >
            {disabled ? <Sparkles size={15} className="animate-pulse" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
