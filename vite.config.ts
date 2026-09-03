import { defineConfig } from 'vite';

// Static site. No backend, no framework. Output goes to dist/ and can be
// dropped on any static host (Vercel / Netlify / Cloudflare Pages).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
