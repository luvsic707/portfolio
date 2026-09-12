---
title: The Last Compact
year: '2026'
categories: ['Game', 'AR/VR']
featured: true
order: 2
status: COMPLETE
summary: A first-person interactive narrative installation on memory, debt, and entropy — an infinite corridor of memory chambers whose ending is driven by a model of the protagonist's psychological state.
meta:
  date: 2026.02 – 2026.04
  dimension: 1920×1080
  media: Unity / C# / Photoshop / Illustrator / Blender
  subtitle: First-Person Narrative Exploration
links:
  - label: Source code
    href: https://github.com/luvsic707/memory2/tree/code/Assets/The_Last_Compact
gallery:
  - video: /media/the-last-compact/hero-01.mp4
    alt: The Last Compact — video 01
cover: ./card.jpg
---

## A — PROJECT OVERVIEW

A first-person narrative installation on memory, debt and entropy. Built in Unity with URP:
an infinite corridor of memory chambers where the path and the ending are driven by a
mathematical model of the protagonist's psychological state.

<!-- auto:images -->
<div class="full">

![A — PROJECT OVERVIEW 01](./a-project-overview-01.jpg)

![A — PROJECT OVERVIEW 02](./a-project-overview-02.jpg)

![A — PROJECT OVERVIEW 03](./a-project-overview-03.jpg)

![A — PROJECT OVERVIEW 04](./a-project-overview-04.jpg)

</div>
<!-- /auto:images -->

## B — GAMEPLAY FLOW

A prologue leads into the corridor. Six memory chambers across two phases, fragments
collected toward a final judgment, ending in one of three states: **Stable**, **Unstable**,
**Collapse**.

<div class="dg dg-flow">

<div class="dg-node"><b>Bootstrap</b></div>
<div class="dg-arrow"></div>
<div class="dg-node"><b>Main menu</b></div>
<div class="dg-arrow"></div>
<div class="dg-node"><b>Wakeup room</b></div>

<div class="dg-arrow"></div>

<div class="dg-row">
<div class="dg-node">Branching dialogue<br/>+ voiceover</div>
<span class="dg-sep">→</span>
<div class="dg-node">Timeline<br/>cinematic</div>
<span class="dg-sep">→</span>
<div class="dg-node">Read the<br/>letter</div>
<span class="dg-sep">→</span>
<div class="dg-node">Gameplay<br/>enabled</div>
</div>

<div class="dg-arrow long"></div>

<div class="dg-node key"><b>Infinite corridor</b><i>AI-generated paintings · infinite loop</i></div>

<div class="dg-arrow long"></div>

<div class="dg-split">
<div class="dg-branch">
<span class="dg-label">Phase A</span>
<div class="dg-node">Room 1 — Melting community<i>400 procedural houses</i></div>
<div class="dg-node">Room 2</div>
<div class="dg-node">Room 3</div>
<span class="dg-label">Collect 3 memories</span>
</div>
<div class="dg-branch">
<span class="dg-label">Phase B</span>
<div class="dg-node">Room 4</div>
<div class="dg-node">Room 5</div>
<div class="dg-node">Room 6</div>
<span class="dg-label">Collect 3 memories</span>
</div>
</div>

<div class="dg-arrow long"></div>

<div class="dg-node"><b>Archive room</b><i>Space-bar sequences · entropy 3D model</i></div>

<div class="dg-arrow"></div>

<div class="dg-node key"><b>Chapter evaluation</b>
<span class="dg-eq">S =
<span class="dg-frac"><span>Psyche</span><span>√(Debt × Entropy + 1)</span></span>
</span>
</div>

<div class="dg-arrow long"></div>

<div class="dg-ends">
<div class="dg-node"><b>Stable</b><i>S &gt; 1.5</i></div>
<div class="dg-node"><b>Unstable</b><i>S &gt; 0.8</i></div>
<div class="dg-node"><b>Collapse</b><i>otherwise</i></div>
</div>

</div>

## C — TECHNICAL BREAKDOWN

Layered and event-driven. All game data lives in ScriptableObject assets — no hardcoding.
Systems talk through a static event bus, so no script references another directly, and every
component stays independently testable and swappable.

<div class="dg">

<div class="dg-layer">
<span class="dg-label">Data<span>Layer 1</span></span>
<div class="dg-boxes">
<div class="dg-node"><b>GameBalanceConfig</b><i>all tunable params</i></div>
<div class="dg-node"><b>NarrationDatabase</b><i>dialogue &amp; conditions</i></div>
<div class="dg-node"><b>WakeupDialogueData</b><i>branching dialogue</i></div>
<div class="dg-node"><b>EndingData</b><i>3 endings</i></div>
<p class="dg-note">ScriptableObject assets — no hardcoding</p>
</div>
</div>

<div class="dg-layer">
<span class="dg-label">Singleton managers<span>Layer 2</span></span>
<div class="dg-boxes">
<div class="dg-node"><b>GlobalProgressManager</b><i>scene flow, memory tracking</i></div>
<div class="dg-node"><b>GlobalMentalState</b><i>entropy simulation</i></div>
<div class="dg-node"><b>GlobalUIManager</b><i>pause, cursor, UI</i></div>
<div class="dg-node"><b>NarratorManager</b><i>queue-based playback</i></div>
<div class="dg-node"><b>ScreenFader</b><i>transitions</i></div>
<p class="dg-note">DontDestroyOnLoad — persistent across scenes</p>
</div>
</div>

<div class="dg-layer">
<span class="dg-label">Event bus<span>Layer 3</span></span>
<div class="dg-boxes">
<div class="dg-node key"><b>NarrationAnnouncer</b><i>static event bus — zero dependencies</i></div>
<div class="dg-node">in — OnNarrationRequested<br/>in — OnSceneEventTriggered</div>
<div class="dg-node">out — OnNarrationStarted<br/>out — OnNarrationEnded</div>
<p class="dg-note">No script directly references another</p>
</div>
</div>

<div class="dg-layer">
<span class="dg-label">Scene systems<span>Layer 4</span></span>
<div class="dg-boxes">
<div class="dg-node"><b>Wakeup</b><i>WakeupSequenceManager · DialogueUI · Letter</i></div>
<div class="dg-node"><b>Corridor</b><i>UniversalPlayer · CorridorManager · DoorManager · AITextureRequester · MemoryItem</i></div>
<div class="dg-node"><b>Memory rooms</b><i>Room1SequenceManager · MeltController · InfiniteCommunity</i></div>
<div class="dg-node"><b>Archive</b><i>ArchiveSpaceSequence · ChapterEvaluator</i></div>
</div>
</div>

<div class="dg-layer">
<span class="dg-label">Causal entropy MVC<span>Layer 5</span></span>
<div class="dg-row">
<div class="dg-node"><b>CausalModel</b><i>pure C# logic</i></div>
<span class="dg-sep">→</span>
<div class="dg-node"><b>CausalController</b><i>MonoBehaviour bridge</i></div>
<span class="dg-sep">→</span>
<div class="dg-node"><b>CausalView</b><i>shader driver</i></div>
<span class="dg-sep">→</span>
<div class="dg-node"><b>Custom shaders</b><i>MeltDistortion · CausalEntropy</i></div>
</div>
</div>

</div>

## D — SEE IT IN ACTION

Words and diagrams can only show so much. Watch the full walkthrough to see how it all
comes together.

<div class="tube" data-tube="ywdpvI_SuBE" data-tube-label="The Last Compact — full walkthrough"></div>
