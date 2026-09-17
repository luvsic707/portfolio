---
title: Nine Lives to Ruin a Kingdom — Narrative Card Game
year: '2025'
categories: ['Game', 'Illustration']
featured: false
order: 4
summary: You are the nine-tailed fox, sent by the goddess Nüwa to possess Su Daji and bring down King Zhou. A story-driven card game where every card is a moral event, and four hidden attributes decide whether you serve Heaven or break free.
meta:
  date: 2025.05 – 2025.06 (Phase I) · 2025.10 – 2025.12 (Phase II)
  dimension: 1920×1080
  media: ProtoPie (Phase I) / Photoshop / Illustrator / Hand-drawn Assets / Unity (team build)
links:
  - label: Team build (Unity)
    href: https://github.com/luvsic707/nine-lives-fengshen
  - label: World-building map
    href: https://whimsical.com/intro-of-wod-GfwM5K2eucEkNBHchJLHC7
surface: merge
gallery:
  - video: /media/nine-lives-game/hero-02.mp4
    alt: Nine Lives to Ruin a Kingdom — Narrative Card Game — Unity build
cover: ./card.webp
---

## A — WORLD & CHARACTERS

Colour blocks, silhouettes, proportion tests. Sharp angular forms read as danger; flowing
contours as allure.

Three figures carry it. Nüwa issues the command but never strikes. Daji, a nine-tailed fox
in human form, is sent to bring King Zhou down and begins to waver. Zhou resists them both,
and destroys himself doing it.

<!-- auto:images -->
<div class="slider">

![A — WORLD & CHARACTERS 01](./b-character-relationships-01.jpg)

![A — WORLD & CHARACTERS 02](./b-character-relationships-02.jpg)

</div>
<!-- /auto:images -->

## B — FIRST PROTOTYPE

Four hidden attributes — Love, Corruption, Divine Favour, Freedom — shift with every choice
and decide the branches and endings you reach.

<!-- auto:images -->
<div class="grid-2">

![B — FIRST PROTOTYPE 01](./d-game-core-loop-02.jpg)

</div>
<!-- /auto:images -->

Scene 1: you have to take Su Daji's body. The goal never changes, only what it costs.

<div class="dg dg-tbl dg-tbl-w">

<div class="dg-th">Choice</div>
<div class="dg-th">What you do</div>
<div class="dg-th">Stat change</div>

<div class="dg-stage"><b>01</b>Force</div>
<div>Tear her soul open and seize the body. Rapid clicks against a soul-pressure bar.</div>
<div>Corruption +2 · Freedom +2 · Divine Favour −2 · Love −1</div>

<div class="dg-stage"><b>02</b>Dream</div>
<div>Build her an illusion until she gives the body up willingly. Three rounds of dialogue lower her Mind Resistance.</div>
<div>Divine Favour +2 · Love +1 · Freedom −1 · Corruption ±0</div>

<div class="dg-stage"><b>03</b>Poison</div>
<div>Serpent venom in her tea forces the soul out. Sequence clicking — kettle, poison, incense burner.</div>
<div>Corruption +1 · Freedom +2 · Divine Favour −1 · Love −1</div>

</div>

I built it in **ProtoPie, not Unity** — two weeks for a clickable prototype, since "does the
narrative flow hold up" doesn't need an engine to answer. Testers said:

> They understood the concept and did not care about the story. The loop lacked appeal and
> reward.

Structurally it worked: choices, branching, four attributes. But *understanding* a premise
isn't wanting the next card, and four numbers moving out of sight isn't a reward you can
feel.

Everything after this section answers those two sentences.

<!-- auto:images -->
<div class="full">

<p><video src="/media/nine-lives-game/hero-01.mp4" width="2948" height="1902" controls preload="metadata" aria-label="B — FIRST PROTOTYPE 02"></video></p>

</div>
<!-- /auto:images -->

<sub>Phase I — the ProtoPie prototype that got tested. Not the current build.</sub>

## C — THE TEN STEMS

Not five elements with a yin and yang coat of paint. The **Ten Heavenly Stems** — each
element already arrives as two characters: 甲 the upright tree, 乙 the coiling vine; 丙 the
sun, 丁 the lamp.

Three words per card, fixed before anything was drawn:

<div class="dg dg-tbl dg-tbl-w">

<div class="dg-th">Stem</div>
<div class="dg-th">Three words</div>
<div class="dg-th">What it has to be</div>

<div class="dg-stage"><b>甲</b>Yang Wood</div>
<div>upward · straight · growth</div>
<div>Reach and escalation</div>

<div class="dg-stage"><b>乙</b>Yin Wood</div>
<div>soft · coiling · poison</div>
<div>Binds and lingers</div>

<div class="dg-stage"><b>丙</b>Yang Fire</div>
<div>deflagration · blazing sun · outward</div>
<div>Everything at once, nothing held back</div>

<div class="dg-stage"><b>丁</b>Yin Fire</div>
<div>candle flame · ritual · night fire</div>
<div>Small, deliberate, marks a target</div>

<div class="dg-stage"><b>戊</b>Yang Earth</div>
<div>mountain · mass · defence</div>
<div>The wall that doesn't move</div>

<div class="dg-stage"><b>己</b>Yin Earth</div>
<div>wet soil · mud · healing</div>
<div>The ground that feeds — restoration</div>

<div class="dg-stage"><b>庚</b>Yang Metal</div>
<div>unyielding · slaughter · steel</div>
<div>The axe. Straight damage</div>

<div class="dg-stage"><b>辛</b>Yin Metal</div>
<div>refined · delicate · small implements</div>
<div>Precision and refinement over force</div>

<div class="dg-stage"><b>壬</b>Yang Water</div>
<div>ocean · storm · surging</div>
<div>Overwhelms by volume</div>

<div class="dg-stage"><b>癸</b>Yin Water</div>
<div>rain threads · night · cold dew</div>
<div>Seeps in, conceals</div>

</div>

Underneath runs the overcoming cycle — Wood breaks Earth, Earth dams Water, Water quenches
Fire, Fire melts Metal, Metal cuts Wood. In the build it tilts an exchange rather than
deciding it.

## D — PROCESS

Four decisions did most of the work, and none of them were about drawing.

<div class="dg dg-tbl dg-tbl-2">

<div class="dg-th">Decision</div>
<div class="dg-th">What it bought</div>

<div class="dg-call">Borrow a system that already has meaning; don't invent one.</div>
<div>Five elements with a yin and yang label is a spreadsheet. The Ten Stems arrive already differentiated, so ten cards felt distinct before a single mark.</div>

<div class="dg-call">Write the words before the image.</div>
<div>Three words per card, fixed first. If two cards can't be separated in words, the paintings won't separate them either — 庚 and 辛 are both metal, but "slaughter, steel" and "delicate, small implements" are not one card.</div>

<div class="dg-call">Make the polarity visible, not labelled.</div>
<div>Yang cards are cream paper with a black glyph; Yin inverts to near-black with white. Readable across a table, without reading the corner.</div>

<div class="dg-call">Prototype in the cheapest tool that can answer the question.</div>
<div>ProtoPie took two weeks and told me the loop was wrong. Finding that out after a Unity build would have cost months.</div>

</div>

The pipeline stayed plain: script and boards → thumbnails for tone → AI for initial motion →
After Effects and TouchDesigner → sound last. Detailed narrative art is the most expensive
thing at this size, so the storytelling leans abstract on purpose.

<!-- auto:images -->
<div class="slider">

<p><video src="/media/nine-lives-game/f-production-flow-01.mp4" width="2230" height="1080" muted loop playsinline preload="metadata" data-autoplay aria-label="D — PROCESS 01"></video></p>

<p><video src="/media/nine-lives-game/f-production-flow-02.mp4" width="2230" height="1080" muted loop playsinline preload="metadata" data-autoplay aria-label="D — PROCESS 02"></video></p>

</div>
<!-- /auto:images -->

## E — GAME ASSETS

### E.1 — NARRATIVE SEQUENCES

<!-- auto:skip 手排版面，导入脚本不要动这里 -->

<!-- auto:images -->
<div class="reel">

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-01.mp4" width="1248" height="704" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 01"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-02.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 02"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-03.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 03"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-04.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 04"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-05.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 05"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-06.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 06"></video></p>

<p><video src="/media/nine-lives-game/h-1-narrative-sequences-07.mp4" width="1280" height="720" muted loop playsinline preload="metadata" data-autoplay aria-label="E.1 — NARRATIVE SEQUENCES 07"></video></p>

</div>
<!-- /auto:images -->

### E.2 — SYMBOLS & ICONS

<!-- auto:skip 手排版面，导入脚本不要动这里 -->

Fate and Artifact cards are planned. Only **Element Cards** are built, and they carry combat.

<!-- auto:images -->
<div class="cards">

![E.2 — SYMBOLS & ICONS 01](./g-card-design-01.jpg)

![E.2 — SYMBOLS & ICONS 02](./g-card-design-02.jpg)

![E.2 — SYMBOLS & ICONS 03](./g-card-design-03.jpg)

![E.2 — SYMBOLS & ICONS 04](./g-card-design-04.jpg)

![E.2 — SYMBOLS & ICONS 05](./g-card-design-05.jpg)

![E.2 — SYMBOLS & ICONS 06](./g-card-design-06.jpg)

![E.2 — SYMBOLS & ICONS 07](./g-card-design-07.jpg)

![E.2 — SYMBOLS & ICONS 08](./g-card-design-08.jpg)

![E.2 — SYMBOLS & ICONS 09](./g-card-design-09.jpg)

![E.2 — SYMBOLS & ICONS 10](./g-card-design-10.jpg)

![E.2 — SYMBOLS & ICONS 11](./g-card-design-11.jpg)

<p><video src="/media/nine-lives-game/g-card-design-12.mp4" width="800" height="1066" muted loop playsinline preload="metadata" data-autoplay aria-label="E.2 — SYMBOLS & ICONS 12"></video></p>

</div>
<!-- /auto:images -->

### E.3 — UI & INTERFACE

<!-- auto:skip 手排版面，导入脚本不要动这里 -->

The interface arrived as Unity's defaults, covering the painting it was meant to frame.
Splitting the health bar into groove, fill and frame produced a grammar worth reusing — dark
ground, art on top, frame around — now carrying five elements:

<div class="dg dg-tbl">

<div class="dg-th">Element</div>
<div class="dg-th">Ground</div>
<div class="dg-th">What the frame does</div>

<div><b>Health bar</b></div>
<div>Black groove</div>
<div>Bronze border; spending exposes the groove behind the fill</div>

<div><b>Name plate</b></div>
<div>Portrait slot</div>
<div>Bronze frame sized to lap over the icon, so no hairline of background shows</div>

<div><b>Energy row</b></div>
<div>Dark silhouette per point</div>
<div>Gold halo marks what's still spendable</div>

<div><b>Drop zone</b></div>
<div>Seal circle</div>
<div>The zone's own fill drops to 8%, so the circle reads as the shape</div>

<div><b>End turn</b></div>
<div>Black plate</div>
<div>Reuses the health bar's frame, so the two read as one kit</div>

</div>

<!-- auto:skip 手排版面，导入脚本不要动这里 -->

<!-- 这八张都是深色底的界面件，所以给它们一条黑带。
     02–06 的四角实测就是 (0,0,0) 纯黑 —— 落在黑带上边界整个消失，
     五块牌像本来就刻在同一片底上；摊在纸上的话就是五个黑方块。
     07–09 是真 alpha，中间那圈透明在黑带里正好补成黑，
     name plate 的空槽、印记里的黑地，都跟游戏里一个样。 -->
<div class="dark">

<div class="rows-5">

![E.3 — UI & INTERFACE 02](./i-ui-interface-02.jpg)

![E.3 — UI & INTERFACE 03](./i-ui-interface-03.jpg)

![E.3 — UI & INTERFACE 04](./i-ui-interface-04.jpg)

![E.3 — UI & INTERFACE 05](./i-ui-interface-05.jpg)

![E.3 — UI & INTERFACE 06](./i-ui-interface-06.jpg)

</div>

<sub>The five who appear in the name plate.</sub>

<!-- 血条和那三个零件排成一行，等高、排不下就横滑（.rail）。

     血条那张原本三个档位之间隔的是白画布 —— 白在纸上靠 multiply 能落成
     纸色，可这里是黑带，白就成了三道白杠。所以按空档切开再拼回去，
     档与档之间换成黑：拼完实测 0.00% 亮像素，压在黑带上没有边。

     拼回一张而不是留成三张，是因为要「等高」：血条 5:1、零件 1:1，
     三条血条各自站成一格的话，等高之后每条宽到一千像素，一行里全是它。
     合成一张之后比例 1.57，和 1:1 的零件并排大小相当。 -->
<div class="lane">

![E.3 — UI & INTERFACE 01](./i-ui-healthbar.webp)

![E.3 — UI & INTERFACE 07](./i-ui-interface-07.png)

![E.3 — UI & INTERFACE 08](./i-ui-interface-08.png)

![E.3 — UI & INTERFACE 09](./i-ui-interface-09.png)

</div>

<sub>Full, then spent: the fill clips back and the groove shows through. Name plate frame, energy pip, drop seal.</sub>

</div>

The advantage tell, card costs and five status effects are all implemented and still
invisible — design that was finished and never surfaced.

## F — WHERE IT LANDED

Phase II moved into Unity as a team build. **Engineering is his; my side was the card system,
the art, and the script.**

The build runs Boot → Title → Town → Battle: the Su residence as a hub with NPCs and actions
gated on story flags, and card combat carrying the ten-stem deck — energy, block, burn,
weaken, drag-to-play. That covers both things the testers said were missing: somewhere for
the story to happen, and a loop that pays you back.

A prototype, not a shipped game. The inventory has its UI and no items authored, which
describes the whole thing — the systems are further along than the content. What it settles
is that the ten-stem deck works as mechanics, not only as illustration.

The walkthrough below is the current build.

<div class="tube" data-tube="v_1MZvdq1JI" data-tube-label="Nine Lives to Ruin a Kingdom — Unity build walkthrough"></div>
