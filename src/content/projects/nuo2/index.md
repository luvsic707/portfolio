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
  # 首图换成外卖袋的真实照片（4000x6000 原图裁 1.40 横幅）。
  # 原来放的是 928x1232 的主插画铺满 1280 通栏 —— 2.76 倍放大，
  # 整页第一眼就是糊的；而 alt 写的是 the range（七瓶全家福），对不上。
  # 全套素材里只有这张是真照片，也是整个项目最强的一张。
  - image: ./hero-01.jpg
    alt: The takeaway bag on a kitchen counter

cover: ./card.jpg
draft: false
---

## A — IDENTITY

<!-- auto:skip 手排版面，导入脚本不要动这里

     开场抄 CAFE LUMI：一屏渐变色域，上面只有一行拉开字距的字标。
     那个案例的橙转绿和这个牌子的糯氧橙转淡蓝绿几乎是同一组颜色，
     所以这一招在这儿是现成的，不是硬套。

     渐变不能靠 box-shadow 往外铺（阴影只认纯色），.field 的伪元素
     是绝对定位横向超出视口的，所以渐变照样能顶到边。

     加 tall：只给一行字标的 .field 量出来只有 191px 高，那是一条
     装饰线，不是开场。tall 给它 min(72vh, 40rem)，字标浮在正中。 -->

<div class="field tall" style="--field: linear-gradient(104deg, #F47821 0%, #F9A45C 42%, #90D2C3 100%)">

<div class="wordmark">糯氧米酒<em>Nuo-O₂ · Rice Wine · Guizhou</em></div>

</div>

Four characters rebuilt as one geometric block, compact enough to read at 8mm
on a bottle neck and soft enough to still feel hand-made.

<!-- 底色用奶油，不用板岩灰。
     这个牌子自己的底就是奶油纸 —— 标签、海报、杯套全部是橙字印在上面。
     板岩灰在她的色彩系统里是文字色，我把它当整屏底色用错了：
     那个带蓝绿的灰和橙色互相发浑，而且 LUMI 那套参考几乎没有深色，
     它是大量白加几个彩色时刻。
     三张都是透明底（透明 43% / 9% / 38%），所以直接浮在奶油上，不要裱边。 -->

<!-- 宽度给百分比，不给 rem。
     之前是 26rem / 44rem / 34rem —— 在 820px 的窗口里量出来是
     416 / 704 / 544，而色域只有 739 宽，符号左右各剩 18px，
     读起来就是挤爆了；反过来在宽屏上这三个定值又全都偏小。
     百分比让这组关系在任何宽度下都不变。

     符号给 64%，字标给 32%，正好是一半 —— 两个数字之间有关系，
     不是各自挑好看的。不按等高对齐：符号的墨占到画面 90%，
     字标只有 56%，等高排的话符号会把字标压死。
     现在字标 246 高、符号 207 高，轻的那个高一点，才读得一样重。 -->

<div class="field" style="--field: #FFE7C2; --field-ink: #2F3F47">

<div class="chip" style="--w: 32%">

![Logotype](./a-logotype.png)

</div>

<div class="chip" style="--w: 64%">

![The NUO2 graphic mark](./a-mark.png)

</div>

</div>

Three approved lockups, and the only three. Everything else on the bottle, the
bag and the cup sleeve is built from these.

<!-- 组合图从色域里搬出来了。
     它和上面两张不是同一类东西：那两张是单件标志，这张是一整页规范，
     本身就有三行内容。和单件并排只会让三行里的每一行都变小。
     放在纸上单独一行，76% 宽 —— 1900px 的原图够这个槽位用。 -->

<div class="chip" style="--w: 76%">

![Three approved lockups](./a-lockups.png)

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
     A 栏的渐变、A 栏的奶油、B 栏的色卡，三处够了 —— 再加一块，
     整页就从「大量白加几个彩色瞬间」变成「一块块颜色」。
     而这七张本来就是整页最有颜色的东西，不需要底色帮忙。 -->

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
     整袋入画那一版挪去当首图了，这里换成细节特写 ——
     同一张照片出两个近乎一样的构图是重复，而特写讲的是另一件事：
     牛皮纸的纤维、橙墨压在上面的样子、折痕、小字印的化学式。
     其余四张从 3000x2000 的原图重裁（海报 1/2 是 PSD，sips 先拍平）。
     之前每张都补成 16:9 的白卡，是为了让几条可见的卡边对齐；
     底色换成纯白、卡边看不见之后，那圈白边就不换任何东西了 ——
     量出来主体只占 42% / 65% / 49% / 49% 的宽，一半分辨率浪费在白上。
     现在按主体外扩 9% 裁，四张都是 85% 占宽。
     留 9% 而不是贴边：没有框了，主体不能顶着槽位边缘，柔影也要地方。
     取框阈值用 250 不用 248，为的是把淡影子一起框进来 ——
     影子裁掉了，主体就浮着没有重量。

     这一节整块给纯白，不给彩色域。
     彩色域在这里必然制造三层底：色域 → 图片自己的白 → 主体。
     量过，这四张的四角都是 #FFFFFF 烤死在图里的，.card 本身没有背景，
     所以「白卡」就是图片自己 —— 底色换成什么，白框都还在。
     板岩灰试过、薄荷试过，都一样别扭。
     抠白在这儿也行不通：T 恤本身就是白的，抠白会把衣服吃掉。

     纯白是唯一能让这层白消失的底。四张整块融进去，主体直接浮着，
     一个框都没有。杯套是 #F8F5E6（它自己的奶油纸），差 8 级，看不见。
     白压在 #F7F8F7 的纸上只是轻微提亮，读起来像这一节被照亮了,
     对一个叫糯氧、参考叫 A Glow 的项目正好。
     LUMI 那套案例的产品页也是纯白的。 -->

<div class="bleed">

![The bag up close: orange ink on kraft, with the formula printed small](./e-bag.jpg)

</div>

<!-- 槽位宽度给百分比，按每张自己的比例定，不再统一通栏。
     举着的那张是 1.15 的竖构图，给 56%；两张平面海报是 1.49 的横构图，
     给 86% —— 它们各占一行，比例不同没关系。
     两件 T 恤要并排，比例必须一致，量过是 1.112 对 1.112。 -->

<div class="field" style="--field: #FFFFFF; --field-ink: #2F3F47">

<div class="chip" style="--w: 56%">

![A poster held up, actual size](./e-poster-held.jpg)

</div>

<div class="chip" style="--w: 86%">

![Two posters, flat and pasted](./e-poster.jpg)

</div>

<div class="cards2">

![Staff tee, front](./e-tee.jpg)

![Staff tee, back](./e-tee-back.jpg)

</div>

<!-- 杯套只有 1500px，通栏（992 槽位要 1984）会放大到 0.76 倍。
     给 74% —— 734 的槽位要 1468，刚好够。 -->

<div class="chip" style="--w: 74%">

![Cup sleeve — the bilingual tagline lockup](./e-cup-sleeve.jpg)

</div>

</div>
