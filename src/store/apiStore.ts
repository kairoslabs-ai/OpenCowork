import { create } from 'zustand';
import type { APIStore } from '../types';

/**
 * API store - Manages API configuration and connectivity
 */
export const useAPIStore = create<APIStore>((set) => ({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  token: localStorage.getItem('api_token') || null,
  isConnected: false,

  setBaseUrl: (url: string) =>
    set({ baseUrl: url }),

  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('api_token', token);
    } else {
      localStorage.removeItem('api_token');
    }
    set({ token });
  },

  checkConnectivity: async () => {
    try {
      const baseUrl = useAPIStore.getState().baseUrl;
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
      });
      const isConnected = response.ok;
      set({ isConnected });
      return isConnected;
    } catch {
      set({ isConnected: false });
      return false;
    }
  },
}));
