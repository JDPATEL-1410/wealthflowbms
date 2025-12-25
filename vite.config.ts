
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  plugins: [react(), vercel()],
  base: '/', // Standard for Vercel root domain deployment
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  vercel: {
    // Enable serverless functions in development
    rewrites: [
      {
        source: '/api/(.*)',
        destination: '/api/$1'
      }
    ]
  }
});
