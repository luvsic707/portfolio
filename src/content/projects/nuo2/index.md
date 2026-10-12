---
title: NUO2 糯氧米酒
year: '2025–2026'
categories: ['Brand', 'Graphic', 'Illustration']
featured: false
order: 6
status: STAGE 1
summary: A full visual identity for a Guizhou rice wine — logotype, a shape system drawn from the grain, seven flavour illustrations, and the labels that went to print.

meta:
  date: 2025.01 – 2026.01
  dimension: 250ml · 7 flavours
  media: Visual Identity, Packaging, Illustration, Apparel
  client: Nuo-O₂ Rice Wine · Guiyang

ground: paper
surface: merge

gallery:
  - image: ./hero-01.jpg        # 全家福 —— 七个口味一张讲完
    alt: NUO2 — the range

cover: ./card.jpg
draft: false
---

## A — IDENTITY

<!-- auto:skip 手排版面，导入脚本不要动这里

     开场抄 CAFE LUMI：一屏渐变色域，上面只有一行拉开字距的字标。
     那个案例的橙转绿和这个牌子的糯氧橙转淡蓝绿几乎是同一组颜色，
     所以这一招在这儿是现成的，不是硬套。

     渐变不能靠 box-shadow 往外铺（阴影只认纯色），.field 的伪元素
     是绝对定位横向超出视口的，所以渐变照样能顶到边。 -->

<div class="field" style="--field: linear-gradient(104deg, #F47821 0%, #F9A45C 42%, #90D2C3 100%)">

<div class="wordmark">糯氧米酒<em>Nuo-O₂ · Rice Wine · Guizhou</em></div>

</div>

Four characters rebuilt as one geometric block, compact enough to read at 8mm
on a bottle neck and soft enough to still feel hand-made.

<!-- 标志、符号、组合全部收进板岩灰的色域里。
     两个好处同时发生：橙色压在深色上最亮，而窄槽位让 1500px 的符号
     和 1900px 的组合不再被放大 —— 之前它们在通栏里是 0.55 和 0.70 倍。 -->

<!-- 三件东西的比例差太远（0.96 / 2.28 / 1.17），所以一个一行，
     各按自己的形状取宽：方的给方块，宽扁的给宽带，组合给中段。
     并排试过，符号下面空掉两百多像素 —— 量出来是 567x249 对 567x484。 -->

<!-- 底色用奶油，不用板岩灰。
     这个牌子自己的底就是奶油纸 —— 标签、海报、杯套全部是橙字印在上面。
     板岩灰在她的色彩系统里是文字色，我把它当整屏底色用错了：
     那个带蓝绿的灰和橙色互相发浑，而且 LUMI 那套参考几乎没有深色，
     它是大量白加几个彩色时刻。 -->

<div class="field" style="--field: #FFE7C2; --field-ink: #2F3F47">

<div class="chip" style="--w: 26rem">

![Logotype](./a-logotype.png)

</div>

<div class="chip" style="--w: 44rem">

![The NUO2 graphic mark](./a-mark.png)

</div>

<div class="chip" style="--w: 34rem">

![Three approved lockups](./a-lockups.png)

</div>

</div>

## B — SYSTEM

The mark breaks into eight modules that carry the brand without it: on a bag, a
cup sleeve, a wall.

<!-- auto:skip -->

<div class="card">

![Auxiliary shape system — eight modules](./b-shapes.png)

</div>

<!-- 淀粉水解成葡萄糖 —— 这坛酒的化学反应，印在标签上。
     排成活字而不是放一张 353×31 的截图：下标是真下标，任意尺寸都锐利。 -->
<div class="formula">

(C<sub>6</sub>H<sub>10</sub>O<sub>5</sub>)<sub>n</sub> + nH<sub>2</sub>O → nC<sub>6</sub>H<sub>12</sub>O<sub>6</sub>

<small>Starch to glucose — the reaction that makes the wine, printed on the label.</small>

</div>

<!-- 色卡：四条满宽色带，hex 压在带子里。
     原来是一张 .dg 表格 —— 诚实，但那是整页最没被设计过的东西，
     而色彩本来该是品牌案例里最好看的一页。 -->

<div class="bands">

<div class="swatch" style="--c: #F47821">
<b>Nuo Orange</b>
<span>#F47821 · the brand colour, carries every application</span>
</div>

<div class="swatch" style="--c: #FFE7C2; --on: #2F3F47">
<b>Cream</b>
<span>#FFE7C2 · glutinous rice itself, where the warmth comes from</span>
</div>

<div class="swatch" style="--c: #90D2C3; --on: #2F3F47">
<b>Mint</b>
<span>#90D2C3 · a cold edge, so the orange reads as appetite and not as heat</span>
</div>

<div class="swatch" style="--c: #2F3F47">
<b>Slate</b>
<span>#2F3F47 · the steady base, keeps the palette from going soft</span>
</div>

</div>

## C — ILLUSTRATION

Seven flavours, one system. The illustrations are generated, then brought into
line — same collage language, same palette, same bottle-silhouette crop, every
output composited and colour-matched until the seven read as one series instead
of seven pictures. The direction is the work.

<!-- auto:skip

     七张是奇数，4+3 排。rows-4 装七张会在右下留一个洞，读起来像没排完；
     拆成 rows-4 + rows-3，第二行三张各占三分之一、比上面一行略大，
     看着是有意为之，而且没有空位。

     这一节不上色域：整页的彩色时刻要稀缺才有力。
     A 栏奶油、色卡本身、E 栏薄荷，三处够了 —— 再加一块，
     整页就从「大量白加几个彩色瞬间」变成「一块块颜色」。 -->

<div class="rows-4">

![Original](./c-original.jpg)

![Osmanthus](./c-osmanthus.jpg)

![Green plum](./c-green-plum.jpg)

![Passion fruit](./c-passion-fruit.jpg)

</div>

<div class="rows-3">

![Jasmine](./c-jasmine.jpg)

![Rose](./c-rose.jpg)

![Sea salt pomelo](./c-sea-salt-pomelo.jpg)

</div>

## D — PACKAGING

<!-- auto:skip

     这张是 CAFE LUMI 那套案例里最有力的版面，照搬过来：
     竖构图、字标拆成上下两行框住产品、产品背后一圈它自己颜色的柔光。

     能照搬是因为素材对得上 —— 标签是瓶形剪影的透明 PNG，
     而「糯氧米酒」本来就是品牌名拆在描述词两边，天然分得开。
     光给的是青梅自己的淡绿，不是品牌橙：这一张讲的是这个口味。 -->

<div class="poster" style="--glow: rgba(144, 210, 195, 0.8); --subject: 19rem">

<div class="poster-line">糯 氧 米 酒</div>

![Green plum, front](./d-front-green-plum.png)

<div class="poster-sub">青 梅 · Green Plum · 250ml</div>

</div>

The front of each bottle. Same grid, same type position, different weather.

<!-- auto:skip

     和 C 节同一个 4+3 栅格，故意的 —— 上一节七张插画，这一节七张标签，
     同样的格子排下来，读的人自己会看出「那张画变成了这个标」。

     标签是透明底的 PNG，落在纸上不用裱边。 -->

<div class="rows-4">

![Original, front](./d-front-original.png)

![Osmanthus, front](./d-front-osmanthus.png)

![Green plum, front](./d-front-green-plum.png)

![Passion fruit, front](./d-front-passion-fruit.png)

</div>

<div class="rows-3">

![Jasmine, front](./d-front-jasmine.png)

![Rose, front](./d-front-rose.png)

![Sea salt pomelo, front](./d-front-sea-salt-pomelo.png)

</div>

<!-- 一张完整刀版（正面 + 法规背面）作为「真做到了印刷」的证据。
     只放一张就够 —— 七张背面是重复的法规文字，没有看头。 -->
<div class="bleed">

![Full dieline — front and regulatory back](./d-dieline.jpg)

</div>

## E — IN USE

Staff tee, poster, takeaway bag, cup sleeve. The shape system does the work;
the logotype only has to appear once.

<!-- auto:skip

     这一节对求职权重最高：它证明这套东西离开了屏幕。

     外卖袋是唯一的真实环境照（4000×6000，厨房台面），给它整条出血。
     其余四张是白底产品图 —— 压在纸上读起来是「没做完」，压在色域上
     就成了有意为之，而且主体放进更窄的槽位之后反倒更锐。
     每张都补成 16:9 的白卡，一点没裁。

     底色用薄荷不用板岩灰：白卡要和底分得开，而薄荷是这套色里
     唯一既够浅又不是白的那一个 —— 和橙色也是品牌自己的对比关系。 -->

<div class="bleed">

![Takeaway bag on a kitchen counter](./e-bag.jpg)

</div>

<div class="field" style="--field: #90D2C3; --field-ink: #2F3F47">

<div class="card">

![A poster held up, actual size](./e-poster-held.jpg)

</div>

<div class="card">

![Two posters, flat and pasted](./e-poster.jpg)

</div>

<div class="cards2">

![Staff tee, front](./e-tee.jpg)

![Staff tee, back](./e-tee-back.jpg)

</div>

<div class="card">

![Cup sleeve — the bilingual tagline lockup](./e-cup-sleeve.jpg)

</div>

</div>
