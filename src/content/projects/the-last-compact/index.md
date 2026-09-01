---
title: The Last Compact
year: '2026'
categories: ['Game', 'AR/VR']
featured: true
order: 1
summary: A first-person interactive narrative installation on memory, debt, and entropy — an infinite corridor of memory chambers whose ending is driven by a model of the protagonist's psychological state.
meta:
  date: 2026.01 – 2026.04
  dimension: 1920×1080
  media: Unity / C# / Photoshop / Illustrator / Blender
  subtitle: First-Person Narrative Exploration
---

## A — PROJECT OVERVIEW

The Last Compact is a first-person interactive narrative installation exploring themes of
memory, debt, and entropy. Developed in Unity with the URP pipeline, the experience guides
players through an infinite corridor of interconnected memory chambers, where the narrative
path and final outcome are dynamically driven by a mathematical model of the protagonist's
psychological state.

## B — GAMEPLAY FLOW

The experience begins with a prologue, leading the player into an infinite corridor.
Players navigate through six distinct memory chambers across two phases, collecting
fragments to progress toward a final judgment, culminating in one of three possible
endings: **Stable**, **Unstable**, or **Collapse**.

## C — TECHNICAL BREAKDOWN

The entire project follows a layered, event-driven architecture. All game data lives in
ScriptableObject assets — zero hardcoding. Systems communicate through a static event bus,
meaning no script directly references another. This makes every component independently
testable, swappable, and debuggable.

## D — SEE IT IN ACTION

Words and diagrams can only show so much. Watch the full walkthrough to see how it all
comes together.
