# Caves of Qlud

A self-contained browser roguelike — 40 floors, two acts, procedural pixel-art
sprites, and a procedural Web Audio soundtrack. No frameworks, no build step.

## Run it locally

ES modules can't load over `file://`, so serve the folder over HTTP:

```bash
cd COQ
python3 -m http.server 8000
```

Then open **http://localhost:8000/** and press **ENTER** to descend.

Edit any file in `src/`, save, and refresh the browser — there's no build step.

## Play

- **Move:** arrow keys / WASD · diagonals **Q E Z C**
- **Grab:** `g` · **Quaff potion:** `p` · **Descend stairs:** `>` or `l`
- **Equip from pack:** number keys · **Graphics / music toggles:** top-right buttons
- **F1:** debug godmode (no damage)

## Project layout

The game was refactored from one 5,000-line HTML file into focused ES modules.
`index.html` is a thin shell that loads `src/game.js` as a module.

```
index.html              shell: <head>, CSS, canvas/DOM, <script type="module">
src/
  config.js     tunable dials: scaling, act lengths, map size, merchant freq, tile constants
  state.js      G — the single shared mutable run-state object (+ scaledDepth)
  util.js       clamp, ri, log, $ (getElementById)
  palette.js    PAL color map, S() sprite builder, COL render colors
  atlas.js      sprite id → art map + 64×64 spritesheet layout (DOM-free)
  spritesheet.js optional PNG-override loader (inject hand-painted sprites)
  art/
    tiles.js      dungeon tile sprites (8 biomes)
    creatures.js  monster sprites (Act I + II, v2 variants)
    bosses.js     40 boss sprites
    items-fx.js   gear / item / status-effect sprites
  monsters.js   stat tables, spawn weights, depth scaling, makeMonster/makeElite
  bosses.js     BOSS_DEFS roster, makeBoss stat formulas, placeBoss
  items.js      gear tiers, charms, loot rolls, enchant, legendaries, equip/merge
  player.js     starting stats (makePlayer), PERKS, gainXp
  combat.js     hit chance, damage, crit, status effects
  worlds.js     map generation, tunneling, FOV/LOS, merchant placement
  audio.js      procedural Web Audio music synth + per-biome tracks
  render.js     canvas drawing, sprite atlas + runtime, camera, HUD
  game.js       orchestrator: new game, main loop, input, overlays, shop, glue
```

### What to edit to change X

| Want to change… | File |
|---|---|
| Difficulty curve, map size, act lengths, merchant cadence | `config.js` |
| Monster stats / spawn rates / depth scaling | `monsters.js` |
| Bosses (names, stats, which floor) | `bosses.js` |
| Loot, gear tiers, enchanting, legendaries, charms | `items.js` |
| Biomes, dungeon generation, line-of-sight | `worlds.js` |
| Player start stats, character classes, level-up perks, XP curve | `player.js` |
| Hit/damage/crit math, status effects | `combat.js` |
| Sprites (pixel art) | `src/art/*.js` |
| Inject hand-painted PNG sprites | `src/atlas.js` + a 64×64 spritesheet — see [`docs/SPRITES.md`](docs/SPRITES.md) |
| Music | `audio.js` |
| HUD / drawing | `render.js` |

The original single-file build is preserved as
**`caves-of-qlud-v0.17.0.html`** — open it directly (double-click, no server) as a
standalone fallback. `QLUD_TUNING_CHEATSHEET.md` documents the v0.17.0 tuning knobs
(line numbers there refer to the original single file).

## Design docs

- `docs/superpowers/specs/2026-05-30-modularize-caves-of-qlud-design.md`
- `docs/superpowers/plans/2026-05-30-modularize-caves-of-qlud.md`
