import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://redthreadcreative.me',
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
