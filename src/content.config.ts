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
      cover: image().optional(),           // 作品列表上的缩略图。不写就自动用画廊第一张
      coverAlt: z.string().optional(),

      /* 作品页顶部的全屏画廊：可左右滑，闲置时自动播放。
         图片和视频混着放都行，数组顺序就是播放顺序。
         由 tools/import-images.py 自动生成，一般不用手写。 */
      gallery: z
        .array(
          z.object({
            image: image().optional(),     // './hero-01.jpg'
            video: z.string().optional(),  // '/media/<slug>/demo.mp4'，放在 public 里
            poster: image().optional(),    // 视频的占位图
            alt: z.string().optional(),
          })
        )
        .optional(),

      /* 作品页顶部那块等宽元信息，想写几行写几行，左边的名字随便取 */
      meta: z.record(z.string()).optional(),

      /* 进行中的项目在页眉横栏标一个状态。
         卷宗本来就有状态字段 —— 与其假装做完了，不如明写。 */
      status: z.string().optional(),        // 'ONGOING' / 'PROTOTYPE' / 'ARCHIVED'

      /* 开屏图怎么放进画面。
         默认 cover：铺满，画面里全是作品，代价是竖图被裁掉上下。
         改成 contain：整张完整呈现，留白填纯白 —— 画作本身就是拍在白底上的
         时候用这个，白边和画心连成一片，看不出边界，而且一寸不裁。 */
      heroFit: z.enum(['cover', 'contain']).optional(),

      /* ---- 图和纸的关系 ----
         plate（默认）：每张图裱一圈白衬边加投影，像标本卡贴在纸上。
         照片需要这个 —— 没有它，一张深色照片的边缘会直接糊进纸里。

         merge：不裱、不投影，图直接落在纸上。整页于是没有一个方框，
         图和图之间只剩间距，连成一件东西而不是一叠卡片。
         白底的画配上 cutout（multiply），白直接落成纸色 —— 画就真的
         摊在这张纸上，而不是"一张画的照片"。 */
      surface: z.enum(['plate', 'merge']).optional(),

      /* ---- 这一页的纸是什么白 ----
         paper（默认）：全站统一的 #F7F8F7 暖白，带一层极细的纸纹。
         照片和实物照要这个 —— 纯白会把照片的高光顶掉。

         white：纯白 #FFF，不带纸纹。给那些本来就画在白纸上、
         靠 cutout 的 multiply 融进底面的项目 —— 底越白，白落得越干净，
         multiply 之后画和纸严丝合缝。Otaku 那九排墨符就是这种。

         只改 .sheet 的背景，不覆盖 --paper 变量 —— 那个变量在深色带里
         是当**文字颜色**用的，覆盖了字会跟着变白。 */
      ground: z.enum(['paper', 'white']).optional(),

      /* 正文背后那层极淡的作品幽灵。用这件作品自己的一张图，左右镜像、
         压到几个百分点的浓度、极慢地浮动。

         背景不是另外画的花纹 —— 花纹和作品没关系，加多少都是零。
         这里放的就是作品本身，所以整页的底和整页的图说的是同一件事。 */
      underlay: image().optional(),

      /* 外部链接：源码仓库、在线 demo、设计文档之类。
         渲染在检验表下面，新标签页打开。
         只放公开可访问的地址 —— 私有链接点进去是登录墙，比不放更糟。 */
      links: z
        .array(
          z.object({
            label: z.string(),             // 'Source code' / 'Play demo'
            href: z.string().url(),
          })
        )
        .optional(),

      /* 排序：数字越小越靠前；不写就排到最后，同序按年份倒序 */
      order: z.number().optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects };
