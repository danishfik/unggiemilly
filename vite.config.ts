import { defineConfig } from 'vite';

// Relative base so the build works whether it's served from a domain root
// or a GitHub Pages project path (https://user.github.io/repo/).
export default defineConfig({
  base: './',
});
