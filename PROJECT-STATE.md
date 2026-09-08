# 当前进度（给新对话快速接手用）

最后更新：2026-09-07

## 一句话

Astro 作品集，替换 Cargo 版 redthreadcreative.me。
作者身份 **Red Thread**（不是 Red Line）。视觉概念是 **RED THREAD REHAB —— 红线的视觉急救室**：
冷峻克制、带一点荒谬，参照医学档案与刑侦卷宗。

## 怎么跑

```bash
cd ~/projects/portfolio && npm run dev -- --host 0.0.0.0   # 手机同 Wi-Fi 可看
python3 tools/import-images.py             # 从桌面「作品集图片」导入并自动排版
python3 tools/import-images.py <slug>      # 只做一个项目
npm run build                              # 构建检查
```

## 内容填充状态

最后核对：2026-09-08

| 项目 | 正文图 | 视频 | 开屏 | 卡片封面 | 备注 |
|---|---:|---:|---:|:--:|---|
| eden-of-east | 106 | 0 | 12 | ✓ | 完成 |
| love-borderline | 92 | 0 | 32 | ✓ | 完成，**开屏偏长，待议** |
| otaku-culture-dish | 80 | 0 | 12 | ✓ | F — DETAIL 待放图 |
| waiting-for-godot | 19 | 2 | 1 | ✓ | 完成 |
| contours-hidden-pain | 18 | 3 | 1 | ✓ | 完成 |
| tattoo-collection | 18 | 3 | 0 | ✓ | 封面是正文首图兜底，**作者要自己挑** |
| nine-lives-intro | 17 | 4 | 1 | ✓ | 完成 |
| the-last-compact | 0 | 0 | 0 | ✗ | **待填图** |
| nine-lives-game | 0 | 0 | 0 | ✗ | **待填图** |

封面规则：`00 封面` 里第一张图 → 卡片封面；只有视频就抽第 1 秒的帧
（`hero-poster.jpg`）；整个空着就用正文第一张兜底。所以卡片永远不会空。

## 待办 / 待议（作者说「最后一起调整」）

- **BPD 开屏 32 张，一轮 112 秒太长**。三个选项：砍到 8–10 张精选 / 加快到 2 秒一张 /
  保持不动。作者要等内容都齐了再定。
- **作者要自己挑各项目的封面**（放进 `00 封面`，文件名前加 `01_` `02_` 控顺序）。
  当前 tattoo 用的是兜底图，其他项目是作者早先放的。
- Otaku `F — DETAIL` 只有文案没有图
- `the-last-compact` / `nine-lives-game` 两个项目一张图都没有（章节文件夹已建好）
- 首页文案还是 "I'm Red Thread. I design, paint, tattoo, and make games."，
  跟「急救室」设定脱节。**作者说另有思路，等他给。不要代写。**
- 页脚 Behance 链接注释掉了（原来指向 `#`），等作者给真实地址
- 还没部署。下一步：连 Vercel 拿临时地址 → 最后切 DNS
- 域名 `redthreadcreative.me` 在 Cargo，DNS 可自己改，2026-11-14 到期，$25/年

## 排版系统（规则驱动，别手写版式）

章节文件夹名 → 自动决定版式，规则在 `tools/import-images.py` 的 `layout_for()`：

```
成品章节（名字含 FINAL/OUTPUT/OUTCOME/STILL/PRINT/POSTER/IMPLEMENTATION/
          ON SKIN/HEALED/FRESH/RECENT/PLATE/PIECES）
    1 张      → full      通栏
    2–16 张   → showcase  满宽两栏大图（最大权重）
    17+ 张    → flow      满宽三栏瀑布流

过程章节
    1 张      → full
    2–4 张    → grid-2 / grid-3
    5–12 张   → flow      三栏瀑布流，408px
    13+ 张    → strip     横向接触表，等宽分栏摞满，左右滑

子小节（###）  密排小图：grid-2/3/4，超过 6 张走 strip
```

- **图一律保留原始比例**，从不裁切
- **图和视频按文件名统一排序混在同一块里**，不再分两段
- 混排的视频：静音循环、进视野才播、点一下开声音；独占一格的给控件
- `_` 开头的素材文件夹自动跳过（弃用素材原地封存，不用删）

## 重要经验（踩过的坑）

**抓原站内容不要用浏览器滚动。** Cargo 虚拟化从头到尾只往 DOM 塞 3 页。
正确做法：`curl https://redthreadcreative.me/<purl>` 拿 HTML，解析
`window.__PRELOADED_STATE__` 里的 `pages.byId`。
purl：`eden-of-east` / `otaku` / `godot-1` / `bpd` / `spine` /
`nine-tails-anime` / `nine-tails-game` / `the-last-compact` / `tattoo`。

**图片引用必须先有文件**，Astro 会校验每条相对路径，引用不存在的图会让构建失败。

**视频必须压缩**，GitHub 单文件硬限 100MB。脚本用 ffmpeg 压到 H.264/CRF 24/+faststart。

**带声音的视频不能自动播放**，浏览器规范。开屏是静音自播 + SOUND 开关。

**后台标签页里 `innerHeight` 是 0。** 横向接触表按视口高度算栏宽，
不加下限会整条塌成 0 高。已修，但以后写任何依赖视口尺寸的布局都要记得这条。

**`p:has(img)` 要单独放开 max-width。** 正文段落限了 56ch，
而 Markdown 的图片也包在 `<p>` 里，不放开的话所有大图会被字宽截断。

**`scrollIntoView` 会连整页一起滚。** 章节索引高亮别用它，只滚索引条自己的 scrollLeft。

**假的档案数据会穿帮。** 页脚那些「9 CASES ON FILE / REV. 日期」都是从内容集合和
构建时间真算出来的。荒谬感来自「真实数据 + 过度正式的格式」，编数据四秒内就露馅。

## 设计 token

`src/styles/global.css` 是唯一改配色和字体的地方。
惨白 `#F7F8F7` / 冷近黑 `#101314` / 发丝灰 `#D6DAD9` / 冷血红 `#C8102E`。
字体 **Archivo**（可变，宽度轴用来压窄做表单标签）+ **Fragment Mono**（等宽版 Helvetica，
只给编号、计数、时间戳这类机器数据）。**全站无衬线** —— 档案里没有衬线体。
`--ink-faint` 不能再压浅，9px 小字用更浅的灰过不了 WCAG AA。

其余见 `README.md`（内容编辑手册）和 `DEPLOY.md`（上线手册）。
