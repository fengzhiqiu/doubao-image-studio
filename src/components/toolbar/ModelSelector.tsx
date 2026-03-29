import React from 'react';

interface ModelSelectorProps {
  value: string;
  onChange?: (v: string) => void;
}

export function ModelSelector({ }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-7 px-3 text-xs rounded-md font-medium bg-[#ebebff] text-[#5b5bd6] flex items-center">
        Doubao
      </span>
    </div>
  );
}
