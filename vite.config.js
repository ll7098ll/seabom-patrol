import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Set by the Pages workflow; '/' also supports ordinary static hosting.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
});
