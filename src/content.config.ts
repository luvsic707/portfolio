import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* 分类 —— 沿用你原来网站的筛选项。
   要加新分类，在这里加一行，全站的筛选器会自动出现。 */
export const CATEGORIES = [
  'Brand',
  'Illustration',
  'Tattoo',
  'Game',
  'Graphic',
  'AR/VR',
  'Animation',
] as const;

export type Category = (typeof CATEGORIES)[number];

const projects = defineCollection({
  /* 每个项目是一个文件夹：projects/<slug>/index.md，图片和文案放在一起。
     下划线开头的文件夹会被跳过，所以 _template 不会被当成真的作品。 */
  loader: glob({
    pattern: ['**/index.md', '!_*/**'],
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),

  /* image() 让封面走 Astro 的图片优化：自动多档尺寸 + WebP/AVIF + 宽高注入 */
  schema: ({ image }) =>
    z.object({
      /* --- 必填 --- */
      title: z.string(),
      year: z.string(),                    // '2021' / '2021–2022' / '2025-ongoing'
      categories: z.array(z.enum(CATEGORIES)).min(1),
      summary: z.string(),                 // 列表页显示的一句话

      /* --- 选填 --- */
      cover: image().optional(),           // 写 './cover.jpg'，相对于本文件夹
      coverAlt: z.string().optional(),

      /* 作品页顶部那块等宽元信息，想写几行写几行，左边的名字随便取 */
      meta: z.record(z.string()).optional(),

      /* 排序：数字越小越靠前；不写就排到最后，同序按年份倒序 */
      order: z.number().optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects };
