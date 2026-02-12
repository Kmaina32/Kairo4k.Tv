
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      util: 'util',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  preview: {
    // Allows the specific Render host to bypass the security check in Vite 6 preview mode
    allowedHosts: ['Kairo 4K-streamer.onrender.com'],
    // Ensure the preview server listens on all addresses for Render's routing
    host: true,
    // Use the port provided by Render's environment variable or fallback
    port: Number(process.env.PORT) || 4173,
  },
  server: {
    host: true,
  }
});
