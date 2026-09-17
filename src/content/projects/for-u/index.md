---
title: For U
year: '2026-ongoing'
categories: ['Game']
featured: false
order: 1
status: ONGOING
summary: A six-stage first-person experience on what algorithmic feeds leave behind. The reward lasts seconds; the debt comes back as emptiness. Most anti-addiction work casts you as the victim — this one makes you the accomplice.
meta:
  date: 2026.07 – Present
  dimension: 1920×1080
  media: Unity / C# / MCP-assisted development
  role: Solo concept-to-production designer & technical artist
links:
  - label: Source code
    href: https://github.com/luvsic707/memory2/tree/code/Assets/For_You
gallery:
  - video: /media/for-u/hero-01.mp4
    alt: For U — video 01
cover: ./hero-poster.jpg
---

## A — THE SIX STAGES

<!-- 单元格用 div 不用 span：span 是行内元素，Markdown 会把连着的几个
     裹进同一个 <p>，于是一整行三格塌成一格，表格就散了。 -->
<div class="dg dg-tbl">

<div class="dg-th">Stage</div>
<div class="dg-th">Metaphor</div>
<div class="dg-th">Mechanic</div>

<div class="dg-stage"><b>01</b>Primal desire</div>
<div>The origin of pleasure</div>
<div>A hand reaches for a banana. Grasp, release, no friction.</div>

<div class="dg-stage"><b>02</b>Blind faith</div>
<div>Nietzsche — the death of God</div>
<div>In a prayer scene, the sacred object melts.</div>

<div class="dg-stage"><b>03</b>Sisyphus loop</div>
<div>Camus — the absurd</div>
<div>A stone on a closed path. Letting go is a way out.</div>

<div class="dg-stage"><b>04</b>Burnout society</div>
<div>Han — self-exploitation</div>
<div>Keystrokes pile up office text until the room collapses.</div>

<div class="dg-stage"><b>05</b>Algorithmic feed</div>
<div>Han — hyperattention</div>
<div>A corridor drains to monochrome, then to silence.</div>

<div class="dg-stage"><b>06</b>Data reckoning</div>
<div>Sartre — the accomplice</div>
<div>Your own behavioural trace, hung in the scene as data.</div>

</div>

Stage 6 only works if the data is real. The first build looked finished and was fed by a
random number generator — placebo data, at the climax of a work about confronting an
authentic trace of yourself. I rewired it to read the actual interaction frequencies from
the first five stages.

## B — THE LEVEL IS THE LOOP

Stage 3 is Sisyphus: a stone on a closed path, where letting go is the only way out. The
easy build is a straight corridor that teleports you back to the start. Instead the track
is an actual Möbius strip, generated at runtime from its parametric equation.

```csharp
public static Vector3 GetMobiusPoint(float u, float v, float R)
{
    float r = R + v * Mathf.Cos(u * 0.5f);          // radius wobbles as the band twists
    return new Vector3(r * Mathf.Cos(u),
                       v * Mathf.Sin(u * 0.5f),     // the half-angle is the twist
                       r * Mathf.Sin(u));
}
```

240 segments around the ring by 8 across the band — 2,169 vertices, 3,840 triangles,
rebuilt whenever a parameter changes.

Two things only surface once you actually build one:

<div class="dg dg-tbl">

<div class="dg-th">Consequence</div>
<div class="dg-th">Why</div>
<div class="dg-th">Fix</div>

<div><b>Half the track renders invisible</b></div>
<div>A Möbius strip has one side, so backface culling removes the surface you are standing on for half the loop.</div>
<div>The generator forces <code>_RenderFace = Both</code> and enables the <code>_DOUBLE_SIDED_ON</code> keyword on its own material.</div>

<div><b>The stone can't be moved in world space</b></div>
<div>There is no consistent "forward" on a non-orientable surface.</div>
<div><code>GetMobiusPoint</code> is public and static, so the stone is positioned in parameter space instead — it travels along <code>u</code>.</div>

</div>

Push `u` from 0 to 2π and the stone arrives back where it started, on the other face. The
loop isn't scripted or triggered. It's the geometry. `OnValidate()` regenerates the mesh
live in the Scene view, so the ring can be re-proportioned without entering Play mode.

## C — HOW IT'S PUT TOGETHER

Sixty-one C# scripts across eight domain-scoped folders — one per stage, plus `_Core` and
`UI_Dialogue`. Nothing is grouped by type, so a stage can be opened, changed or broken
without touching any other stage.

<div class="dg dg-tbl">

<div class="dg-th">Folder</div>
<div class="dg-th">Scripts</div>
<div class="dg-th">&nbsp;</div>

<div><code>Stage4_Office</code></div><div>11</div><div>keystrokes, collapse</div>
<div><code>Stage3_Sisyphus</code></div><div>9</div><div>Möbius geometry, stone, camera</div>
<div><code>_Core</code></div><div>8</div><div>event bus, shared services</div>
<div><code>UI_Dialogue</code></div><div>8</div><div>dialogue, HUD</div>
<div><code>Stage2_Faith</code></div><div>8</div><div>melt, fracture</div>
<div><code>Stage1_Primal</code></div><div>6</div><div>grasp and release</div>
<div><code>Stage5_Feed</code></div><div>6</div><div>drain to monochrome</div>
<div><code>Stage6_Future</code></div><div>5</div><div>behavioural trace</div>

</div>

Stages talk to each other through a static event bus rather than direct references — a
stage raises `SceneComplete` and doesn't know or care what is listening.

The restructure happened partway through, with the project already in a playable state. It
was done through Unity's own asset database rather than by moving files in Finder, so every
GUID and `.meta` file survived and no prefab, scene or material reference broke.

## D — ONE MATERIAL, SIX STAGES

The corridor walls are a live video feed. Its decay across the stages — the warp, the
speed trails, the glitch, the drain to silence — is not six sets of authored assets. It is
one shader with seventeen exposed floats, ramped over the course of the stage.

Nine effects stack inside a single pass, each gated on its own parameter:

<div class="dg dg-tbl">

<div class="dg-th">Layer</div>
<div class="dg-th">What it does</div>
<div class="dg-th">Cost</div>

<div><b>Jelly</b> <i>(vertex)</i></div>
<div>Two crossed sine products displace XY in object space, so the wall breathes rather than sitting flat.</div>
<div>Vertex only</div>

<div><b>Oil smear arc</b></div>
<div>Polar warp — angle from <code>atan2</code>, radius from <code>length</code>, then an arc offset of <code>sin(angle * 3 + r * 10 − t)</code> pushes the UV outward along its own bearing.</div>
<div>UV math</div>

<div><b>Wave warp</b></div>
<div>Two crossed sines on the sampling UV.</div>
<div>UV math</div>

<div><b>Vortex shear</b></div>
<div>A 2D rotation whose angle grows with distance from centre, so the middle holds and the edges twist.</div>
<div>UV math</div>

<div><b>Slice shift</b></div>
<div>Eight horizontal bands from <code>floor(uv.y * 8)</code>; each band gets a hashed horizontal offset that re-rolls eight times a second.</div>
<div>UV math</div>

<div><b>Glitch blocks</b></div>
<div>UV quantised to a grid that <i>coarsens</i> as intensity rises — 180 blocks down to 20 — so the picture doesn't just break, it gets blockier.</div>
<div>UV math</div>

<div><b>Radial speed trails</b></div>
<div>Ten taps accumulated along the vector from screen centre, averaged. The one layer that actually buys its effect with bandwidth.</div>
<div><b>10 samples</b></div>

<div><b>RGB chromatic shift</b></div>
<div>Three taps, R and B offset in opposite directions.</div>
<div>3 samples</div>

<div><b>Border melt</b></div>
<div>Edge distance through a <code>smoothstep</code>, blended against a channel-rotated copy of itself (<code>col.gbr</code>) so the frame bleeds inward.</div>
<div>Free</div>

</div>

Six of the nine are pure UV arithmetic — they rearrange where the texture is read from
rather than reading it more times. Only the trails and the chromatic shift add taps, and
they sit in opposite branches of the same `if`, so they never run together.

Every layer is an `if (_Parameter > 0.01)` away from costing nothing at all. A stage that
doesn't want the vortex pays for one comparison. That is what makes ramping the whole set
from a timeline affordable, and it is why the escalation could be tuned by dragging
sliders instead of rebuilding scenes.

## E — SEE IT IN ACTION

The full walkthrough, all six stages end to end.

<div class="tube" data-tube="uL9cSwGb98E" data-tube-label="For U — full walkthrough"></div>
