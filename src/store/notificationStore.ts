import { create } from 'zustand';
import type { ToastType } from '../components/common/Toast';

interface NotificationState {
  message: string | null;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  message: null,
  type: 'success',
  show: (message, type = 'success') => set({ message, type }),
  hide: () => set({ message: null }),
}));
