# 红线 RED LINE — 作品集网站

浅底打底（保护作品图）+ 终端细节（导航与元信息），首屏是一根用物理模拟的红线。

---

## 目录结构

一句话：**一个项目 = 一个文件夹，文案和图片放在一起。**

```
src/
  content/projects/
    _template/          ← 新项目模板，复制它来开新项目（下划线开头＝不会被发布）
      index.md
    eden-of-east/
      index.md          ← 文案
      cover.jpg         ← 封面
      01.jpg  02.jpg    ← 内文插图
    ...

  pages/                ← 页面：首页 / 作品列表 / 作品详情 / 关于 / 404
  components/           ← 导航、页脚、作品卡片
  layouts/Base.astro    ← 所有页面共用的外壳（<head>、meta、字体）
  styles/global.css     ← 颜色和字体都在这里的 :root
  scripts/red-thread.js ← 首屏那根红线
```

图片放在项目文件夹里（不是 `public/`）是有意的：这样 Astro 会自动生成多档尺寸、
转成 WebP、并写好宽高属性。原图丢进去就行，不用自己压缩。

---

## 日常怎么用

启动本地预览，改完立刻能在浏览器里看到：

```bash
cd ~/projects/portfolio && npm run dev
```

打开 http://localhost:4321 。停止预览在终端按 `Ctrl + C`。

> 如果改了 `src/content.config.ts` 或者新建/改名了项目文件夹，
> 预览可能不会自动更新，`Ctrl + C` 之后重新 `npm run dev` 一次就好。

---

## 加一个新作品

### 1. 复制模板

把 `src/content/projects/_template/` 整个文件夹复制一份，改名成你的项目名。

文件夹名就是网址：`moon-garden/` → `redthreadcreative.me/work/moon-garden`
只用小写字母、数字、连字符，不要空格和中文。

### 2. 图片丢进这个文件夹

和 `index.md` 放在一起就行。名字随便取，`cover.jpg`、`01.jpg` 这样最省事。

### 3. 改 index.md 顶部的信息

```yaml
---
title: Moon Garden
year: '2026'
categories: ['Illustration', 'Tattoo']
summary: One sentence that shows up on the work list.
cover: ./cover.jpg
featured: true
order: 1
draft: true
meta:
  date: 2026.01 – 2026.03
  dimension: 30cm × 40cm
  media: watercolour · gold dust
---
```

| 字段 | 必填 | 说明 |
|---|:---:|---|
| `title` | ● | 作品名 |
| `year` | ● | 引号要留着：`'2026'`、`'2021–2022'`、`'2025-ongoing'` |
| `categories` | ● | 从下面七个里挑，可多选 |
| `summary` | ● | 列表页显示的一句话 |
| `cover` | | 封面。写 `./文件名`。不写就显示占位框 |
| `coverAlt` | | 给读屏软件的图片描述 |
| `meta` | | 作品页顶部那块等宽元信息，左边名字随便取，想写几行写几行 |
| `featured` | | `true` = 出现在首页精选 |
| `order` | | 数字越小越靠前 |
| `draft` | | `true` = 先不发布。**写完记得删掉这行** |

可选分类（要加新的，改 `src/content.config.ts` 里的 `CATEGORIES`，
筛选器会自动多出一个）：

```
Brand · Illustration · Tattoo · Game · Graphic · AR/VR · Animation
```

### 4. 写正文

`---` 之后就是正文。你原来那套 A / B / C / D 的过程结构模板里已经搭好了。

---

## 正文排版速查

**注意：所有 `<div>` 标签和图片之间都要空一行，否则不生效。**

一张图

```markdown
![说明文字](./01.jpg)
```

两列 / 三列网格

```markdown
<div class="grid-2">

![图一](./01.jpg)

![图二](./02.jpg)

</div>
```

`grid-3` 就是三列，手机上自动变两列。

通栏大图（铺满整个屏幕宽度）

```markdown
<div class="full">

![主视觉](./hero.jpg)

</div>
```

带图注

```markdown
<figure>

![说明](./01.jpg)

<figcaption>图注文字</figcaption>
</figure>
```

其他

| 写法 | 效果 |
|---|---|
| `## 标题` | 终端风格章节标题，前面自动带红色 ▶ |
| `### 小标题` | 小一级 |
| `*斜体*` `**粗体**` | 斜体、粗体 |
| `> 引用` | 左边有一道红线 |
| `- 列表项` | 前面是红色破折号 |
| `---` | 分隔线 |

---

## 改站点其他地方

| 想改什么 | 改哪个文件 |
|---|---|
| 首页那三行大标题 | `src/pages/index.astro` |
| 关于页的文字、技能、工具、时间线 | `src/pages/info.astro` |
| 底部邮箱和社交链接 | `src/components/Footer.astro` |
| 导航栏 | `src/components/Nav.astro` |
| **颜色和字体**（全站统一） | `src/styles/global.css` 顶部的 `:root` |
| 红线的物理参数 | `src/scripts/red-thread.js` 顶部几行 |
| 域名（换域名时改这一处） | `astro.config.mjs` 的 `site` |

当前配色：暖纸 `#F1EEE7` / 墨 `#171614` / 朱砂 `#C7402B`

---

## 发布上线

```bash
npm run build
```

产出在 `dist/`，是纯静态文件。部署到 Vercel 或 Netlify 都免费。

域名 `redthreadcreative.me` 目前指向 Cargo。切换要改 DNS，那一步会让旧站立刻下线，
建议等内容填得差不多了再动，中间可以先发一个临时地址自己看。

---

## 技术说明

- **Astro** — 静态站生成，产出纯 HTML/CSS，没有前端框架的运行时开销
- **图片** — 走 Astro 内置优化：自动多档尺寸 + WebP + 宽高属性（防止加载时布局跳动）
- **红线** — 原生 canvas 写的 Verlet 物理，约 4KB，没用 p5.js。
  含一层弯曲约束，否则绳子被压缩时会折成锯齿
- **字体** — Space Grotesk（标题）/ Newsreader（长文衬线）/ IBM Plex Mono（界面）
- 已配 sitemap、robots.txt、canonical、Open Graph（分享时用封面图做预览）
