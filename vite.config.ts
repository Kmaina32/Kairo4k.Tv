
import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    // Allows the specific Render host to bypass the security check in Vite 6 preview mode
    allowedHosts: ['geniues-streamer.onrender.com'],
    // Ensure the preview server listens on all addresses for Render's routing
    host: true,
    // Use the port provided by Render's environment variable or fallback
    port: Number(process.env.PORT) || 4173,
  },
  server: {
    host: true,
  }
});
