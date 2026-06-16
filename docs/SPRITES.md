# Sprites — atlas, spritesheet & injection

Caves of Qlud draws its pixel art procedurally: every sprite is an array of
palette-coded strings (`src/art/*.js`) baked to a canvas at runtime. That keeps
the game a zero-build, zero-asset browser app.

This doc covers the **64×64 PNG spritesheet pipeline** layered on top of that —
so you can hand-paint sprites in any image editor and inject them without
touching the procedural code.

## TL;DR — swap the whole sheet

The spritesheet is **on by default** (`SPRITESHEET.enabled` in `config.js`) and
the shipped `assets/spritesheet.png` is baked from the procedural art, so the game
looks identical until you replace it. To inject your own art, **overwrite that one
file**:

```
assets/spritesheet.png   ← drop your repainted sheet here, reload. Done.
```

The only rule: keep the **same grid layout** as the template — 16 columns, each
cell square, categories in the same rows (open the shipped PNG to trace it). The
loader is resolution-independent, so 1024², 1280², 2048²… all work as long as the
grid proportions match. Sprites missing from the sheet fall back to procedural art.

Need a fresh template to paint over?
```bash
node tools/make-spritesheet.mjs        # re-bake assets/spritesheet.png + atlas-manifest.json
```

### If your sheet has no transparency (flattened on black)
Export with a **transparent background** if you can — that's the clean path. If
your editor/exporter flattened the sheet onto solid black (RGB, no alpha), those
black squares would occlude the floor behind every sprite in-game. Convert it:
```bash
node tools/clean-spritesheet.mjs assets/spritesheet-raw.png assets/spritesheet.png 10
```
This is **grid-aware**: tile cells stay fully opaque, empty cells are cleared, and
each sprite cell has only its near-black margin flood-filled to transparent (so
enclosed dark outlines survive). The last arg is the brightness threshold
(`max channel ≤ N` counts as background) — raise it if a faint black halo remains,
lower it if it eats into dark sprites. `assets/spritesheet-raw.png` keeps your
original upload so you can re-run with a different threshold.

## How it fits together

| File | Role |
|---|---|
| `src/atlas.js` | **Single source of truth.** Maps every sprite id → pixel art, and defines the sorted sheet layout (`buildSheetPlan`). DOM-free, so Node tooling and the browser share it. |
| `src/spritesheet.js` | Runtime override layer. Loads a PNG + manifest, slices each 64×64 cell, and feeds it to the renderer. Falls back silently if the files are absent. |
| `src/render.js` | `spriteCanvas()` checks the override first, then bakes procedural art. One hook covers the whole game (map, HUD legend, drop icons). |
| `tools/make-spritesheet.mjs` | Node baker — writes `assets/spritesheet.png` + `assets/atlas-manifest.json`. Zero dependencies. |
| `export-spritesheet.html` | Browser baker/previewer — same output, downloadable, for when you don't have Node. Serve over HTTP and open it. |
| `assets/spritesheet.png` | The baked example sheet (current art). Open it to see the exact layout. |
| `assets/atlas-manifest.json` | id → cell-coordinate map the runtime uses to slice the sheet. |

## The sheet layout ("better sorted")

`buildSheetPlan()` groups sprites into ordered categories and lays each one — and
every animation frame — into 64×64 cells, 16 per row. Each category starts on a
fresh row, so the grid is stable and predictable:

| Rows | Category |
|---|---|
| 0–2  | Dungeon Tiles (8 biomes: walls, floors, stairs, decorations) |
| 3    | Heroes (wanderer / knight / rogue, v1 + Act II v2) |
| 4–6  | Creatures |
| 7    | Elite variants (`*_v2`) |
| 8    | NPCs / objects (chest, merchant) |
| 9–13 | Bosses (all 40) |
| 14   | Items (potion, gold, weapons, armor, helm, shield, charm, arrow + class tints) |
| 15   | Status FX (poison, burn, bleed, regen, weaken) |

Multi-frame sprites (most creatures and bosses are 2-frame idle loops) occupy
**adjacent cells**; the manifest's `frames[]` lists the top-left pixel of each.

## Injecting your own sprites

1. **Bake the template** so you're painting over the real grid:
   ```bash
   node tools/make-spritesheet.mjs
   ```
   (or open `export-spritesheet.html` over HTTP and click *Download spritesheet.png*).
2. **Open `assets/spritesheet.png`** in Aseprite / Photoshop / Krita / Piskel.
   Each cell is 64×64. Use `assets/atlas-manifest.json` to find a sprite by id —
   `sprites["boss_dragon"].frames` gives you its cell pixel coordinates.
3. **Repaint** the cells you want. Keep them 64×64 and keep the background
   transparent. You can repaint just one sprite and leave the rest.
4. **Drop the PNG back** at `assets/spritesheet.png` (don't move cells — the
   manifest maps positions). Set `SPRITESHEET.enabled = true` in `src/config.js`.
5. **Reload.** Your art renders in-game; untouched sprites use the procedural art.

### Adding a brand-new sprite size or layout
The cell size (64) and column count (16) live in `src/atlas.js`
(`CELL`, `SHEET_COLS`). Change them, re-bake, and both the Node and browser
exporters follow automatically — the manifest records whatever you choose.

## Notes & gotchas

- **Animation:** procedural single-frame sprites get a 1px idle "bob"; a PNG
  override animates via its own frames instead. If your override has more frames
  than the procedural source, the extra frames only cycle for sprites the atlas
  already marks multi-frame — paint multi-frame loops onto creatures/bosses,
  which already are.
- **Palette:** the procedural art uses the shared palette in `src/palette.js`.
  Your PNG can use any colors — it's blitted as raw RGBA, no palette limit.
- **Transparency:** leave empty pixels transparent (alpha 0). The baker writes
  transparent where the palette code is `.`/null.
- **No drift:** because the baker imports `src/atlas.js`, the sheet always matches
  the game's sprite ids. Add a sprite to the atlas → re-bake → it appears in the
  sheet automatically.

## Inventory screen (separate sheet)

The full-screen inventory (`src/inventory.js`) uses its own sprite set in
`sprites.js` (`window.QLUD`) — tier-specific item icons (dagger/sword/axe/hammer,
armor/helm/shield/boots tiers, class tints, charms) plus a *procedural* layered
paper-doll hero. Only the **icons** are PNG-driven; the paper-doll stays
procedural.

It works exactly like the main sheet, with its own files:

| File | Role |
|---|---|
| `assets/inventory-spritesheet.png` | 64×64-cell icon sheet (16 cols, 57 icons). |
| `assets/inventory-manifest.json` | id → cell map (with `pngVersion` cache-buster). |
| `assets/inventory-guide.png` | labeled chessboard — what icon goes in each cell. |
| `tools/make-inv-spritesheet.mjs` | bakes the sheet (reads `sprites.js` via a Node VM). |
| `tools/make-inv-guide.mjs` | bakes the guide. |

`sprites.js` auto-loads the sheet in the browser (`INV_SHEET.enabled`, default on)
and `drawSprite()` blits the PNG cell over the procedural icon, falling back per-id
if it's missing. To inject your art:

```bash
node tools/make-inv-spritesheet.mjs    # bake the template + manifest
node tools/make-inv-guide.mjs          # regenerate the labeled guide
# …repaint cells to match the guide…
```
then overwrite `assets/inventory-spritesheet.png` and re-run the baker once (to
refresh `pngVersion`), or just bump it. Same 16-column grid rules as the main sheet.
