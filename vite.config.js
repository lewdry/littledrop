import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' assert { type: 'json' };

// Use BASE_PATH from environment when provided. Otherwise, for production
// builds default to the repo name (e.g. '/littledrop/') so GitHub Pages
// serves assets from the correct subpath. During development the base is '/'.
const basePath = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? `/${pkg.name}/` : '/');

export default defineConfig({
  base: basePath,
  plugins: [svelte()]
});
