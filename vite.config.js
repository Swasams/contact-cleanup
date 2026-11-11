import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative, so the build works on GitHub Pages
// under /your-repo-name/ without extra config.
export default defineConfig({
  base: './',
  plugins: [react()],
});
