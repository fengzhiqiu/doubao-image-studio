import React from 'react';
import type { AspectRatio } from '../../types';

const RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (v: AspectRatio) => void;
}

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  return (
    <div className="flex items-center" style={{ gap: '8px' }}>
      {RATIOS.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`text-[11px] rounded-lg font-medium transition-all duration-150 flex items-center justify-center ${
            value === r.value
              ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
              : 'text-white/35 hover:text-white/65 hover:bg-white/[0.06]'
          }`}
          style={{ 
            height: '30px', 
            padding: '0 10px',
            minWidth: '44px'
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
