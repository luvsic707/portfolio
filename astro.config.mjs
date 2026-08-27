import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// site 用于生成 sitemap 和分享用的绝对图片地址。
// 换域名时改这一处就够了。
export default defineConfig({
  site: 'https://redthreadcreative.me',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
