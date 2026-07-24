import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FRONTEND_PORT = 9923;
const allowedHosts = ['70.36.107.109', 'localhost', '127.0.0.1', '.vozper.com', 'vozper.com'];

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
    // No proxy — running in frontend-only demo mode
  },
  preview: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
  },
});