import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const FRONTEND_PORT = 9923;
const API_PORT = process.env.API_PORT || 4100;
const allowedHosts = ['70.36.107.109', 'localhost', '127.0.0.1', '.vozper.com', 'vozper.com'];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
  },
});