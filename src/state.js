// src/state.js — single shared mutable run-state object.
export const G = {
  legendPool: null,
  map: undefined, visible: undefined, explored: undefined,
  ents: undefined, items: undefined, logLines: undefined,
  depth: undefined, gold: undefined, score: undefined, potions: undefined,
  feats: undefined, // decoration layer: feats[y][x] = sprite id of a blocking feature, or null
  player: undefined, equipped: undefined, inv: undefined, running: undefined,
  started: false,
  ngPlus: 0, // New Game+ tier: scaling depth = depth + ngPlus*FINAL_DEPTH
  maxDepthReached: 1, // deepest scaledDepth ever reached this run — gates the descend HP reward
  godMode: false, // debug: F1 toggles invulnerability (no health loss)
  choosing: false, pendingLevelUps: 0, currentPerks: [], bossEnt: null,
  levels: {}, upX: -1, upY: -1, merchant: null, shopping: false, shots: [], chests: [],
  autoEquipOn: true, autoEquipWarned: false,
  camX: 0, camY: 0,
};
