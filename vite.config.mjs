import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        legacy: resolve(process.cwd(), 'index.html'),
        preview: resolve(process.cwd(), 'preview.html'),
      },
    },
  },
});
