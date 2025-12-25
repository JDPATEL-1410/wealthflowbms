
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Fallback: serve mock data if API server not running
          proxy.on('error', (err, req, res) => {
            console.warn('API proxy error - API server may not be running');
          });
        }
      }
    }
  }
});
