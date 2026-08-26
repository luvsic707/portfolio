import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* 分类 —— 沿用你现在网站的筛选项。
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

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    /* --- 必填 --- */
    title: z.string(),
    year: z.string(),                    // '2021' 或 '2021–2022' 或 '2025-ongoing'
    categories: z.array(z.enum(CATEGORIES)).min(1),
    summary: z.string(),                 // 列表页显示的一句话

    /* --- 选填 --- */
    titleCn: z.string().optional(),
    cover: z.string().optional(),        // '/images/eden/cover.jpg'
    coverAlt: z.string().optional(),

    /* 作品页顶部那块等宽元信息，想写几行写几行 */
    meta: z.record(z.string()).optional(),

    /* 排序：数字越小越靠前；不写就按年份倒序 */
    order: z.number().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
