import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

// Relative base so the build works whether it's served from a domain root
// or a GitHub Pages project path (https://user.github.io/repo/).
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        wishes: resolve(root, 'wishes.html'),
      },
    },
  },
});
