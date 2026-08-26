# 红线 RED LINE — 作品集网站

浅底打底（保护作品图）+ 终端细节（导航与元信息），首屏是一根用物理模拟的红线。

---

## 日常怎么用

**启动本地预览**（改完立刻能在浏览器里看到）：

```bash
cd ~/projects/portfolio && npm run dev
```

然后打开 http://localhost:4321 。停止预览：在终端按 `Ctrl + C`。

---

## 加一个新作品

### 1. 新建文件

在 `src/content/projects/` 里新建一个 `.md` 文件，文件名会变成网址。
比如 `moon-garden.md` → `redthreadcreative.me/work/moon-garden`。

文件名只用小写字母、数字和连字符，不要有空格和中文。

### 2. 顶部写这些信息

```markdown
---
title: Moon Garden
titleCn: 月园
year: '2026'
categories: ['Illustration', 'Tattoo']
featured: true
order: 1
summary: 列表页上显示的一句话简介。
cover: /images/moon-garden/cover.jpg
meta:
  date: 2026.01 – 2026.03
  dimension: 30cm × 40cm
  media: 水彩 · 金粉
---
```

| 字段 | 说明 |
|---|---|
| `title` | 必填。作品名 |
| `year` | 必填。引号要留着：`'2026'`、`'2021–2022'`、`'2025-ongoing'` |
| `categories` | 必填。从下面这七个里挑，可以多选 |
| `summary` | 必填。列表页显示的一句话 |
| `titleCn` | 选填。中文名 |
| `cover` | 选填。封面图。不写就显示占位框 |
| `meta` | 选填。作品页顶部那块等宽元信息，想写几行写几行，左边的名字随便取 |
| `featured` | 选填。写 `true` 会出现在首页的精选里 |
| `order` | 选填。数字越小越靠前 |
| `draft` | 选填。写 `true` 就先不发布，草稿写着不着急 |

**可选的分类**（要加新的，改 `src/content.config.ts` 里的 `CATEGORIES`）：

```
Brand · Illustration · Tattoo · Game · Graphic · AR/VR · Animation
```

### 3. 下面写正文

`---` 之后就是正文，直接写就行。几个格式：

```markdown
这是一段普通文字。空一行就是新的一段。

## A — SKETCHES

用 ## 开头是章节标题，渲染出来会变成终端风格（前面带红色 ▶）。
你现在网站上那套 A / B / C / D 结构就这样写。

### 小标题

用 ### 是小一级的标题。

*斜体* 和 **粗体** 这样写。

![图片说明](/images/moon-garden/01.jpg)

> 这样是引用，左边会有一道红线。

- 列表项一
- 列表项二
```

### 4. 放图片

图片丢进 `public/images/你的项目名/` 文件夹，在文中用 `/images/你的项目名/文件名.jpg` 引用。
详见 `public/images/README.txt`。

---

## 改站点其他地方

| 想改什么 | 改哪个文件 |
|---|---|
| 首页那三行大标题 | `src/pages/index.astro` |
| 关于页的文字、技能、工具、时间线 | `src/pages/info.astro` |
| 底部邮箱和社交链接 | `src/components/Footer.astro` |
| 导航栏 | `src/components/Nav.astro` |
| **颜色和字体**（全站统一在这里） | `src/styles/global.css` 最上面的 `:root` |
| 红线的物理参数（垂坠程度、牵引强度） | `src/scripts/red-thread.js` 最上面几行 |

配色现在是：暖纸 `#F1EEE7` / 墨 `#171614` / 朱砂 `#C7402B`。

---

## 发布上线

先构建：

```bash
npm run build
```

生成的静态文件在 `dist/` 里。部署到 Vercel 或 Netlify 都可以，两家对这种站都免费。

域名 `redthreadcreative.me` 目前指向 Cargo，切换要改 DNS——那一步会让旧站下线，等新站内容都填好了再动。

---

## 技术

- [Astro](https://astro.build) — 静态站生成，最终产出纯 HTML/CSS，访问很快
- 红线是原生 canvas 写的 Verlet 物理（约 4KB），没用 p5.js
- 字体：Space Grotesk（标题）/ Newsreader（长文衬线）/ IBM Plex Mono（界面）
