"use strict";
export const MAP_W = 50, MAP_H = 30, FOV_R = 8;
export const ACT1_END = 20;     // Varmathrax's floor — Act I closes here, descent continues to Act II
export const FINAL_DEPTH = 40;  // Zarakhel's floor — the win
export const MERCHANT_EVERY=4;   // a merchant appears on depths 4, 8, 12, 16 in a safe room
// Global multiplier on every gold drop (loot, chests, elites, mimics). Income scales
// with depth while merchant prices barely do, so by mid-game you out-earn a full
// buyout — 0.5 halves all gold so a buyout costs ~2 floors of income, not ~1. Tune
// this one number to make the economy looser (higher) or tighter (lower).
export const GOLD_DROP_MUL = 0.5;
export const T_WALL=0, T_FLOOR=1, T_STAIRS=2, T_STAIRS_UP=3;

// ---- Optional PNG spritesheet override ----------------------------------
// The game renders procedural pixel-art (src/art/*.js) by default. When enabled,
// it loads assets/spritesheet.png (64×64 cells, mapped by atlas-manifest.json)
// and draws those pixels instead — sprites missing from the sheet fall back to
// the procedural art automatically. To inject your own art: bake/repaint a sheet
// (node tools/make-spritesheet.mjs, or export-spritesheet.html), then drop it at
// assets/spritesheet.png — no code changes needed. See docs/SPRITES.md.
// The shipped sheet is baked from the procedural art, so this is visually
// identical until you replace the PNG.
export const SPRITESHEET = {
  enabled: true,
  png: 'assets/spritesheet.png',
  manifest: 'assets/atlas-manifest.json',
};
