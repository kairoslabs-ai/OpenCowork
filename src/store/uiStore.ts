import { create } from 'zustand';
import type { UIStore, Toast, ConfirmationPrompt } from '../types';

/**
 * UI store - Manages UI state (modals, toasts, theme, etc.)
 */
export const useUIStore = create<UIStore>((set) => ({
  confirmDialog: null,
  toasts: [],
  sidebarOpen: true,
  theme: 'light',

  showConfirmation: (prompt: ConfirmationPrompt) =>
    set({ confirmDialog: prompt }),

  hideConfirmation: () =>
    set({ confirmDialog: null }),

  addToast: (toast: Toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast],
    })),

  removeToast: (toastId: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    })),

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  setTheme: (theme: 'light' | 'dark') =>
    set({ theme }),
}));
