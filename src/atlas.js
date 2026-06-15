"use strict";
// ============================================================
//  Caves of Qlud — SPRITE ATLAS (DOM-free)
//  Single source of truth for "sprite id -> pixel art" plus a
//  deterministic, category-sorted layout used to bake a 64×64
//  PNG spritesheet (see tools/make-spritesheet.mjs and
//  export-spritesheet.html).
//
//  This module is intentionally free of any browser/DOM APIs so
//  it can be imported by Node tooling AND the in-browser renderer.
//  All canvas work lives in render.js / spritesheet.js.
// ============================================================
import { PAL } from './palette.js';
import * as Tiles from './art/tiles.js';
import * as Creatures from './art/creatures.js';
import * as C64 from './art/creatures64.js';
import { SPRITES64 as Heroes64 } from './art/heroes64.js';
import * as BossArt from './art/bosses.js';
import * as ItemsFx from './art/items-fx.js';

export { PAL };

const ART = { ...Tiles, ...Creatures, ...BossArt, ...ItemsFx };

// ============================================================
//  PUBLIC ATLAS — flat lookup: id -> lines[] (single frame)
//  or frames[] (array of lines[], one per animation frame).
//  Moved verbatim out of render.js so it stays DOM-free.
// ============================================================
export const SPRITE_LINES = {
  // default-biome aliases (kept so non-biome code still works)
  wall:ART.TILE_D_WALL, floor:ART.TILE_D_FLOOR, stairs_down:ART.TILE_D_STAIRS_DOWN, stairs_up:ART.TILE_D_STAIRS_UP,
  // biome 1: Dungeon Halls
  d_wall:ART.TILE_D_WALL, d_floor:ART.TILE_D_FLOOR, d_stairs_down:ART.TILE_D_STAIRS_DOWN, d_stairs_up:ART.TILE_D_STAIRS_UP,
  // biome 2: Bone Crypt
  c_wall:ART.TILE_C_WALL, c_floor:ART.TILE_C_FLOOR, c_bones:ART.TILE_C_BONES,
  // biome 3: Damp Caverns
  k_wall:ART.TILE_K_WALL, k_floor:ART.TILE_K_FLOOR, k_shroom:ART.TILE_K_SHROOM, k_rocks:ART.TILE_K_ROCKS,
  // biome 4: Infernal Depths
  h_wall:ART.TILE_H_WALL, h_floor:ART.TILE_H_FLOOR, h_brazier:ART.TILE_H_BRAZIER,
  // Act II biome 5: The Sunken Reliquary (teal marble + flooded floor)
  r_wall:ART.TILE_R_WALL, r_floor:ART.TILE_R_FLOOR, r_shrine:ART.TILE_R_SHRINE, r_coins:ART.TILE_R_COINS,
  // Act II biome 6: The Ashen Wastes (burnt stone + soot floor)
  a_wall:ART.TILE_A_WALL, a_floor:ART.TILE_A_FLOOR, a_embers:ART.TILE_A_EMBERS, a_skull:ART.TILE_A_SKULL,
  // Act II biome 7: The Verdant Rot (vine walls + mossy earth)
  v_wall:ART.TILE_V_WALL, v_floor:ART.TILE_V_FLOOR, v_corpse:ART.TILE_V_CORPSE, v_fungus:ART.TILE_V_FUNGUS,
  // Act II biome 8: The Citadel of Stars (obsidian + onyx). 'cit_' prefix to avoid the crypt's 'c_wall'.
  cit_wall:ART.TILE_CIT_WALL, cit_floor:ART.TILE_CIT_FLOOR, cit_crystal:ART.TILE_CIT_CRYSTAL, cit_starfield:ART.TILE_CIT_STARFIELD,
  // 64×64 hero refresh (Heroes64.*). Wanderer swaps to its v2 look in Act II.
  player:Heroes64.hero64_wanderer_v1, player_v2:Heroes64.hero64_wanderer_v2,
  player_knight:Heroes64.hero64_knight_v1, player_rogue:Heroes64.hero64_rogue_v1,
  // class Act II upgrades — swapped in once everAct2 is set (mirrors the Wanderer's v2 swap)
  player_knight_v2:Heroes64.hero64_knight_v2, player_rogue_v2:Heroes64.hero64_rogue_v2,
  // 64×64 animated creature refresh — base archetypes (C64.*.frames = [frame0,frame1,...]).
  rat:C64.RAT.frames, goblin:C64.GOBLIN.frames, archer:C64.ARCHER.frames, orc:C64.ORC.frames, troll:C64.TROLL.frames, mage:C64.MAGE.frames, mimic:C64.MIMIC.frames,
  // Act II elite variants — now wired to the 64×64 _ELITE art.
  rat_v2:C64.RAT_ELITE.frames, goblin_v2:C64.GOBLIN_ELITE.frames, archer_v2:C64.ARCHER_ELITE.frames, orc_v2:C64.ORC_ELITE.frames,
  troll_v2:C64.TROLL_ELITE.frames, mage_v2:C64.MAGE_ELITE.frames, mimic_v2:C64.MIMIC_ELITE.frames,
  // Act II new commons — 64×64 refresh
  wraith:C64.WRAITH.frames, hound:C64.HOUND.frames, spitter:C64.SPITTER.frames, glasshusk:C64.GLASSHUSK.frames,
  cinderling:C64.CINDERLING.frames, brine:C64.BRINE.frames, boneknight:C64.BONEKNIGHT.frames,
  chest:ART.SP_CHEST, merchant:ART.SP_MERCHANT,
  boss_ratking:ART.SP_BOSS_RATKING, boss_warlord:ART.SP_BOSS_WARLORD, boss_widow:ART.SP_BOSS_WIDOW, boss_dragon:ART.SP_BOSS_DRAGON,
  boss_ogre:ART.SP_BOSS_OGRE, boss_wolf:ART.SP_BOSS_WOLF, boss_hollow:ART.SP_BOSS_HOLLOW, boss_emberlich:ART.SP_BOSS_EMBERLICH,
  boss_maw:ART.SP_BOSS_MAW, boss_golem:ART.SP_BOSS_GOLEM, boss_sythiss:ART.SP_BOSS_SYTHISS, boss_wraith:ART.SP_BOSS_WRAITH,
  boss_skarn:ART.SP_BOSS_SKARN, boss_devourer:ART.SP_BOSS_DEVOURER, boss_frost:ART.SP_BOSS_FROST, boss_brute:ART.SP_BOSS_BRUTE,
  boss_faceless:ART.SP_BOSS_FACELESS, boss_minotaur:ART.SP_BOSS_MINOTAUR, boss_nightmother:ART.SP_BOSS_NIGHTMOTHER, boss_warden:ART.SP_BOSS_WARDEN,
  // Act II bosses — 20 named, ending on Zarakhel
  boss_vexa:ART.SP_BOSS_VEXA, boss_korrun:ART.SP_BOSS_KORRUN, boss_yshara:ART.SP_BOSS_YSHARA,
  boss_helgrim:ART.SP_BOSS_HELGRIM, boss_ozmael:ART.SP_BOSS_OZMAEL, boss_drust:ART.SP_BOSS_DRUST, boss_sarn:ART.SP_BOSS_SARN,
  boss_bairgh:ART.SP_BOSS_BAIRGH, boss_nyssa:ART.SP_BOSS_NYSSA, boss_verdant:ART.SP_BOSS_VERDANT, boss_throk:ART.SP_BOSS_THROK,
  boss_vaelin:ART.SP_BOSS_VAELIN, boss_mura:ART.SP_BOSS_MURA, boss_iskvar:ART.SP_BOSS_ISKVAR, boss_khaazum:ART.SP_BOSS_KHAAZUM,
  boss_marrow:ART.SP_BOSS_MARROW, boss_volthus:ART.SP_BOSS_VOLTHUS, boss_erevhal:ART.SP_BOSS_EREVHAL,
  boss_hollowchoir:ART.SP_BOSS_HOLLOWCHOIR, boss_zarakhel:ART.SP_BOSS_ZARAKHEL,
  potion:ART.SP_POTION, gold:ART.SP_GOLD, weapon:ART.SP_WEAPON, weapon_knight:ART.SP_WEAPON_KNIGHT, weapon_rogue:ART.SP_WEAPON_ROGUE, armor:ART.SP_ARMOR, helm:ART.SP_HELM, shield:ART.SP_SHIELD, charm:ART.SP_CHARM,
  arrow:ART.SP_ARROW,
  poison:ART.SP_POISON, burn:ART.SP_BURN, bleed:ART.SP_BLEED, regen:ART.SP_REGEN, weaken:ART.SP_WEAKEN,
};

// Class floor-drop tints: recolor the generic armor/helm/shield drops to match
// the player's class (same maps as the inventory gear tints in sprites.js).
export const GEAR_TINT = {
  kn: { n:'3', B:'3', b:'4', '6':'3', '7':'4', e:'5', S:'3', t:'4', T:'5' },
  rg: { '3':'k', '4':'S', '5':'t', S:'k', t:'S', T:'t', L:'H', W:'G', Y:'g', y:'g', i:'H', I:'j', Z:'j', b:'B', e:'b', '7':'6' },
};
const _recolor = (lines, map) => lines.map(row => row.replace(/./g, ch => map[ch] || ch));
for(const [base, src] of [["armor",ART.SP_ARMOR],["helm",ART.SP_HELM],["shield",ART.SP_SHIELD]]){
  SPRITE_LINES[`${base}_kn`] = _recolor(src, GEAR_TINT.kn);
  SPRITE_LINES[`${base}_rg`] = _recolor(src, GEAR_TINT.rg);
}

// which sprites have the idle bob (procedural-render only; PNG sheets animate via frames)
export const SPRITE_ANIM = {
  player:1, player_v2:1, player_knight:1, player_rogue:1, player_knight_v2:1, player_rogue_v2:1, rat:1, goblin:1, archer:1, orc:1, troll:1, mage:1, mimic:1, merchant:1,
  rat_v2:1, goblin_v2:1, archer_v2:1, orc_v2:1, troll_v2:1, mage_v2:1, mimic_v2:1,
  wraith:1, hound:1, spitter:1, glasshusk:1, cinderling:1, brine:1, boneknight:1,
  boss_ratking:1, boss_warlord:1, boss_widow:1, boss_dragon:1,
  boss_ogre:1, boss_wolf:1, boss_hollow:1, boss_emberlich:1, boss_maw:1, boss_golem:1,
  boss_sythiss:1, boss_wraith:1, boss_skarn:1, boss_devourer:1, boss_frost:1, boss_brute:1,
  boss_faceless:1, boss_minotaur:1, boss_nightmother:1, boss_warden:1,
  // Act II bosses
  boss_vexa:1, boss_korrun:1, boss_yshara:1, boss_helgrim:1, boss_ozmael:1, boss_drust:1, boss_sarn:1,
  boss_bairgh:1, boss_nyssa:1, boss_verdant:1, boss_throk:1, boss_vaelin:1, boss_mura:1, boss_iskvar:1,
  boss_khaazum:1, boss_marrow:1, boss_volthus:1, boss_erevhal:1, boss_hollowchoir:1, boss_zarakhel:1,
  poison:1, burn:1, bleed:1, regen:1, weaken:1,
};

// ---------- pure frame helpers (no DOM) ----------
export function isMultiFrame(s){ return Array.isArray(s) && Array.isArray(s[0]); }
export function frameLines(id, frame){
  const s = SPRITE_LINES[id]; if(!s) return null;
  return isMultiFrame(s) ? s[(frame|0) % s.length] : s;
}
export function frameCount(id){
  const s = SPRITE_LINES[id]; if(!s) return 0;
  return isMultiFrame(s) ? s.length : 1;
}
// native pixel grid size of a sprite (32 or 64 in this game)
export function spriteSize(id){
  const lines = frameLines(id, 0); return lines ? lines.length : 0;
}

// ============================================================
//  SHEET LAYOUT — the "better sorted" part.
//  Sprites are grouped into ordered categories; every animation
//  frame gets its own 64×64 cell, laid left-to-right, and each
//  category starts on a fresh row. The result is a tidy, stable
//  grid you can open in any editor and know exactly what's where.
// ============================================================
export const CELL = 64;        // every sheet cell is 64×64 px (native sprite res)
export const SHEET_COLS = 16;  // grid width in cells (16 × 64 = 1024px wide)

// id -> category. Order of this list is the row order in the sheet.
export const CATEGORIES = [
  { key:'tiles',     label:'Dungeon Tiles',   match:id => /_(wall|floor|stairs_down|stairs_up|bones|shroom|rocks|brazier|shrine|coins|embers|skull|corpse|fungus|crystal|starfield)$/.test(id) || ['wall','floor','stairs_down','stairs_up'].includes(id) },
  { key:'heroes',    label:'Heroes',          match:id => id==='player' || id.startsWith('player_') },
  { key:'creatures', label:'Creatures',       match:id => ['rat','goblin','archer','orc','troll','mage','mimic','wraith','hound','spitter','glasshusk','cinderling','brine','boneknight'].includes(id) },
  { key:'elites',    label:'Elite Variants',  match:id => /_v2$/.test(id) && !id.startsWith('player') },
  { key:'npc',       label:'NPCs / Objects',  match:id => ['chest','merchant'].includes(id) },
  { key:'bosses',    label:'Bosses',          match:id => id.startsWith('boss_') },
  { key:'items',     label:'Items',           match:id => ['potion','gold','weapon','weapon_knight','weapon_rogue','armor','armor_kn','armor_rg','helm','helm_kn','helm_rg','shield','shield_kn','shield_rg','charm','arrow'].includes(id) },
  { key:'fx',        label:'Status FX',       match:id => ['poison','burn','bleed','regen','weaken'].includes(id) },
];

export function categoryOf(id){
  for(const c of CATEGORIES) if(c.match(id)) return c.key;
  return 'misc';
}

// Build a deterministic plan describing where every sprite/frame lands in the
// 64×64 grid. Returns { cell, cols, width, height, sprites, cells, groups }.
//   sprites: { id: { frames:[{x,y}], anim:0|1, size } }
//   cells:   flat [{ id, frame, col, row, x, y, size }] in draw order
//   groups:  [{ key, label, row, rows }] for documentation/preview headers
export function buildSheetPlan(opts){
  const cols = (opts && opts.cols) || SHEET_COLS;
  const cell = (opts && opts.cell) || CELL;
  const ids  = Object.keys(SPRITE_LINES);

  // bucket ids by category, preserving SPRITE_LINES insertion order within each
  const buckets = new Map(CATEGORIES.map(c => [c.key, []]));
  buckets.set('misc', []);
  for(const id of ids) buckets.get(categoryOf(id)).push(id);

  const order = [...CATEGORIES.map(c => c.key), 'misc'];
  const labelFor = k => (CATEGORIES.find(c => c.key===k)?.label) || 'Misc';

  const sprites = {}, cells = [], groups = [];
  let row = 0;
  for(const key of order){
    const list = buckets.get(key);
    if(!list || !list.length) continue;
    const startRow = row;
    let col = 0;
    for(const id of list){
      const n = frameCount(id);
      const frames = [];
      for(let f=0; f<n; f++){
        if(col >= cols){ col = 0; row++; }      // wrap within the category block
        const x = col*cell, y = row*cell;
        frames.push({ x, y });
        cells.push({ id, frame:f, col, row, x, y, size: spriteSize(id) });
        col++;
      }
      sprites[id] = { frames, anim: SPRITE_ANIM[id] ? 1 : 0, size: spriteSize(id) };
    }
    row++;                                       // next category starts on a new row
    groups.push({ key, label: labelFor(key), row: startRow, rows: row - startRow });
  }

  const height = row * cell;
  return { cell, cols, width: cols*cell, height, sprites, cells, groups };
}
