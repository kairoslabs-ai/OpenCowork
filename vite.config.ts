import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          // Vendor chunks
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          zustand: ['zustand'],
          
          // Feature chunks
          workspace: [
            'src/components/workspace/WorkspaceLayout.tsx',
            'src/components/workspace/ChatPanel.tsx',
            'src/components/workspace/PreviewPanel.tsx',
            'src/components/workspace/ProgressSidebar.tsx',
          ],
          common: [
            'src/components/common/Button.tsx',
            'src/components/common/Input.tsx',
            'src/components/common/Modal.tsx',
            'src/components/common/ErrorBoundary.tsx',
            'src/components/common/ConfirmationDialog.tsx',
          ],
          hooks: [
            'src/hooks/useTask.ts',
            'src/hooks/useWebSocket.ts',
            'src/hooks/useTaskConfirmation.ts',
          ],
          services: [
            'src/services/api.ts',
            'src/services/websocket.ts',
          ],
        },
      },
    },
    // Minify and optimize
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // Target modern browsers
    target: 'ES2020',
    // Inline small assets
    assetsInlineLimit: 4096,
  },
  // Performance optimizations
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
