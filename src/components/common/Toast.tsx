import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-emerald-400" size={16} />,
    error: <AlertCircle className="text-red-400" size={16} />,
    info: <CheckCircle2 className="text-blue-400" size={16} />
  };

  const bgStyles = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20'
  };

  return (
    <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md animate-slide-in-top`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl shadow-black/50 ${bgStyles[type]}`}>
        <div className="shrink-0">{icons[type]}</div>
        <p className="flex-1 text-sm font-medium text-white/90">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
