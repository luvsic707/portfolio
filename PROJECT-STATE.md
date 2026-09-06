# 当前进度（给新对话快速接手用）

最后更新：2026-09-01

## 一句话

Astro 作品集，替换 Cargo 版 redthreadcreative.me。代码框架完成，内容填充中。
作者身份是 **Red Thread**（不是 Red Line）。

## 怎么跑

```bash
cd ~/projects/portfolio && npm run dev     # http://localhost:4321
python3 tools/import-images.py             # 从桌面「作品集图片」导入并自动排版
python3 tools/import-images.py <slug>      # 只做一个项目
npm run build                              # 构建检查
```

## 内容填充状态

| 项目 | 正文图 | 开屏 | 备注 |
|---|---:|---|---|
| eden-of-east | 106 | 12 张画廊 | 完成 |
| otaku-culture-dish | 80 | 12 张画廊 | A–F 六节，F 待放图 |
| love-borderline | 38 | 32 张画廊 | 画廊偏长（约 2 分钟一轮） |
| contours-hidden-pain | 24 | 5 张画廊 | 完成 |
| waiting-for-godot | 20 | 视频 | 完成 |
| nine-lives-intro | 19 | 视频 | 完成 |
| the-last-compact | 0 | — | **待填图** |
| tattoo-collection | 0 | — | **待填图** |
| nine-lives-game | 0 | — | **待填图** |

## 待办

- 三个项目的图还没填（见上表）
- 页脚邮箱 / Instagram / Behance 仍是占位（`src/components/Footer.astro`）
- 还没部署。下一步：GitHub 已推 → 连 Vercel 拿临时地址 → 最后切 DNS
- 域名 `redthreadcreative.me` 在 Cargo，**DNS 可以自己改**（已确认），
  2026-11-14 到期，$25/年

## 已知待议

- Otaku 九个子小节现在是四列小图（曾是两列大图），作者未最终确认
- 排版细节作者说还要调，尚未给出具体清单

## 重要经验（踩过的坑）

**抓原站内容不要用浏览器滚动。** Cargo 虚拟化从头到尾只往 DOM 塞 3 页，
怎么滚都抓不全。正确做法：`curl https://redthreadcreative.me/<purl>` 拿 HTML，
解析 `window.__PRELOADED_STATE__` 里的 `pages.byId`。

项目 purl：`eden-of-east` / `otaku` / `godot-1` / `bpd` / `spine` /
`nine-tails-anime` / `nine-tails-game` / `the-last-compact` / `tattoo`
（`for-u` 和 `nuo2` 是重复副本，忽略）。

**图片引用必须先有文件。** Astro 会校验每条相对路径，引用不存在的图会让构建失败。

**视频必须压缩。** 原始素材里有 394MB 的 MOV，超过 GitHub 100MB 单文件硬限制。
脚本用 ffmpeg 压到网页规格（H.264 / CRF 24 / +faststart）。

**带声音的视频不能自动播放**，这是浏览器规范。开屏画廊的做法是静音自动播放
＋ SOUND 开关。

其余见 `README.md`（内容编辑手册）和 `DEPLOY.md`（上线手册）。
