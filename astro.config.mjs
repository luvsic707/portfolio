import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* site 用来生成 canonical、sitemap 和分享卡片里的绝对图片地址。
   写死域名的话，在 vercel.app 上线期间分享出去的卡片
   会把图片指向 redthreadcreative.me —— 那上面还是旧的 Cargo 站，
   没有这些文件，于是预览图是坏的。所以跟着实际部署走：

     PUBLIC_SITE_URL                  手动指定，最高优先
     VERCEL_PROJECT_PRODUCTION_URL    Vercel 上稳定的生产域名
                                      （之后绑了自定义域名，这里会自动变成它）
     VERCEL_URL                       Vercel 单次部署的地址
     CF_PAGES_URL                     Cloudflare Pages 的部署地址
     最后才回落到正式域名，本地开发也走这条。
     两家的变量都认，是因为换托管商不该需要改代码。 */
const site =
  process.env.PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || process.env.CF_PAGES_URL
  || 'https://redthreadcreative.me';

export default defineConfig({
  site,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
