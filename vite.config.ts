
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Standard for Vercel root domain deployment
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  // Fix: Removed 'server' block containing invalid 'historyApiFallback' property. 
  // Vite's development server handles SPA routing (History API fallback) automatically.
});
