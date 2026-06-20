# Modularize Caves of Qlaude — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single-file `caves-of-qlud-v0.17.0.html` (5,013 lines) into focused ES modules loaded by a thin `index.html`, with **identical** gameplay.

**Architecture:** Convert the inline `<script>` to a `type="module"` entry (`src/game.js`) served over a local HTTP server, then incrementally carve chunks out into sibling modules — leaf modules first (config, util, palette, art), then a shared mutable-state object `G` (`src/state.js`), then the systems (combat, monsters, bosses, items, worlds, player, audio, render). The original HTML is kept untouched as a known-good fallback to diff against.

**Tech Stack:** Vanilla JS ES modules, HTML5 canvas, Web Audio API. No build step, no framework, no bundler. Dev server: `python3 -m http.server`.

---

## Verification model

This project has **no automated test framework**, and one is explicitly out of scope. The "test" for every task is a fixed manual checklist run over the local server:

**RELOAD CHECK** (run after every task):
1. Ensure server running: `cd ~/COQ && python3 -m http.server 8000` (leave running in a terminal).
2. Hard-reload `http://localhost:8000/` (Cmd/Ctrl-Shift-R) with DevTools Console open.
3. **Console shows zero errors and zero warnings.**
4. **PLAYTEST CHECKLIST** — all must behave exactly as the original:
   - Title screen renders; music starts on first key/click; audio toggle + volume work.
   - Start a run: hero renders, movement works, FOV reveals the map.
   - Combat: attack a monster, take damage, kill it, gain XP.
   - Level up: the 3-perk choice appears and applies.
   - Loot: pick up gold/potion/gear; auto-equip and 3-of-a-kind merge work.
   - Descend stairs: new floor generates, biome/header text correct, +2 maxHP reward.
   - Merchant floor (depth 4): shop opens, buying consumes gold/stock.
   - Reach a boss; boss fight behaves normally.
   - Die: death overlay shows, music stops, restart works.
   - F1 godmode tag toggles.

If any check fails, **revert the task's changes** (`git checkout -- <files>`) and diff against the original before retrying. Do not proceed to the next task until the checklist is green.

**Module extraction recipe** (the repeated mechanical pattern):
- Cut the exact line range from `src/game.js`.
- Paste verbatim into the new module file.
- Add `export` keywords to the top-level `const`/`let`/`function` declarations the rest of the code references.
- Add `import { … } from './<module>.js';` at the top of `src/game.js` (and any other consumer module).
- Content of the moved code is **never edited** beyond adding `export`/`import` and (in Task 6) the `G.` state prefix.

---

## Task 1: Dev server shell + move all JS into one module

Moves 100% of the JavaScript into `src/game.js` unchanged and serves it as a module. Proves the server/module environment with zero logic change. This is the riskiest environmental step, so it goes first and alone.

**Files:**
- Create: `index.html`
- Create: `src/game.js`
- Reference (do not modify): `caves-of-qlud-v0.17.0.html`

- [ ] **Step 1: Create `src/game.js` from the original's script body**

Copy the exact contents **between** `<script>` (line 366, exclusive) and `</script>` (line 5011, exclusive) of `caves-of-qlud-v0.17.0.html` into `src/game.js`. Do not alter a single character of the JS.

- [ ] **Step 2: Create `index.html`**

Copy `caves-of-qlud-v0.17.0.html` to `index.html`, then in `index.html` replace the entire inline `<script> … </script>` block (lines 366–5011) with this one line:

```html
<script type="module" src="src/game.js"></script>
```

Leave `<head>`, `<style>`, `<body>`, and the header/DOM markup exactly as they are.

- [ ] **Step 3: Start the dev server**

```bash
cd ~/COQ && python3 -m http.server 8000
```

Leave running. Open `http://localhost:8000/`.

- [ ] **Step 4: RELOAD CHECK**

Run the full RELOAD CHECK + PLAYTEST CHECKLIST above.
Expected: identical to opening the original file. Zero console errors.

> Note: a few top-level `function` declarations are used by inline `onclick=` handlers in the HTML. Under `type="module"` those are no longer global. If the console reports `X is not defined` from an inline handler, expose the named handlers at the **end** of `src/game.js` via `window.X = X;` (e.g. `window.choosePerk = choosePerk;`). Add only the ones the console flags.

- [ ] **Step 5: Commit**

```bash
cd ~/COQ && git add index.html src/game.js && git commit -m "Modularize step 1: move game JS into src/game.js as ES module"
```

---

## Task 2: Extract `src/config.js` (immutable dials)

**Files:**
- Create: `src/config.js`
- Modify: `src/game.js`

- [ ] **Step 1: Create `src/config.js`**

Cut these constants from `src/game.js` and paste into `src/config.js`, adding `export` to each: `MAP_W`, `MAP_H`, `FOV_R` (original ~line 521), `ACT1_END`, `FINAL_DEPTH` (~2834), `MERCHANT_EVERY` (~3096), and the elite-spawn / scaling literals only if they are named constants (leave inline literals inline for now). Example shape:

```js
// src/config.js
export const MAP_W = 50;
export const MAP_H = 30;
export const FOV_R = 8;
export const ACT1_END = 20;
export const FINAL_DEPTH = 40;
export const MERCHANT_EVERY = 4;
```

- [ ] **Step 2: Import them in `src/game.js`**

Add at the very top of `src/game.js` (after `"use strict";`):

```js
import { MAP_W, MAP_H, FOV_R, ACT1_END, FINAL_DEPTH, MERCHANT_EVERY } from './config.js';
```

- [ ] **Step 3: RELOAD CHECK**

Run the full checklist. Expected: identical play, zero console errors.

- [ ] **Step 4: Commit**

```bash
cd ~/COQ && git add src/config.js src/game.js && git commit -m "Modularize step 2: extract config.js constants"
```

---

## Task 3: Extract `src/util.js` (shared helpers)

**Files:**
- Create: `src/util.js`
- Modify: `src/game.js`

- [ ] **Step 1: Create `src/util.js`**

Cut and paste these helpers, adding `export`: `clamp` (original ~line 2965) and `ri` (~3100). Do **not** move `$`, `cv`, or `ctx` (those are DOM bootstrapping and stay in `game.js`/`render.js`).

```js
// src/util.js
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const ri = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
```

- [ ] **Step 2: Import in `src/game.js`**

```js
import { clamp, ri } from './util.js';
```

- [ ] **Step 3: RELOAD CHECK** — full checklist, zero errors.

- [ ] **Step 4: Commit**

```bash
cd ~/COQ && git add src/util.js src/game.js && git commit -m "Modularize step 3: extract util.js (clamp, ri)"
```

---

## Task 4: Extract `src/palette.js` (PAL + S helper)

**Files:**
- Create: `src/palette.js`
- Modify: `src/game.js`

- [ ] **Step 1: Create `src/palette.js`**

Cut the `PAL` object (original ~line 530) and the `S()` sprite helper (~593) verbatim. Add `export` to both:

```js
// src/palette.js
export const PAL = { /* …moved verbatim… */ };
export function S(lines){ /* …moved verbatim… */ }
```

- [ ] **Step 2: Import in `src/game.js`**

```js
import { PAL, S } from './palette.js';
```

- [ ] **Step 3: RELOAD CHECK** — confirm all sprites still render; zero errors (the `S()` validator warns on bad grids — there should be none).

- [ ] **Step 4: Commit**

```bash
cd ~/COQ && git add src/palette.js src/game.js && git commit -m "Modularize step 4: extract palette.js (PAL, S)"
```

---

## Task 5: Extract `src/art/` sprite modules

The sprite block is original lines ~525–2838 (~46% of the file). Split into four files by category. Each only needs `S` and `PAL`.

**Files:**
- Create: `src/art/tiles.js`, `src/art/creatures.js`, `src/art/bosses.js`, `src/art/items-fx.js`
- Modify: `src/game.js`

- [ ] **Step 1: Create `src/art/tiles.js`**

Move the dungeon-tile sprite consts (original ~605–889, the `// DUNGEON TILES` … `// end dungeon tiles` block). At top of the file:

```js
import { S } from '../palette.js';
```

Add `export` to each tile const moved (e.g. `export const TILE_D_WALL = S(`…`);`).

- [ ] **Step 2: Create `src/art/creatures.js`**

Move all monster/creature sprite consts (Act I + Act II + v2 variants) the same way, with `import { S } from '../palette.js';` and `export` on each const.

- [ ] **Step 3: Create `src/art/bosses.js`**

Move the boss sprite consts (original ~1169–1488 "16 additional boss sprites" block plus any earlier boss sprites), with the same import + `export`.

- [ ] **Step 4: Create `src/art/items-fx.js`**

Move remaining gear/item/effect sprite consts the same way.

- [ ] **Step 5: Import all art into `src/game.js`**

Replace the removed sprite block region with imports. Use namespace imports to avoid listing every sprite name:

```js
import * as Tiles from './art/tiles.js';
import * as Creatures from './art/creatures.js';
import * as BossArt from './art/bosses.js';
import * as ItemsFx from './art/items-fx.js';
```

Then, immediately after the imports, re-bind the sprite atlas the way the renderer expects it. If the original referenced sprites by bare name (e.g. `TILE_D_WALL`), add a single shim object so existing lookups keep working unchanged:

```js
const SPRITES = { ...Tiles, ...Creatures, ...BossArt, ...ItemsFx };
```

If the original code looked sprites up via a map/atlas keyed by id, populate that existing atlas from `SPRITES` instead of introducing a new name. **Inspect how the renderer resolves a sprite id before choosing** — match the existing mechanism, do not invent a new one.

- [ ] **Step 6: RELOAD CHECK**

Full checklist with extra attention to: every tile renders, every monster sprite (Act I and Act II), boss sprites, item/effect sprites, and the Act-II v2 hero swap (descend to depth 21 via F1 + stairs, or temporarily bump start depth to confirm). Zero errors/warnings.

- [ ] **Step 7: Commit**

```bash
cd ~/COQ && git add src/art src/game.js && git commit -m "Modularize step 5: extract sprite art into src/art/"
```

---

## Task 6: Extract `src/state.js` (the shared mutable `G` object)

Convert the mutable globals to fields on one exported object. This is a whole-file find/replace of bare global names to `G.<name>`, so it is done as its own task and verified hard.

**Files:**
- Create: `src/state.js`
- Modify: `src/game.js`

- [ ] **Step 1: Create `src/state.js`**

```js
// src/state.js — all mutable run state lives here
export const G = {
  legendPool: null,
  map: null, visible: null, explored: null, ents: [], items: [],
  logLines: [], depth: 1, gold: 0, score: 0, potions: 2,
  feats: null,
  player: null, equipped: null, inv: [], running: false, started: false,
  ngPlus: 0,
  maxDepthReached: 1,
  godMode: false,
  choosing: false, pendingLevelUps: 0, currentPerks: [], bossEnt: null,
  levels: {}, upX: -1, upY: -1, merchant: null, shopping: false, shots: [], chests: [],
  autoEquipOn: true, autoEquipWarned: false,
  camX: 0, camY: 0,
};
```

- [ ] **Step 2: Remove the old global declarations from `src/game.js`**

Delete the original declaration lines (these were ~3059, ~3103–3112, ~3892):
`let legendPool=null;`, the `let map, visible, … potions;` line, `let feats;`, `let player, equipped, inv, running, started=false;`, `let ngPlus=0;`, `let maxDepthReached=1;`, `let godMode=false;`, `let choosing=…bossEnt=null;`, `let levels={}…chests=[];`, `let autoEquipOn=true, autoEquipWarned=false;`, and `let camX=0, camY=0;`.

- [ ] **Step 3: Import `G` and rebind every reference**

Add `import { G } from './state.js';` at the top of `src/game.js`. Then replace every bare reference to a moved global with the `G.`-prefixed form. Do this with a careful, word-boundary find/replace **per name** (not a blanket regex), one name at a time, e.g. `\bdepth\b` → `G.depth`, `\bplayer\b` → `G.player`, etc. After each name, save and glance at the console.

Watch for shadowing: skip occurrences where the name is a **local** parameter/variable (e.g. a function param named `player` or a loop `let depth`). Those must NOT be rewritten. Search results that are object keys (`player:`), property access on another object (`.depth`), or string literals must also be left alone.

- [ ] **Step 4: RELOAD CHECK**

Full checklist. This task is the highest-risk one: pay attention to state that persists across floors and across NG+ (gold, inventory, depth, maxDepthReached, ngPlus). Zero errors.

- [ ] **Step 5: Commit**

```bash
cd ~/COQ && git add src/state.js src/game.js && git commit -m "Modularize step 6: extract mutable state into src/state.js (G object)"
```

---

## Tasks 7–13: Extract the system modules

Each of these follows the **identical recipe**: cut the named functions/data out of `src/game.js` into the new module, add `export` to each moved top-level declaration, add the listed `import` line(s) to `src/game.js` (and to any sibling module that also calls them), run the full RELOAD CHECK, then commit. Imports needed by each module are listed explicitly. Extract in this order (later modules may import earlier ones; `game.js` always remains the orchestrator).

> **Cross-reference rule:** if module A calls a function now living in module B, add `import { fn } from './B.js';` to A. If two modules would need to import *each other* (a cycle), leave the shared function in `game.js` and have both import it from there, OR move the shared helper to `util.js`. Never create mutual imports between two large system modules.

### Task 7: `src/combat.js`

**Moves:** `rollHit` (~3579), `attack` (~3588), `addStatus` (~2976), `statusAtkMod` (~2982), `tickStatus` (~2988), `statusLabel` (~3008), the anti-stonewall floor-damage logic, and crit logic contained in `attack`.
**Module imports:** `import { G } from './state.js';`, `import { clamp, ri } from './util.js';`, plus `import { log } from './game.js';` if `log` stays in game.js (see Task 13 note).
**game.js import:** `import { rollHit, attack, addStatus, statusAtkMod, tickStatus, statusLabel } from './combat.js';`
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (combat math, poison/bleed/weaken statuses, crits, elite skills) → commit `"Modularize step 7: extract combat.js"`.

### Task 8: `src/monsters.js`

**Moves:** `makeMonster` (~3321), `makeElite` (~3308), monster base-stat tables (Act I ~3363, Act II ~3371), spawn-weight logic (`wRat` etc. ~3325, ~3352), per-room spawn count (~3218), depth-scaling block (~3305), `monsterAt` (~3577).
**Module imports:** `import { G } from './state.js';`, `import { ri, clamp } from './util.js';`, `import * as Creatures from './art/creatures.js';`, `import { addStatus } from './combat.js';` (for eliteStatus on-hit).
**game.js import:** `import { makeMonster, makeElite, monsterAt } from './monsters.js';` (plus tables if referenced directly).
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (spawn variety per biome, elites at ~15%, depth scaling, ranged + poison spitter) → commit `"Modularize step 8: extract monsters.js"`.

### Task 9: `src/bosses.js`

**Moves:** `BOSS_DEFS` (~2892), `makeBoss` (~2936), boss stat formulas + ranged-boss gate (~2961), `placeBoss` (~3429), boss intro text.
**Module imports:** `import { G } from './state.js';`, `import { ri, clamp } from './util.js';`, `import { ACT1_END, FINAL_DEPTH } from './config.js';`, `import * as BossArt from './art/bosses.js';`.
**game.js import:** `import { BOSS_DEFS, makeBoss, placeBoss } from './bosses.js';`
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (reach a boss; Varmathrax floor 20 + ranged bosses floor 4/7) → commit `"Modularize step 9: extract bosses.js"`.

### Task 10: `src/items.js`

**Moves:** `WEAPONS`/`ARMOR_TIERS` tables (~2849), `CHARMS`, `makeCharm` (~3028), `charmDef` (~3030), `makeGear` (~3407), `rollLoot` (~3396), `chestLoot` (~3290), enchant logic (~3403/3416), legendaries (`makeLegendary` ~3064, `makeLegendaryWeapon` ~3069, `makeLegendaryArmor` ~3082, `resetLegendPool` ~3060), gear helpers (`tierTable` ~3471, `gearBonus` ~3472, `gearName` ~3479, `bestOf` ~3487, `autoEquip` ~3488, `tryMerge` ~3505, `charmStat` ~3556, the `eff*`/`gear*`/`total*` helpers ~3557–3572).
**Module imports:** `import { G } from './state.js';`, `import { ri, clamp } from './util.js';`, `import * as ItemsFx from './art/items-fx.js';`.
**game.js import:** name the functions game.js still calls directly (`makeGear, rollLoot, chestLoot, makeLegendary, resetLegendPool, autoEquip, tryMerge, effAtk, effDef, gearBonus, gearName, bestOf, charmStat`, and the `gear*`/`total*` helpers used by combat — combat.js imports those it needs from here).
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (loot drops, gear tiers, enchanted deep gear, charms, 3-of-a-kind merge incl. equipped item, legendary from act-end boss) → commit `"Modularize step 10: extract items.js"`.

### Task 11: `src/worlds.js`

**Moves:** `BIOMES` list + `biomeFor` (~2808), `genLevel` (~3153), `carve` (~3136), `hTun` (~3137), `vTun` (~3138), `saveLevel` (~3142), `placeMerchant` (~3422), `los` (~3450), `computeFOV` (~3460), `upAllowed` logic, the per-floor descent reward (~2882).
**Module imports:** `import { G } from './state.js';`, `import { ri, clamp } from './util.js';`, `import { MAP_W, MAP_H, FOV_R, ACT1_END, FINAL_DEPTH, MERCHANT_EVERY } from './config.js';`, `import * as Tiles from './art/tiles.js';`, `import { makeMonster, makeElite } from './monsters.js';`, `import { placeBoss } from './bosses.js';`, `import { rollLoot, chestLoot } from './items.js';`.
**game.js import:** `import { biomeFor, genLevel, computeFOV, los, saveLevel } from './worlds.js';`
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (each biome band 1–40, map gen, FOV/LOS, upstairs allowed only on depths 2–10/22–30, merchant every 4, descent reward) → commit `"Modularize step 11: extract worlds.js"`.

### Task 12: `src/player.js`

**Moves:** player starting-stats template (~4154), starting resources (~4769, inside `newGame`'s setup — move only the player/stat construction, leave the `newGame` orchestration in game.js calling a `makePlayer()` you expose), `PERKS` (~2866) + `choosePerk` (~4213 handler logic, keep the DOM binding in game.js), `gainXp` (~3689) + XP curve (~3693).
**Module imports:** `import { G } from './state.js';`, `import { ri, clamp } from './util.js';`, `import { FOV_R } from './config.js';`.
**game.js import:** `import { makePlayer, PERKS, applyPerk, gainXp } from './player.js';`
> If splitting `newGame`/`choosePerk` between modules is awkward, keep those two functions in `game.js` and move only `PERKS`, the player template (as `makePlayer()`), and `gainXp` to `player.js`. game.js's `newGame` calls `makePlayer()`; its perk DOM handler calls an exported `applyPerk(perk)`.
- [ ] Cut → paste with `export` → add imports → **RELOAD CHECK** (fresh run start stats, XP curve/level pace, all perks apply correctly, F1 godmode) → commit `"Modularize step 12: extract player.js"`.

### Task 13: `src/audio.js` and `src/render.js`

**audio.js moves:** the procedural Web Audio synth + sequencer, `startTrack` (~4387), all biome track definitions, music toggle/volume state hooks, `_musicUnlock` (~4988).
**audio.js imports:** `import { G } from './state.js';` (only if it reads run state; otherwise none).
**render.js moves:** `sizeCanvas` (~3118), `spriteCanvas` (~2831), the main `render()` function, camera (`camX/camY` now in `G`), HUD/log drawing, `log` (~3574) **if** it is purely a `G.logLines` writer — but if many modules call `log`, move `log` to `util.js` instead and have everyone import it from there (decide based on call sites; prefer `util.js` to avoid cycles).
**render.js imports:** `import { G } from './state.js';`, `import { clamp } from './util.js';`, `import { MAP_W, MAP_H, FOV_R } from './config.js';`, `import * as Tiles from './art/tiles.js';`, `import * as Creatures from './art/creatures.js';`, `import * as BossArt from './art/bosses.js';`, `import * as ItemsFx from './art/items-fx.js';`, `import { biomeFor } from './worlds.js';`.
**game.js imports:** `import { initAudio, startTrack } from './audio.js';` and `import { render, sizeCanvas, spriteCanvas } from './render.js';`
- [ ] Extract `audio.js` → **RELOAD CHECK** (title music, biome crossfades, victory/NG+ track, toggle + volume, autoplay-on-gesture, music stops on death) → commit `"Modularize step 13a: extract audio.js"`.
- [ ] Extract `render.js` → **RELOAD CHECK** (everything draws; HUD, log box scroll/auto-stick to 200 lines, canvas resize) → commit `"Modularize step 13b: extract render.js"`.

---

## Task 14: Finalize `src/game.js` as the orchestrator

**Files:**
- Modify: `src/game.js`

What remains in `game.js`: the `import` block, DOM bootstrapping (`$`, `cv`, `ctx`), `newGame`, `startNgPlus`, input handlers (keydown ~4878, touch ~4911, inventory/auto/gfx button bindings ~4924–4934), the main turn/loop glue, any `window.X = X;` shims for inline HTML handlers, and the boot call.

- [ ] **Step 1: Confirm `game.js` is now only glue.** Skim it — every domain table, formula, and sprite should now live in a module. Anything still inline that belongs to a domain gets moved to that module (repeat the recipe).

- [ ] **Step 2: Remove dead code.** Delete any now-unused leftover declarations, commented-out original blocks, or duplicate consts the extraction left behind.

- [ ] **Step 3: RELOAD CHECK** — full checklist, plus a complete vertical slice: play from floor 1 → death, and a separate run that descends several floors and triggers NG+ if reachable via F1. Zero console errors/warnings.

- [ ] **Step 4: Commit**

```bash
cd ~/COQ && git add src/game.js && git commit -m "Modularize step 14: finalize game.js as orchestrator"
```

---

## Task 15: README + optional GitHub Pages

**Files:**
- Modify: `README.md`
- Create: `.nojekyll` (only if enabling Pages)

- [ ] **Step 1: Update `README.md`** with: how to run locally (`python3 -m http.server 8000` → open `http://localhost:8000/`), the `src/` module map, a one-line "what to edit to change X" table mirroring the cheatsheet's domains, and a note that `caves-of-qlud-v0.17.0.html` is the preserved standalone single-file build.

- [ ] **Step 2 (optional): Enable GitHub Pages.** Add an empty `.nojekyll` file at repo root (so `src/` is served verbatim). Then:

```bash
cd ~/COQ && git add README.md .nojekyll && git commit -m "Docs: run instructions + module map; enable Pages"
gh api -X POST repos/MightyMax-afk/COQ/pages -f 'source[branch]=main' -f 'source[path]=/' 2>&1 || echo "Enable Pages via repo Settings → Pages if API call is rejected"
```

Then open `https://mightymax-afk.github.io/COQ/` and run the PLAYTEST CHECKLIST against the hosted version.

- [ ] **Step 3: Push everything**

```bash
cd ~/COQ && git push
```

---

## Self-review notes

- **Spec coverage:** run model (Task 1, 15) ✓; file layout — config (2), util (3, supports the design's helper needs), palette (4), art/ (5), state/G (6), combat (7), monsters (8), bosses (9), items (10), worlds (11), player (12), audio+render (13), game orchestrator (14) ✓; shared `G` state (6) ✓; incremental + behavior-preserving verification (every task's RELOAD CHECK) ✓; original kept as fallback (Task 1 leaves it untouched) ✓; GitHub Pages (15) ✓.
- **`util.js` addition:** the design listed `config.js` for dials but the systems also share tiny helpers (`clamp`, `ri`); `util.js` (Task 3) holds those to keep modules decoupled and avoid cycles. This refines the design without contradicting it.
- **No placeholders:** every task names exact files, exact symbols, exact import lines, and a concrete verification checklist. The repetitive "move verbatim" tasks intentionally do not reproduce thousands of lines of sprite/logic source — the action is a cut/paste of identified ranges, fully specified by symbol name and original line anchor.
- **Cross-reference/cycle risk** is called out explicitly with a rule (Task 7 header + Tasks 7–13 preamble): shared helpers go to `util.js` or stay in `game.js`; no mutual imports between large modules.
