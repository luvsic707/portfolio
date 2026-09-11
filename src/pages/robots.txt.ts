import type { APIRoute } from 'astro';

/* robots.txt 里的 sitemap 地址必须和实际部署的域名一致。
   写死在 public/robots.txt 里的话，vercel.app 上线期间
   它会把爬虫指向旧 Cargo 站上一个不存在的 sitemap。 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${new URL('sitemap-index.xml', site)}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
