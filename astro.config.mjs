// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://doitswift.com',
  /** Align with sitemap, canonicals, and Cloudflare Pages directory URLs (always `/path/`). */
  trailingSlash: 'always',
  integrations: [sitemap()],
});
