---
title: The 88th Night — A May Campaign for MATCHA MATCHA
year: '2026'
categories: ['Brand', 'Graphic']
featured: true
order: 2.5
status: CONCEPT
summary: An unsolicited campaign concept that turns a sourcing claim into a date on the calendar — one night, eighty-eight numbered cans, a wall customers empty themselves, and a live page that is that wall online.

meta:
  date: '2026.10'
  dimension: Campaign for May 2027
  media: Campaign Strategy, Art Direction, Interaction
  client: Unsolicited concept · not commissioned

# 2.5 不是笔误。品牌类作品排在最前（NUO2 是 1，Zenith 是 2），
# 这件是最近的品牌 + marketing 作品，该跟它们排在一起；
# 用小数插在 2 和 3 之间，就不用动其余十二个文件的 order。
#
# featured: true —— 现在投的是 marketing 岗，首页精选里需要有一件
# 讲得清策略的。不想要就把这一行改成 false，别的不用动。

# 活页在 /88，和这一页同一个站。D 节里是直接 iframe 嵌进来的，
# 这条 link 是给想单开一个标签页的人。
links:
  - label: Open the live page
    href: https://www.redthreadcreative.me/88

ground: paper
# plate 不是 merge：这一页的图大多是提案的内页，它们本来就是「纸」。
# 裱一圈白衬边加投影，读起来才是一叠摊开的文件，而不是糊在版心里的色块。
surface: plate
underlay: ./g-can.png

cover: ./card.png
gallery:
  - image: ./hero-01.png
    alt: Proposal cover — 八十八夜, The 88th Night
  - image: ./e-site-live.png
    alt: The live page on the night, eighty-eight numbers going dark one by one
  - image: ./c-mechanic.png
    alt: The mechanic — eighty-eight cans, eighty-eight bowls, and a wall
draft: true

# draft: true —— 线上完全不生成这一页（首页、作品列表、页脚计数、
# sitemap 全都没有它）。本地 npm run dev 照常能看见，见下面四个过滤器里
# 的 import.meta.env.DEV。要重新上线就把这里改回 false。
---

## A — THE READ

MATCHA MATCHA's Instagram bio does not open with a drink. It opens with **Kyoto
Ceremonial Grade Matcha**. The shop carries five Horii Shichimeien products, up to
$108. That is not a collaboration, it is a distribution relationship. The brand reads
like a tea merchant that happens to have a café, and that is the right way round.

So the strongest thing it owns is also the least schedulable thing it owns.
"Ceremonial grade from Uji" is a claim. Claims are easy to copy and impossible to
date. **A customer cannot attend a claim.**

The pressure is real: The Matcha Tokyo opened its first Canadian store on Ossington
in May 2026, arriving with authenticity as its weapon. When a new entrant competes
on origin, the incumbent has to say its origin out loud first.

<div class="field tall" style="--field: #00B550">

<div class="wordmark">八十八夜<em>The 88th Night · Sunday, May 2, 2027</em></div>

</div>

## B — THE DATE

八十八夜 is the eighty-eighth night counted from *risshun*, the first day of spring.
Leaves picked around it, after twenty days under shade, are steamed and dried without
rolling into **tencha**, and tencha stone-ground is **matcha**. Uji holds an official
picking festival that morning every year. Horii Shichimeien is in Uji.

In Japan this is common knowledge. In Toronto nobody has told it.

<div class="card">

![The idea — own the one day of the year matcha has a birthday](./a-idea.png)

</div>

Here is the part most people get wrong, and I nearly got wrong myself. Tencha rests
about six months before it is ground, so the tea picked on May 2 is not the tea you
drink on May 2. The field has one calendar and the tea room has another.

<!-- 这一页是整个提案里唯一能被懂行的人攻击的点，所以它不躲，它当主张用：
     把「五月没有新抹茶」这个事实，变成方案里的第二幕。 -->

<div class="card">

![Two calendars — the field and the tea room](./b-calendars.png)

</div>

八十八夜 belongs to the field. It is matcha's birthday. 口切り in November belongs to
the room, and it is the tea person's New Year. **The campaign takes the birthday and
keeps the New Year in reserve.**

## C — THE MECHANIC

Eighty-eight numbered cans. Eighty-eight bowls at $8.80. And a wall.

<div class="card">

![The mechanic — cans, bowls, and the numbered wall](./c-mechanic.png)

</div>

Eighty-eight numbered cards are pinned to a board in each room. When you buy a can,
**you take your own number off the wall.** One object replaces the counter card and
the chalk tally, and it is also the photograph: full at nine, nearly bare by three.

<!-- 编号罐是合成的，不是新拍的：堀井 Uji Mukashi 的官网产品图，
     底色正好就是品牌那个暖灰白 #E4E0DD，贴纸直接落上去。
     这是方案的论据之一 —— 没有新开模、没有新 SKU，贴纸就是产品。 -->

<div class="card">

![A numbered can — the brand's existing tin, with a hand-numbered sticker](./g-can.png)

</div>

The card that comes with it is not a souvenir, it is a claim ticket. The back says one
thing: **this number opens the jar in November.** One May evening becomes an
eighteen-month relationship with eighty-eight named customers, bought for the price of
a sticker.

## D — THE PAGE

The wall only exists for people standing in front of it. That is the one thing print
cannot fix, and it is the reason this campaign needs a page rather than a mockup of
one.

**/88 is the wall, online.** One page, four states, driven by the date.

<div class="embed">

<iframe
  src="/88"
  title="The 88th Night — the live page"
  loading="lazy"
  style="height: 860px; background: #E4E0DD"></iframe>

</div>

<p class="win-cap">Live and interactive. The black bar along the bottom is a date
switcher built for presenting, and in production the page just knows what day it is.
Try <b>2 MAY</b>, then drag the time slider.</p>

<div class="rows-3">

![April 19 to May 1 — counting down, one lesson a day](./e-site-countdown.png)

![May 2 — the live board, filtered by room](./e-site-live.png)

![November — type your number, claim the jar](./e-site-claim.png)

</div>

Every cell is a card on a real wall. When somebody lifts their number in the room, it
goes dark here. Filter by room and the campaign answers a question the printed version
cannot: **if you are in Markham at four o'clock, you can see Dundas has four left.**

Three things interaction does that a printed wall cannot do at all, and the page exists
for exactly these three:

<div class="dg">

<div class="dg-row">
<div class="dg-node"><b>Scarcity has to be visible</b><i>but a physical wall is only visible in the room</i></div>
<div class="dg-node"><b>A number has to be claimable</b><i>but paper cannot find you six months later</i></div>
<div class="dg-node"><b>A countdown has to change daily</b><i>but print is fixed the day it is printed</i></div>
</div>

</div>

## E — THE SYSTEM

The campaign does not get its own identity. It inherits MATCHA MATCHA's and adds one
thing: a number that counts down.

<div class="card">

![Campaign system — what is locked, what the campaign layer may add](./d-system.png)

</div>

Six elements stay locked — the wordmark, Helvetica, the green, the warm off-white,
the photography, the caption structure with no hashtags. Three are added: the numeral
set, the 八十八夜 lockup, and the counting device. **The campaign layer may only add.
It may never replace.**

<div class="card">

![Execution — five frames on screen, five objects in hand](./f-exec.png)

</div>

Nothing in the kit is manufactured. Printed, cut, or written by hand. The
hand-numbering is not decoration, it is the product photography. Total production:
$2,270, no paid media, no new SKU, across eight owned and earned channels.

And the eighty-eighth night happens every year. Run it once and the second year costs
nothing to explain.

> A claim can be copied by Monday. A date cannot.
