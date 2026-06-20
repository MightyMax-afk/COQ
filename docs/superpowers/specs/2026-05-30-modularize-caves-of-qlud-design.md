# Modularizing Caves of Qlaude — Design

**Date:** 2026-05-30
**Status:** Approved (design), pending implementation plan
**Source build:** `caves-of-qlud-v0.17.0.html` (single file, 5,013 lines, ~178 KB)

## Goal

Make the game easier to modify by splitting the single self-contained HTML file
into focused ES modules — separating monsters, worlds, bosses, items, sprites, and
the engine systems — with a thin `index.html` that loads them. **No behavior
change**: the modular version must play identically to v0.17.0.

## Non-goals

- No gameplay/balance/tuning changes during the split (those come *after*, on the
  proven structure).
- No build step, bundler, or minification.
- No rewrite of game logic — this is a restructure, not a redesign.
- No automated test framework (the project has none; verification is manual — see below).

## Key decision: how it runs

The current file opens via `file://` (double-click), with no server. Splitting into
separate JS files breaks that: browsers refuse ES module (`import`/`export`) loading
over `file://` (CORS), and Chrome increasingly blocks cross-file `<script src>` too.

**Decision: serve over http(s), use real ES modules, no build step.**

- **Development:** run a one-line local server (`python3 -m http.server`) and open
  `http://localhost:8000`. Edit a module → save → refresh. No build.
- **Publishing:** GitHub Pages serves the same files over `https`, so ES modules work
  unchanged. The repo can be published at `mightymax-afk.github.io/COQ` with zero code
  changes. (Enable Pages when the modular version is confirmed working.)
- Trade-off accepted: lose pure double-click-the-file. The original single-file build
  stays in the repo as a fallback and as the shareable standalone artifact.

## Architecture

### File layout

```
COQ/
  index.html              tiny shell: <head>, CSS, <canvas>/DOM, <script type="module" src="src/game.js">
  caves-of-qlud-v0.17.0.html   ORIGINAL — kept untouched as known-good fallback / standalone build
  src/
    config.js             cross-cutting dials: scaling muls, ACT1_END, FINAL_DEPTH,
                          MAP_W/H, FOV_R, MERCHANT_EVERY, elite chance, etc.
    state.js              the single mutable game-state object G (see "Shared state")
    palette.js            PAL color map + S() sprite helper
    art/
      tiles.js            dungeon tile sprites (4+ biomes)
      creatures.js        monster sprites (Act I + Act II, v2 variants)
      bosses.js           boss sprites (40 entries)
      items-fx.js         gear / item / effect sprites
    monsters.js           monster stat table + spawn weights + per-monster behavior
    bosses.js             BOSS_DEFS + boss stat formulas (makeBoss)
    items.js              gear tiers, charms, loot rolls, enchant, legendaries
    worlds.js             biomes, depth bands (biomeFor), map generation (genLevel/carve/tunnels)
    player.js             starting stats, PERKS, leveling (gainXp), descent rewards
    combat.js             hit chance, damage, crit, status effects
    audio.js              procedural Web Audio music synth + sequencer
    render.js             canvas drawing, FOV (computeFOV), camera, HUD/log
    game.js               entry point: state init, main loop, input handling, glue
```

Rationale for grouping (chosen over pure `data/` vs `logic/` separation): monster
*data* and *behavior* are intertwined (stats carry behavior flags like `ranged`,
`regen`, `eliteStatus`), so one-file-per-domain keeps a single conceptual change in a
single file. The cheatsheet's sections already map to these domains. Sprites are ~46%
of the file and rarely edited, so they move to `art/` to keep logic files small.

### Shared state

The current globals (file lines ~3059, ~3103–3112, ~3892) become fields on one
exported mutable object:

```js
// src/state.js
export const G = {
  map: null, visible: null, explored: null, ents: [], items: [],
  logLines: [], depth: 1, gold: 0, score: 0, potions: 2,
  feats: null, player: null, equipped: null, inv: [],
  running: false, started: false, ngPlus: 0, maxDepthReached: 1,
  godMode: false, choosing: false, pendingLevelUps: 0, currentPerks: [],
  bossEnt: null, levels: {}, upX: -1, upY: -1, merchant: null,
  shopping: false, shots: [], chests: [], legendPool: null,
  autoEquipOn: true, autoEquipWarned: false, camX: 0, camY: 0,
};
```

Every module imports `G` and reads/writes `G.player`, `G.depth`, `G.ents`, etc.
This is the **lowest-risk transform** of the existing globals — a mechanical
"`foo` → `G.foo`" rename, not a logic rewrite. `config.js` constants (immutable
dials) are separate from `G` (mutable run state) and imported where used as the
single source of truth.

### Data flow & import direction

- `game.js` is the orchestrator: imports systems, owns the main loop and input.
- Systems import `G` (state), `config` (constants), and the data/art they need.
- Import direction is kept mostly one-way (game → systems → data/art/state) to avoid
  circular-import tangles. Any unavoidable cross-reference between systems (e.g.
  combat ↔ monsters) is resolved by importing shared helpers from a leaf module or by
  routing through `game.js`, not by mutual imports between two large modules.

## Migration & verification

No automated tests exist, and the game's ethos is "reload and it works." So:

1. **Extract one module at a time**, in dependency order:
   config → palette → state → art → data/logic systems → render → game.
2. **After each extraction**, reload `localhost` and verify:
   - **Zero console errors/warnings.**
   - The game plays identically: start a run, fight monsters, pick up loot, level up
     (perk choice), descend a floor, hit a merchant floor, reach a boss, and die /
     game-over. Spot-check audio toggle and F1 godmode.
3. **No behavior changes** during the split — pure restructure.
4. **Keep `caves-of-qlud-v0.17.0.html` untouched** until the modular build is
   confirmed working, so there is always a known-good fallback to diff against.
5. A run is "done" only when the modular game is indistinguishable from the original
   across the checklist above.

## Risks

- **Hidden global coupling:** a function may read a global not obviously in scope.
  Mitigated by the central `G` object (all run state in one place) and incremental
  extraction with a console-error check after each step.
- **Circular imports:** mitigated by one-way import direction and a thin `game.js`
  orchestrator.
- **Sprite validation:** the `S()` helper warns on malformed 16×16 grids; keep it in
  `palette.js` so all `art/` modules validate identically.
- **Audio autoplay policy:** unchanged — music still starts on first user gesture.

## Success criteria

- `index.html` + `src/**` plays identically to `caves-of-qlud-v0.17.0.html`.
- Each module has one clear purpose and is small enough to hold in context.
- Editing a monster/boss/item/biome means opening one obvious file.
- Runs locally over `python3 -m http.server` and is publishable on GitHub Pages with
  no code changes.
