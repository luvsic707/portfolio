---
# ============================================================
# 新项目模板
#
# 用法：把整个 _template 文件夹复制一份，改名成你的项目名
#      （小写、用连字符，比如 moon-garden）。
#      文件夹名就是网址：redthreadcreative.me/work/moon-garden
#
# 图片直接丢进这个文件夹，和 index.md 放一起。
# ============================================================

# --- 必填 ---
title: Project Title
year: '2026'                          # 引号别删。'2026' / '2021–2022' / '2025-ongoing'
categories: ['Illustration']          # Brand / Illustration / Tattoo / Game / Graphic / AR/VR / Animation
summary: One sentence that shows up on the work list. Keep it concrete.

# --- 选填 ---
# cover: ./cover.png                  # 封面。放好图后去掉行首的 #
# coverAlt: Describe the image for screen readers

featured: false                       # true = 出现在首页精选
order: 10                             # 数字越小越靠前
draft: true                           # 写完了、图也放好了，就删掉这一行

# 作品页顶部那块等宽元信息。左边的名字随便取，想写几行写几行。
meta:
  date: 2026.01 – 2026.03
  dimension: 30cm × 40cm
  media: watercolour · gold dust
  tools: Procreate · Photoshop
---

开头这段不用标题，直接写。这是项目的引子——你为什么做这个，从哪儿来的。
你原来那套 A/B/C/D 的过程结构很好，下面已经搭好了，按需要增减。

## A — SKETCHES

调研、对话、参考。这一步你做了什么，发现了什么。

![Early sketches](./01.png)

## B — MATERIAL EXPERIMENT

材料和技法。你试了什么，为什么选它。

<div class="grid-2">

![Salt scattering test](./02.png)

![Foam texture test](./03.png)

</div>

## C — PHOTOGRAPHY

素材来源、实地记录。

<figure>

![Inner Mongolia, 2021](./04.png)

<figcaption>Inner Mongolia, 2021</figcaption>
</figure>

## D — FINAL OUTPUT

成品，以及技术上怎么做到的。

<div class="full">

![Final piece](./05.png)

</div>


<!--
============================================================
排版速查
============================================================

一张图（占正文宽度）
    ![说明文字](./01.png)

两列 / 三列网格
    <div class="grid-2">          ← 或 grid-3

    ![图一](./01.png)

    ![图二](./02.png)

    </div>

    注意：每张图前后都要空一行，div 标签和图之间也要空行，否则不生效。

通栏大图（铺满整个屏幕宽度）
    <div class="full">

    ![主视觉](./hero.png)

    </div>

带图注
    <figure>

    ![说明](./01.png)

    <figcaption>图注文字</figcaption>
    </figure>

其他
    ## 标题        → 终端风格的章节标题（前面自动带红色 ▶）
    ### 小标题      → 小一级
    *斜体*  **粗体**
    > 引用          → 左边有一道红线
    - 列表项        → 前面是红色破折号
    ---            → 分隔线
============================================================
-->
