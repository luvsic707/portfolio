import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* site 用来生成 canonical、sitemap 和分享卡片里的绝对图片地址。

   自定义域名接上之后，生产部署必须用正式域名 —— 再用 pages.dev 的话，
   同一份内容挂在两个地址上，搜索引擎会各自收录，
   分享卡片也会显示一个临时地址。所以正式域名的优先级要在
   Cloudflare / Vercel 给的部署地址之上。

   预览分支反过来：它该描述自己，不该冒充生产环境。

     PUBLIC_SITE_URL   手动覆盖，最高优先
     生产分支          正式域名
     预览部署          它自己那次部署的地址
     本地开发          正式域名（本地的 canonical 无所谓） */
const PRODUCTION = 'https://www.redthreadcreative.me';

const onProdBranch =
  process.env.CF_PAGES_BRANCH === 'main' ||
  process.env.VERCEL_ENV === 'production';

const previewUrl =
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  process.env.CF_PAGES_URL ||
  null;

const site =
  process.env.PUBLIC_SITE_URL
  || (onProdBranch ? PRODUCTION : null)
  || previewUrl
  || PRODUCTION;

export default defineConfig({
  site,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
