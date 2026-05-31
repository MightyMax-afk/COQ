"use strict";
import { MAP_W, MAP_H, FOV_R, ACT1_END, FINAL_DEPTH, MERCHANT_EVERY } from './config.js';
import { clamp, ri, log } from './util.js';
import { G } from './state.js';
import { PAL, S, COL } from './palette.js';
import * as Tiles from './art/tiles.js';
import * as Creatures from './art/creatures.js';
import * as BossArt from './art/bosses.js';
import * as ItemsFx from './art/items-fx.js';
import { makeGear, rollLoot, chestLoot, makeCharm, charmDef, makeLegendary, resetLegendPool, autoEquip, tryMerge, effAtk, effDef, gearBonus, gearName, bestOf, charmStat, gearEvade, gearThorns, gearRegen, totalMaxHpBonus, totalAcc, totalCrit, totalHitLeech, isEquippable, reconcileCharmHp, ALL_SLOTS } from './items.js';
import { PERKS, gainXp, makePlayer } from './player.js';
import { STATUS, addStatus, tickStatus, statusLabel, rollHit, attack } from './combat.js';
const ART = { ...Tiles, ...Creatures, ...BossArt, ...ItemsFx };

// ============================================================
//  BUILD VERSION  —  bump this each time we change something
// ============================================================
const BUILD = "v0.17.0";
const BUILD_DATE = "2026-05-29";
/* CHANGELOG
   v0.17.0 Ten-item pass.
           (1) Header now shows "— ACT I/II · <biome name> · depth N · NG+n —".
           (2) Merge fix: equipped gear counts toward the 3-of-a-kind threshold.
               When you have 1 worn + 2 spare, the 2 spares + the worn one fuse
               into an upgrade that swaps straight into the equipped slot — no
               more "1 leftover" pile and no naked slot.
           (3) Act I boss curve bumped from 1.08^d/1.07^d to 1.085^d/1.075^d
               (~+9% HP at Varmathrax). Act II curves unchanged — they felt fine.
           (4) Log buffer 6 -> 200 lines, log box scrolls and auto-sticks to the
               latest line.
           (5) Ashen Wastes music recomposed — dropped the noise crackles and
               low rumble that piled into a hissy texture; now a clean slow
               lament in D minor with a soft distant bell.
           (6) Legendaries now scale meaningfully past Act I: weapon atk bump
               1.4/depth -> 2.2/depth, armor def 0.7 -> 1.1. A depth-30 legendary
               weapon is ~79 atk now (was 52), depth-40 is ~101 (was 69) — they
               stay the obvious best-in-band over enchanted regular gear.
           (7) Leeching Charm rewritten: was +2 HP every hit (broken-tier), now
               +1 HP every other hit, hard-capped at 4 total per-hit healing.
           (8) Hero sprite swaps to the geared "player_v2" art permanently once
               you ever descend into Act II (depth 21+). Persists through NG+.
           (9) Act I commons heavily suppressed on Act II floors (down to ~15%
               weight), Act II commons bumped to fill — Act II floors are now
               ~95% Act II creatures.
          (10) Act I commons on Act II floors render with Designer Claude's
               v2 (revamped) sprites: scarred rat, war-painted orc, etc.
               Stats unchanged — pure render-time swap.
   v0.16.0 MUSIC. Procedural Web Audio synth + sequencer plays a hand-composed
           30-second loop for every context: title screen, each of the 8 biomes
           (halls/crypt/cavern/infernal/reliquary/ashen/verdant/citadel), a
           triumph track on victory + NG+ screen. Default ON. Header has a
           toggle and volume slider. Crossfades on biome change. Browsers
           require a user gesture before audio plays (auto-policy), so music
           starts on the first click/key/tap regardless of toggle state. Music
           stops on death overlay. No external audio assets — the file is still
           self-contained.
   v0.15.2 Act II commons wired into the spawn table — the 7 new monsters from
           Designer Claude (wraith, carrion hound, acid spitter, glass husk,
           cinderling, brine stalker, bone knight) now appear on Act II floors,
           biome-gated: Reliquary gets wraiths/brine/spitters, Ashen gets hounds/
           cinderlings/husks/bone knights, Verdant gets hounds/spitters, Citadel
           gets wraiths/cinderlings/husks/bone knights. Act I floors (1-20) are
           untouched and still play identically to v0.15.1. The biome gate uses
           the unscaled floor number so NG+ Act I floors still spawn only Act I
           mobs. Acid spitter is ranged + applies poison on hit (reuses the
           existing Venomous-elite status pathway, no new combat code). The other
           six use a basic Act I archetype with new sprites and tuned stats —
           bestiary gimmicks (immolate, shatter, grapple) intentionally deferred.
   v0.15.1 balance + fixes: (1) loot keeps improving all the way down — once the
           base tier ladder tops out (~depth 9), dropped gear arrives pre-enchanted
           (+1 per ~3 floors past depth 6), so deep weapons/armor genuinely scale.
           (2) Lowered depth scaling for the 40-floor run: monster HP growth 13.5%->6%/floor,
           attack 10%->5%/floor, defense now +1 every 3 floors (was every 2); boss HP
           1.15->1.08, boss attack 1.115->1.07, boss defense 0.75->0.45 per depth.
           (3) Fewer enemies on deep floors — per-room spawn count capped at 5 (was up to
           ~15 at depth 40). (4) Fixed "invincible" armored elites: player hits now always
           deal at least 3% of the target's max HP, and the Armored elite skill's defense
           bonus was toned down. Added F1 debug godmode (no damage taken) with a header tag.
   v0.15.0 ACT II content pass: the descent now runs 40 floors. Varmathrax is no longer
           the run's end — beating him drops a guaranteed legendary, opens the stairs,
           and the descent continues. New biomes 21-40: Sunken Reliquary (teal),
           Ashen Wastes (ember), Verdant Rot (moss), Citadel of Stars (violet). 20 new
           bosses, all with pixel-art sprites by Designer Claude, ending on Zarakhel,
           the Unborn Sun (floor 40, the new final). Upstairs are now allowed in the
           first 10 floors of each act (depths 2-10 and 22-30), symmetrically. NG+ now
           wraps the full 40-floor cycle back to Act I floor 1 with scaling continuing
           (NG+ floor 1 = scaledDepth 41). FINAL_DEPTH bumped 20 -> 40; ACT1_END=20
           constant added. Act II new commons (wraith, hound, spitter, glasshusk,
           cinderling, brine, boneknight) have sprites in the atlas but are not yet
           in the spawn table — pending behaviour design.
   v0.14.1 fixes: shop potions are now consumed when bought (no more infinite
           buying); more gear per shop (6-9) and legendaries cost 1000+; the
           Regeneration skill text now correctly reads "/9 turns"; softened
           boss HP/attack scaling at depth 15+ (a touch easier deep).
   v0.14.0 big content pass: 4 dungeon biomes by depth (Halls 1-5, Bone Crypt
           6-10, Damp Caverns 11-15, Infernal Depths 16-20; cycles each NG+
           tier) with blocking decorations (bones/boulders/braziers). Elite
           monsters (~15%/floor, ≥50% stronger, one player-style skill:
           vampiric/swift/venomous/brutal/armored, gold-tinted, better loot).
           No upstairs past depth 10. Shop stocks 1-10 potions + 5% legendary.
           Bosses drop legendaries at 5% (dragon still guaranteed). Merge
           ceiling raised to +99 (weapons/armor; charms stay unique).
   v0.13.2 fix: start-screen legend sprites now flow in rows (inline-block)
           instead of stacking into one vertical column when gfx is on.
   v0.13.1 fixes: sprites bake at an integer pixel scale (16×N) so pixel art is
           uniform and crisp instead of smeared; quaff moved to the P key (F is
           free); potion glyph reverted to "!".
   v0.13.0 minimap (line-based, bottom-left of the screen); New Game+ — beat the
           dragon to keep your character and dive again as "Extra Depth N-M"
           with scaling that keeps climbing (NG+ floor 1 = depth 21, etc.);
           potions now shown as "P"; start-screen legend shows sprites when gfx
           is on; centered the auto/gfx toggles.
   v0.12.0 all 20 bosses now have pixel-art sprites (Claude Design completed the
           remaining 16: ogre, wolf, hollow knight, emberlich, maw, golem,
           sythiss, wraith, skarn, devourer, frost, brute, faceless, minotaur,
           nightmother, warden). Graphics mode now fully illustrated.
   v0.11.0 GRAPHICS MODE: optional 16×16 pixel-art sprites (by Claude Design)
           with a "gfx: on/off" toggle (ASCII by default). Sprites for player,
           all monsters, items, tiles, chest/merchant, 4 bosses, and status
           icons; anything without art falls back to its ASCII glyph (incl. the
           16 bosses still being drawn). Idle-bob animation + floating status
           icons in graphics mode. Sprites pre-baked to offscreen canvases.
   v0.10.2 mobile: added diagonal buttons (↖↗↙↘) to the touch d-pad corners
           so phone players can move diagonally too.
   v0.10.1 tuning: slower leveling (steeper XP curve); bosses much tougher
           (higher HP floor + attack + regen, no more 2-hit kills, early
           bosses now a real fight); mimics rarer (~12%) but a genuine threat
           (more HP, free ambush bite); charms even rarer; Vampire perk +1 and
           very rare.
   v0.10.0 difficulty + fixes: monster & boss scaling now COMPOUNDS (exponential)
           to keep pace with player power; crit capped at 50%, enchant capped at
           +3 (anti-snowball). Fixed the "bleeds forever" bug — DoT now logs for
           monsters and suppresses regen that turn. Spiked Hide starts at 1 and
           stacks. Charms made very rare. Auto-equip restored (equips your best)
           with a one-time warning + on/off toggle when you equip manually.
   v0.9.1  stairs rebound to U (up) / L (down) since >/< need shift on many
           keyboards; > and < still work as alternates.
   v0.9.0  BUILD B + hard rebalance: status conditions (poison/burn/bleed/
           regen/weaken) that tick each turn and ignore armor; charms (5th
           equip slot, 12 types, on-hit & passive effects); chests with loot +
           mimic ambushes. Balance for difficulty: legendaries now drop only
           from milestone bosses (5/10/15/20), other bosses drop strong normal
           gear + a charm; lifesteal-on-hit capped at 4 and Vampire perk +3->+2;
           enemy attack scaling steepened; defense has diminishing returns past
           20; fewer potions. Also rolled back v0.8's over-tuned difficulty.
   v0.8.0  BUILD A balance pass: raised monster + boss defense and scaled it
           faster, gave orcs/trolls/mages and all bosses regeneration, added
           8 new level-up perks (crit, armor pierce, spikes, hit-leech, etc.).
   v0.7.0  monster depth-scaling (HP/atk/def), Regeneration perk made rare,
           fixed equipped gear being consumed by auto-merge, log moved into
           the board column to fill empty space, added this build stamp.
   v0.6.0  helmets + shields (4 equip slots), legendary armor with affixes,
           ranged enemies (archer, mage) + projectiles, randomized shop stock,
           lower loot/potion drop rates.
   v0.5.0  go back up stairs with level persistence, scarce early orcs,
           enemy loot drops, 40 unique legendary boss weapons, merchant
           every 4 floors, inventory scrollbar, WASD/QEZC controls.
   v0.4.0  item merging (3 alike fuse), unique boss per floor + final dragon
           at depth 20, hit/miss accuracy.
   v0.3.0  level-up perk picker (random 3 boons), skills panel.
   v0.2.0  camera that follows the player; mobile layout fixes.
   v0.1.0  initial browser roguelike: procedural dungeon, FOV, combat,
           potions/gold, equipment, infinite descent.
*/

// ---------- config ----------
const VIEW_W = 28, VIEW_H = 18;   // visible window in tiles; the camera follows the player
const CELL = 22, FONT = 19;       // logical pixels per cell (canvas is scaled to fit)

// ============================================================
//  PUBLIC ATLAS  — grouped for layout
// ============================================================

// flat sprite lookup: id -> 16-row lines array
const SPRITE_LINES = {
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
  player:ART.SP_PLAYER, player_v2:ART.SP_PLAYER_V2,
  rat:ART.SP_RAT, goblin:ART.SP_GOBLIN, archer:ART.SP_ARCHER, orc:ART.SP_ORC, troll:ART.SP_TROLL, mage:ART.SP_MAGE, mimic:ART.SP_MIMIC,
  // Act II revamped basics (same archetypes, fiercer art). Drop-in art, not wired yet.
  rat_v2:ART.SP_RAT_V2, goblin_v2:ART.SP_GOBLIN_V2, archer_v2:ART.SP_ARCHER_V2, orc_v2:ART.SP_ORC_V2,
  troll_v2:ART.SP_TROLL_V2, mage_v2:ART.SP_MAGE_V2, mimic_v2:ART.SP_MIMIC_V2,
  // Act II new commons
  wraith:ART.SP_WRAITH, hound:ART.SP_HOUND, spitter:ART.SP_SPITTER, glasshusk:ART.SP_GLASSHUSK,
  cinderling:ART.SP_CINDERLING, brine:ART.SP_BRINE, boneknight:ART.SP_BONEKNIGHT,
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
  potion:ART.SP_POTION, gold:ART.SP_GOLD, weapon:ART.SP_WEAPON, armor:ART.SP_ARMOR, helm:ART.SP_HELM, shield:ART.SP_SHIELD, charm:ART.SP_CHARM,
  arrow:ART.SP_ARROW,
  poison:ART.SP_POISON, burn:ART.SP_BURN, bleed:ART.SP_BLEED, regen:ART.SP_REGEN, weaken:ART.SP_WEAKEN,
};

// which sprites have the idle bob
const SPRITE_ANIM = {
  player:1, player_v2:1, rat:1, goblin:1, archer:1, orc:1, troll:1, mage:1, mimic:1, merchant:1,
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

// dungeon biomes by depth band (cycles each NG+ tier). Features are blocking
// decorations scattered like extra walls. Sprite ids resolve via SPRITE_LINES.
const BIOMES = [
  // ── Act I ── floors 1-20
  { id:"halls",    name:"Dungeon Halls",       wall:"d_wall", floor:"d_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:[] },
  { id:"crypt",    name:"The Bone Crypt",      wall:"c_wall", floor:"c_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["c_bones"] },
  { id:"cavern",   name:"Damp Caverns",        wall:"k_wall", floor:"k_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["k_shroom","k_rocks"] },
  { id:"infernal", name:"Infernal Depths",     wall:"h_wall", floor:"h_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["h_brazier"] },
  // ── Act II ── floors 21-40 (Designer Claude). Stairs sprites reuse Act I (purely cosmetic).
  { id:"reliquary",name:"The Sunken Reliquary",wall:"r_wall", floor:"r_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["r_shrine","r_coins"] },
  { id:"ashen",    name:"The Ashen Wastes",    wall:"a_wall", floor:"a_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["a_embers","a_skull"] },
  { id:"verdant",  name:"The Verdant Rot",     wall:"v_wall", floor:"v_floor",  stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["v_corpse","v_fungus"] },
  { id:"citadel",  name:"The Citadel of Stars",wall:"cit_wall", floor:"cit_floor", stairsDown:"d_stairs_down", stairsUp:"d_stairs_up", features:["cit_crystal","cit_starfield"] },
];
// 5-floor bands across both acts. Cycles through all 8 biomes per NG+ tier.
//   depth  1-5 halls,  6-10 crypt, 11-15 cavern, 16-20 infernal
//   depth 21-25 reliquary, 26-30 ashen, 31-35 verdant, 36-40 citadel
function biomeFor(d){
  const within = ((d-1) % 40);            // 0..39 within a tier
  return BIOMES[Math.min(7, Math.floor(within/5))];
}

// ---------- sprite runtime ----------
const GFX = { on:false, frame:0 };          // graphics mode off by default
const _spriteCache = {};                    // key:`id|bob|px` -> canvas

// render a 16x16 sprite into an offscreen canvas sized px×px (nearest-neighbor)
function _bakeSprite(lines, px, bob){
  const scale=Math.max(1, Math.round(px/16));   // integer scale -> uniform square pixels
  const dim=16*scale;
  const c=document.createElement('canvas'); c.width=dim; c.height=dim;
  const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
  for(let y=0;y<16;y++){
    const srcY=y-bob; if(srcY<0||srcY>=16) continue;
    const row=lines[srcY];
    for(let x=0;x<16;x++){ const col=PAL[row[x]]; if(!col) continue;
      ctx.fillStyle=col; ctx.fillRect(x*scale, y*scale, scale, scale); }
  }
  return c;
}
function spriteCanvas(id, px, bob){
  const lines=SPRITE_LINES[id]; if(!lines) return null;
  const key=id+'|'+bob+'|'+px;
  if(!_spriteCache[key]) _spriteCache[key]=_bakeSprite(lines, px, bob);
  return _spriteCache[key];
}

// ===== end sprite graphics =====
const T_WALL = 0, T_FLOOR = 1, T_STAIRS = 2, T_STAIRS_UP = 3;


// level-up boons: a weighted-random 3 of these are offered each level (lower weight = rarer)
// one unique boss guards the stairs on each depth; #20 is Varmathrax (end of Act I),
// #40 is Zarakhel (end of Act II = the final win). FINAL_DEPTH is the run's end.
const BOSS_DEFS = [
  // ── Act I ── floors 1-20
  {name:"Gnarltooth, the Rat King",  glyph:"R", col:"#d98a5a"},
  {name:"Vharr, Goblin Warlord",     glyph:"G", col:"#7bc96f"},
  {name:"Bonecrusher the Ogre",      glyph:"O", col:"#c9b48a"},
  {name:"The Pale Widow",            glyph:"W", col:"#b07de0"},
  {name:"Grimfang, Alpha of Wolves", glyph:"W", col:"#9aa7b5"},
  {name:"The Hollow Knight",         glyph:"K", col:"#9ad0ff"},
  {name:"Emberlich",                 glyph:"L", col:"#ff8a5a"},
  {name:"The Maw",                   glyph:"M", col:"#e0524a"},
  {name:"Stoneheart Golem",          glyph:"G", col:"#b0b0b8"},
  {name:"Sythiss, Venomlord",        glyph:"S", col:"#7bc96f"},
  {name:"Wraith of the Deep",        glyph:"V", col:"#a0d8ff"},
  {name:"Skarn the Executioner",     glyph:"X", col:"#e0524a"},
  {name:"The Devourer",              glyph:"D", col:"#c77dff"},
  {name:"Frostbite Revenant",        glyph:"R", col:"#9ad0ff"},
  {name:"Infernal Brute",            glyph:"B", col:"#ff7a3a"},
  {name:"The Faceless",              glyph:"F", col:"#c0c0c0"},
  {name:"Doomhorn the Minotaur",     glyph:"H", col:"#d97a3a"},
  {name:"The Nightmother",           glyph:"N", col:"#b07de0"},
  {name:"Warden of the Gate",        glyph:"W", col:"#ffd866"},
  {name:"Varmathrax, the Ancient Wyrm", glyph:"D", col:"#e0524a"},   // Act I climax (no longer the run's end)
  // ── Act II ── floors 21-40 (Designer Claude). Final = Zarakhel.
  {name:"Vexa, the Drowned Prophet", glyph:"V", col:"#6fd3ff"},
  {name:"Korrun the Tidebreaker",    glyph:"K", col:"#3a7a9a"},
  {name:"Yshara, Reef-Mother",       glyph:"Y", col:"#7bc96f"},
  {name:"Helgrim, Ashfather",        glyph:"H", col:"#d97a3a"},
  {name:"Ozmael, the Cinder Maw",    glyph:"O", col:"#ff8a5a"},
  {name:"Drust, Glass Tyrant",       glyph:"D", col:"#d4dce6"},
  {name:"Sarn-Khalid, the Pale Lich",glyph:"S", col:"#c77dff"},
  {name:"Mossfather Bairgh",         glyph:"B", col:"#7bc96f"},
  {name:"Nyssa, the Spore Witch",    glyph:"N", col:"#b4e090"},
  {name:"The Verdant King",          glyph:"V", col:"#3a6b22"},
  {name:"Throk-Drazh, Twin-Headed",  glyph:"T", col:"#a04818"},
  {name:"Vaelin, Brass Sovereign",   glyph:"V", col:"#e8b75c"},
  {name:"Mura, the Star-Weaver",     glyph:"M", col:"#c77dff"},
  {name:"Iskvar, Pale Flame",        glyph:"I", col:"#a8e8ff"},
  {name:"Khaazum the Stonebound",    glyph:"K", col:"#8a6020"},
  {name:"The Marrow Princess",       glyph:"M", col:"#d6c6a8"},
  {name:"Volthus, Sky-Sundered",     glyph:"V", col:"#e8c0ff"},
  {name:"Erevhal, the Crowned Worm", glyph:"E", col:"#ffd866"},
  {name:"The Hollow Choir",          glyph:"H", col:"#d4dce6"},
  {name:"Zarakhel, the Unborn Sun",  glyph:"Z", col:"#c77dff"},        // ★ FINAL ★
];
function makeBoss(floor, sd){
  if(sd===undefined) sd=floor;                        // back-compat for tests
  const def=BOSS_DEFS[Math.min(floor,FINAL_DEPTH)-1];
  const isFinal = floor>=FINAL_DEPTH;                 // Zarakhel: only true win condition
  const isAct1End = floor===ACT1_END;                 // Varmathrax: stays "dragon-tier" tough
  // Bosses scaling stat-wise. Varmathrax + Zarakhel use the heavy formula (hp 620 base);
  // every other boss uses the normal climbing curve. Act I bosses get a gentle bump
  // (1.08->1.085 hp, 1.07->1.075 atk) — v0.15.x's softening had melted them too much.
  // Act II bosses keep the gentler curve since they felt right.
  const heavy = isFinal || isAct1End;
  const act1 = sd <= ACT1_END;             // act-band gate (uses scaled depth so NG+ tracks)
  const hpBase  = act1 ? 1.085 : 1.08;
  const atkBase = act1 ? 1.075 : 1.07;
  const hp = heavy
    ? Math.round(620 * Math.pow(hpBase,  sd - ACT1_END))
    : Math.round(55  * Math.pow(hpBase,  sd - 1));
  const atk = heavy
    ? Math.round(32  * Math.pow(atkBase, sd - ACT1_END))
    : Math.round(7   * Math.pow(atkBase, sd - 1));
  const b={glyph:def.glyph,col:def.col,name:def.name,boss:true,final:isFinal,act1End:isAct1End,
          maxhp:hp,hp,atk:atk,
          def:Math.round(2+sd*0.45),
          regen:Math.max(2,Math.round(sd*0.45)),
          xp:Math.round(hp*1.1),evade:heavy?0.06:0.05,alive:true};
  // The Pale Widow (floor 4) and Emberlich (floor 7) attack from range
  if(floor===4||floor===7){ b.ranged=true; b.range=6; }
  return b;
}

// ---------- merchant ----------
const MERCH_COL="#ffd866";

// ---------- state ----------
// All mutable run-state now lives on the shared G object (see src/state.js).
const scaledDepth = () => G.depth + G.ngPlus*FINAL_DEPTH;

const $ = id => document.getElementById(id);
const cv = $("game"), ctx = cv.getContext("2d");

// crisp canvas with devicePixelRatio
function sizeCanvas(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  cv.width  = VIEW_W*CELL*dpr;
  cv.height = VIEW_H*CELL*dpr;
  cv.style.aspectRatio = (VIEW_W*CELL)+" / "+(VIEW_H*CELL);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
sizeCanvas();
window.addEventListener("resize", ()=>{ sizeCanvas(); if(G.started) render(); });

// stamp the build version into the UI
$("verTag").textContent = `build ${BUILD}`;
(function(){
  const ov=$("overText");
  if(ov) ov.innerHTML += `<br><span style="color:#5f5849;font-size:11px">build ${BUILD} · ${BUILD_DATE}</span>`;
})();

// ---------- map generation ----------
function carve(r){ for(let y=r.y1;y<=r.y2;y++) for(let x=r.x1;x<=r.x2;x++) G.map[y][x]=T_FLOOR; }
function hTun(x1,x2,y){ for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++) G.map[y][x]=T_FLOOR; }
function vTun(y1,y2,x){ for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++) G.map[y][x]=T_FLOOR; }
const intersects=(a,b)=>a.x1<=b.x2&&a.x2>=b.x1&&a.y1<=b.y2&&a.y2>=b.y1;

// snapshot the current level so we can return to it exactly as we left it
function saveLevel(){
  if(G.depth==null) return;
  G.levels[G.depth]={
    map:G.map, explored:G.explored, feats:G.feats, upX:G.upX, upY:G.upY,
    stairX:G.player.stairX, stairY:G.player.stairY,
    ents: G.ents.filter(e=>!e.isPlayer),
    items:G.items, bossEnt:G.bossEnt, merchant:G.merchant, chests:G.chests,
  };
}

// generate or restore a level. dir: 'down' | 'up' | 'new'
function genLevel(dir){
  if(dir==="down"||dir==="up"){ /* current level already saved by caller */ }

  const cached=G.levels[G.depth];
  if(cached){
    G.map=cached.map; G.explored=cached.explored; G.feats=cached.feats;
    G.visible=Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
    G.ents=[G.player]; for(const e of cached.ents) G.ents.push(e);
    G.items=cached.items; G.bossEnt=cached.bossEnt; G.merchant=cached.merchant; G.chests=cached.chests||[];
    G.player.stairX=cached.stairX; G.player.stairY=cached.stairY;
    G.upX=cached.upX; G.upY=cached.upY;
    // drop the player onto the stairway they arrived through
    if(dir==="up"){ G.player.x=G.player.stairX; G.player.y=G.player.stairY; }       // came from below → land on down-stairs
    else if(dir==="down"){ G.player.x=G.upX; G.player.y=G.upY; }                    // came from above → land on up-stairs
    return;
  }

  G.map      = Array.from({length:MAP_H},()=>Array(MAP_W).fill(T_WALL));
  G.visible  = Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
  G.explored = Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
  G.feats    = Array.from({length:MAP_H},()=>Array(MAP_W).fill(null));
  G.items=[]; G.ents=[]; G.merchant=null; G.bossEnt=null; G.chests=[];

  const rooms=[]; let tries=80;
  while(tries-->0 && rooms.length<15){
    const w=ri(5,11), h=ri(3,6);
    const x=ri(1,MAP_W-w-2), y=ri(1,MAP_H-h-2);
    const r={x1:x,y1:y,x2:x+w,y2:y+h, cx:()=>((x)+(x+w))>>1, cy:()=>((y)+(y+h))>>1};
    if(rooms.some(o=>intersects(r,o))) continue;
    carve(r);
    if(rooms.length){
      const p=rooms[rooms.length-1];
      if(ri(0,1)){ hTun(p.cx(),r.cx(),p.cy()); vTun(p.cy(),r.cy(),r.cx()); }
      else       { vTun(p.cy(),r.cy(),p.cx()); hTun(p.cx(),r.cx(),r.cy()); }
    }
    rooms.push(r);
  }

  G.ents.push(G.player);   // index 0

  const first=rooms[0], last=rooms[rooms.length-1];

  // up-stairs only on the *first 10 floors of each act*: depths 2..10 (Act I) and 22..30 (Act II).
  // The bottom half of each act is one-way down; same rule applied symmetrically across both acts.
  const upAllowed = (G.depth>1 && G.depth<=10) || (G.depth>=22 && G.depth<=30);
  if(upAllowed){
    G.upX=first.cx(); G.upY=first.cy(); G.map[G.upY][G.upX]=T_STAIRS_UP;
  } else { G.upX=-1; G.upY=-1; }

  // down-stairs in the last room (none on the absolute final depth — Zarakhel's floor).
  // Varmathrax's floor (Act I end, depth 20) now spawns stairs: descent continues into Act II.
  if(G.depth<FINAL_DEPTH){
    G.player.stairX=last.cx(); G.player.stairY=last.cy(); G.map[G.player.stairY][G.player.stairX]=T_STAIRS;
  } else { G.player.stairX=-1; G.player.stairY=-1; }

  // where the player stands on arrival
  if(dir==="up"){ G.player.x=G.player.stairX; G.player.y=G.player.stairY; }   // arriving from below
  else { G.player.x=first.cx(); G.player.y=first.cy(); }                 // fresh start / arriving from above

  const isMerchantFloor = G.depth%MERCHANT_EVERY===0 && G.depth<FINAL_DEPTH;

  // monsters — orcs are rare in the first few floors, common deeper.
  // Per-room count rises with depth but is capped so deep floors aren't swarms.
  for(let i=1;i<rooms.length;i++){
    if(isMerchantFloor && i===rooms.length-1) continue;   // keep the shop room safe
    const n=ri(0, Math.min(5, 2+(G.depth/6|0)));
    for(let k=0;k<n;k++){
      const x=ri(rooms[i].x1,rooms[i].x2), y=ri(rooms[i].y1,rooms[i].y2);
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if(x===G.upX&&y===G.upY) continue;
      G.ents.push(makeMonster(scaledDepth(), x, y));
    }
  }

  // ~15% chance for one Elite monster on the floor (not on the merchant floor)
  if(!isMerchantFloor && rooms.length>1 && ri(1,100)<=15){
    for(let attempt=0; attempt<20; attempt++){
      const room=rooms[ri(1,rooms.length-1)];
      const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
      if(G.map[y][x]!==T_FLOOR) continue;
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if((x===G.upX&&y===G.upY)||(x===G.player.stairX&&y===G.player.stairY)||(x===G.player.x&&y===G.player.y)) continue;
      G.ents.push(makeElite(scaledDepth(), x, y));
      break;
    }
  }

  // stage boss guards the down-stairs room (not on the safe merchant floor's final room edge case—still spawns, just away from shop)
  placeBoss(G.depth, last);

  // a merchant in a guaranteed-safe room every few floors
  if(isMerchantFloor){
    const room = rooms.length>2 ? rooms[rooms.length-2] : last;
    placeMerchant(room);
  }

  // floor loot — many rooms have nothing; at most one item each
  for(let i=1;i<rooms.length;i++){
    if(ri(1,100)>55) continue;        // 45% of rooms have a drop
    const x=ri(rooms[i].x1,rooms[i].x2), y=ri(rooms[i].y1,rooms[i].y2);
    if(x===G.upX&&y===G.upY) continue;
    G.items.push(rollLoot(x,y,G.depth));
  }

  // chests: 0-1 per floor (occasionally 2 deep), ~12% are mimics.
  const nChests = ri(0,1) + (G.depth>8 && ri(0,1) ? 1 : 0);
  for(let c=0;c<nChests;c++){
    const room=rooms[ri(1,rooms.length-1)];
    const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
    if((x===G.upX&&y===G.upY)||(x===G.player.stairX&&y===G.player.stairY)) continue;
    if(x===G.player.x&&y===G.player.y) continue;
    if(G.chests.some(ch=>ch.x===x&&ch.y===y)) continue;
    G.chests.push({x,y,mimic: ri(1,100)<=12, opened:false});
  }

  // scatter blocking decorations for this biome (bones / boulders / braziers)
  const biome=biomeFor(G.depth);
  if(biome.features.length){
    const want=ri(6,14);
    for(let n=0;n<want;n++){
      const room=rooms[ri(0,rooms.length-1)];
      const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
      if(G.map[y][x]!==T_FLOOR) continue;
      if(G.feats[y][x]) continue;
      if(x===G.player.x&&y===G.player.y) continue;
      if(x===G.player.stairX&&y===G.player.stairY) continue;
      if(x===G.upX&&y===G.upY) continue;
      if((G.merchant&&x===G.merchant.x&&y===G.merchant.y)) continue;
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if(G.chests.some(c=>c.x===x&&c.y===y)) continue;
      if(G.items.some(it=>it.x===x&&it.y===y)) continue;
      G.feats[y][x]=biome.features[ri(0,biome.features.length-1)];
    }
  }
}

// monster factory with depth-scaled rarity (orcs/trolls scarce early)
// Elite monsters: a buffed variant with one player-style skill. ~15%/floor.
const ELITE_SKILLS = [
  {id:"vampiric", name:"Vampiric", apply(m,d){ m.eliteLeech=Math.max(2,Math.round(m.atk*0.4)); }},   // heals when it hits you
  {id:"swift",    name:"Swift",    apply(m,d){ m.evade=Math.min(0.5,(m.evade||0)+0.18); m.acc=(m.acc||0)+0.15; }},
  {id:"venomous", name:"Venomous", apply(m,d){ m.eliteStatus={type:"poison",turns:3,amount:Math.max(2,Math.round(d*0.4))}; }},
  {id:"brutal",   name:"Brutal",   apply(m,d){ m.eliteCrit=0.30; }},   // 30% chance to hit twice
  {id:"armored",  name:"Armored",  apply(m,d){ m.def+=Math.round(2+m.def*0.35); }},
];
function makeElite(d,x,y){
  const m=makeMonster(d,x,y);
  // ≥50% stronger across the board
  m.maxhp=Math.round(m.maxhp*1.8); m.hp=m.maxhp;
  m.atk=Math.round(m.atk*1.6);
  m.xp=Math.round(m.xp*2.2);
  m.elite=true;
  const sk=ELITE_SKILLS[ri(0,ELITE_SKILLS.length-1)];
  m.eliteSkill=sk.id; m.eliteName=sk.name; sk.apply(m,d);
  m.name="elite "+m.name;
  m.col="#ffd866";          // gold-tinted so it stands out
  return m;
}
function makeMonster(d,x,y){
  // Act I monster weights — unchanged on Act I floors (1-20). On Act II floors they're
  // *suppressed* down to ~15% of normal so the new biome monsters dominate the pool.
  // Multiplier of 0.15 applied below after the per-biome gate is decided.
  let wRat    = Math.max(6, 50 - d*4);
  let wGob    = 30;
  let wArcher = d<=2 ? 6 : Math.min(34, 8 + (d-2)*4);   // ranged: goblin archer (more common)
  let wOrc    = d<=3 ? 4 : Math.min(40, 6 + (d-3)*5);
  let wTroll  = d<=4 ? 1 : Math.min(28, (d-4)*3);
  let wMage   = d<=4 ? 0 : Math.min(24, (d-4)*4);        // ranged: dark mage (sooner + more)

  // Act II monster weights — biome-gated so each new biome feels distinct.
  // The biome is selected by the unscaled floor number (depth), NOT by `d` —
  // because in NG+ the scaled depth climbs into the 40s+ but you're still in the
  // Halls/Crypt/etc. on early floors. This keeps NG+ Act I floors playing like Act I.
  const biome = biomeFor(G.depth);
  const inAct2 = G.depth > ACT1_END;
  const inReliquary = biome && biome.id==="reliquary";
  const inAshen     = biome && biome.id==="ashen";
  const inVerdant   = biome && biome.id==="verdant";
  const inCitadel   = biome && biome.id==="citadel";

  // Suppress Act I monsters heavily on Act II floors — they should be a rarity, not the bulk.
  if(inAct2){
    const k = 0.15;
    wRat=Math.round(wRat*k); wGob=Math.round(wGob*k);
    wArcher=Math.round(wArcher*k); wOrc=Math.round(wOrc*k);
    wTroll=Math.round(wTroll*k); wMage=Math.round(wMage*k);
  }

  // Act II weights — bumped to fill the gap left by suppressed Act I weights.
  const wWraith    = (inReliquary || inCitadel)             ? 40 : 0;
  const wHound     = (inAshen     || inVerdant)             ? 44 : 0;
  const wSpitter   = (inVerdant   || inReliquary)           ? 36 : 0;   // ranged + poison-on-hit
  const wHusk      = (inAshen     || inCitadel)             ? 34 : 0;
  const wCinder    = (inAshen     || inCitadel)             ? 38 : 0;
  const wBrine     = (inReliquary)                          ? 40 : 0;
  const wBoneKn    = (inCitadel   || inAshen)               ? 30 : 0;   // mini-elite tier

  const total=wRat+wGob+wArcher+wOrc+wTroll+wMage
             +wWraith+wHound+wSpitter+wHusk+wCinder+wBrine+wBoneKn;
  let r=ri(1,total), m;
  if((r-=wRat)<=0)         m={glyph:"r",col:COL.rat,   name:"rat",          maxhp:4, atk:2,def:0,xp:3, evade:0.15};
  else if((r-=wGob)<=0)    m={glyph:"g",col:COL.goblin,name:"goblin",       maxhp:8, atk:3,def:1,xp:6, evade:0.08};
  else if((r-=wArcher)<=0) m={glyph:"a",col:COL.archer,name:"goblin archer",maxhp:6, atk:4,def:0,xp:9, evade:0.10, ranged:true, range:5};
  else if((r-=wOrc)<=0)    m={glyph:"o",col:COL.orc,   name:"orc",          maxhp:14,atk:5,def:2,xp:12,evade:0.04, regen:1};
  else if((r-=wTroll)<=0)  m={glyph:"T",col:COL.troll, name:"troll",        maxhp:24,atk:8,def:3,xp:25,evade:0,    regen:2};
  else if((r-=wMage)<=0)   m={glyph:"m",col:COL.mage,  name:"dark mage",    maxhp:12,atk:7,def:1,xp:20,evade:0.06, ranged:true, range:6, regen:1};
  // Act II — same combat code; new sprites + tuned stats. No new behaviour flags except
  // acid spitter's poison-on-hit (uses the same eliteStatus path the Venomous elite uses).
  else if((r-=wWraith)<=0)  m={glyph:"w",col:"#a8e8ff", name:"wraith",          maxhp:14,atk:6, def:0,xp:18,evade:0.22};
  else if((r-=wHound)<=0)   m={glyph:"h",col:"#e0524a", name:"carrion hound",    maxhp:8, atk:5, def:0,xp:8, evade:0.10};
  else if((r-=wSpitter)<=0) m={glyph:"s",col:"#7bc96f", name:"acid spitter",   maxhp:10,atk:5, def:1,xp:13,evade:0.05, ranged:true, range:4, eliteStatus:{type:"poison",turns:3,amount:2}};
  else if((r-=wHusk)<=0)    m={glyph:"G",col:"#d4dce6", name:"glass husk",   maxhp:16,atk:7, def:5,xp:20,evade:0.02};
  else if((r-=wCinder)<=0)  m={glyph:"c",col:"#ff8a5a", name:"cinderling",    maxhp:7, atk:5, def:0,xp:11,evade:0.08};
  else if((r-=wBrine)<=0)   m={glyph:"b",col:"#6fd3ff", name:"brine stalker",    maxhp:22,atk:8, def:2,xp:22,evade:0,    regen:1};
  else                      m={glyph:"B",col:"#d4dce6", name:"bone knight",   maxhp:30,atk:9, def:4,xp:28,evade:0.04};

  // depth scaling: COMPOUND growth so monsters keep pace with the player's
  // multiplicative power (gear tiers × merges × perks × charms × crit).
  // Tuned for the full 40-floor descent (was steeper when the run ended at 20).
  if(d>1){
    const hpMul  = Math.pow(1.06, d-1);    // ~+6%/floor compounding (≈9.7x at d40)
    const atkMul = Math.pow(1.05, d-1);    // ~+5%/floor compounding (≈6.7x at d40)
    m.maxhp = Math.round(m.maxhp*hpMul);
    m.atk   = Math.round(m.atk*atkMul);
    m.def  += Math.floor((d-1)/3);         // +1 defense every 3 floors (was every 2)
    m.xp    = Math.round(m.xp*Math.pow(1.12,d-1));
    if(m.regen) m.regen += Math.floor((d-1)/4);
  }
  m.x=x; m.y=y; m.hp=m.maxhp; m.alive=true;
  return m;
}

function placeMerchant(room){
  G.merchant={x:room.cx(), y:room.cy(), glyph:"M", col:MERCH_COL};
  // make sure no monster shares the merchant's tile
  G.ents=G.ents.filter(e=>e.isPlayer || !(e.x===G.merchant.x&&e.y===G.merchant.y));
  log("A merchant has set up a stall on this floor (M). Step beside them to trade.","gold");
}

function placeBoss(d,room){
  const boss=makeBoss(d, scaledDepth());
  const spots=[];
  for(let y=room.y1;y<=room.y2;y++) for(let x=room.x1;x<=room.x2;x++){
    if(G.map[y][x]!==T_FLOOR) continue;
    if(x===G.player.stairX&&y===G.player.stairY) continue;
    if(x===G.upX&&y===G.upY) continue;
    if(x===G.player.x&&y===G.player.y) continue;
    if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
    spots.push([x,y]);
  }
  const s = spots.length ? spots[ri(0,spots.length-1)] : [room.cx(),room.cy()];
  boss.x=s[0]; boss.y=s[1];
  G.ents.push(boss); G.bossEnt=boss;
  log(boss.final  ? `${boss.name} rears up — there is no way down. Slay it.`
   : boss.act1End ? `${boss.name} coils above the descent. The wyrm guards the way down.`
                  : `${boss.name} lurks near the stairs.`, "bad");
}

// ---------- FOV (Bresenham line of sight) ----------
const inB=(x,y)=>x>=0&&x<MAP_W&&y>=0&&y<MAP_H;
function los(x1,y1,x2,y2){
  let dx=Math.abs(x2-x1),dy=Math.abs(y2-y1),sx=x1<x2?1:-1,sy=y1<y2?1:-1,err=dx-dy,x=x1,y=y1;
  while(true){
    if(x===x2&&y===y2) return true;
    if(!(x===x1&&y===y1)&&G.map[y][x]===T_WALL) return false;
    const e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
}
function computeFOV(){
  for(let y=0;y<MAP_H;y++) G.visible[y].fill(false);
  const px=G.player.x,py=G.player.y, R=G.player.sight||FOV_R;
  for(let y=Math.max(0,py-R);y<=Math.min(MAP_H-1,py+R);y++)
    for(let x=Math.max(0,px-R);x<=Math.min(MAP_W-1,px+R);x++){
      const dx=x-px,dy=y-py; if(dx*dx+dy*dy>R*R) continue;
      if(los(px,py,x,y)){ G.visible[y][x]=true; G.explored[y][x]=true; }
    }
}

// ---------- combat ----------
function monsterAt(x,y){ for(let i=1;i<G.ents.length;i++){const e=G.ents[i]; if(e.alive&&e.x===x&&e.y===y) return e;} return null; }

// ---------- player actions ----------
const blocked=(x,y)=>!inB(x,y)||G.map[y][x]===T_WALL||(G.feats&&G.feats[y][x]);

function playerMove(dx,dy){
  const nx=G.player.x+dx, ny=G.player.y+dy;
  if(G.merchant && nx===G.merchant.x && ny===G.merchant.y){ openShop(); return false; }
  const ch=G.chests.find(c=>!c.opened && c.x===nx && c.y===ny);
  if(ch){ return openChest(ch); }
  if(blocked(nx,ny)) return false;
  const m=monsterAt(nx,ny);
  if(m){ attack(G.player,m); return true; }
  G.player.x=nx; G.player.y=ny; return true;
}

// open a chest: either loot spills out, or a mimic springs and attacks
function openChest(ch){
  ch.opened=true;
  if(ch.mimic){
    const m=makeMonster(scaledDepth(), ch.x, ch.y);
    m.name="mimic"; m.glyph="M"; m.col=COL.mimic;
    m.maxhp=Math.round(m.maxhp*2.4); m.hp=m.maxhp; m.atk=Math.round(m.atk*1.6); m.def+=2;
    m.mimic=true;
    G.chests=G.chests.filter(c=>c!==ch);
    G.ents.push(m);
    log("The chest lunges — it's a mimic!","bad");
    attack(m,G.player,false);   // ambush: a free bite the instant it springs
    return true;              // springing the trap costs a turn (monster acts too)
  }
  const loot=chestLoot(G.depth);
  for(const it of loot){ it.x=ch.x; it.y=ch.y; G.items.push(it); }
  G.chests=G.chests.filter(c=>c!==ch);
  log(`You pry open the chest — ${loot.length} item${loot.length>1?"s":""} inside! Step on them to grab.`,"gold");
  return false;  // opening a real chest is free
}

function pickup(){
  for(const it of G.items){
    if(it.x!==G.player.x||it.y!==G.player.y) continue;
    if(it.kind==="potion"){ G.potions++; log("You pocket a potion.","gold"); }
    else if(it.kind==="gold"){ G.gold+=it.value; G.score+=it.value; log(`You scoop up ${it.value} gold.`,"gold"); }
    else {                                   // gear or charm
      const copy=Object.assign({},it); delete copy.x; delete copy.y;
      G.inv.push(copy);
      log(`You pick up a ${gearName(it)}.`,it.legendary?"gold":undefined);
      autoEquip();    // fill any empty slot (won't override your choices)
      tryMerge();     // fuse spare duplicates (never equipped/legendary)
      autoEquip();    // backfill if a merge emptied a slot
    }
    G.items.splice(G.items.indexOf(it),1);
    return true;
  }
  log("Nothing on the ground here.");
  return false; // free action (no monster turn)
}

function quaff(){
  if(G.potions<=0){ log("You have no potions."); return false; }
  const heal=12+(G.player.potionBonus||0);
  G.player.hp=Math.min(G.player.maxhp,G.player.hp+heal);
  G.potions--; log(`You drink a potion. (+${heal} HP)`,"good");
  return true;
}

function equipIndex(i){
  if(i<0||i>=G.inv.length) return false;
  const it=G.inv[i];
  if(!isEquippable(it)) return false;
  G.equipped[it.kind]=it;     // 'charm' is a valid slot
  reconcileCharmHp();
  log(`You equip the ${gearName(it)}.`,"good");
  // first manual equip turns OFF auto-equip so it stops overriding your choices
  if(G.autoEquipOn){
    G.autoEquipOn=false;
    if(!G.autoEquipWarned){
      autoEquializeWarn();
      G.autoEquipWarned=true;
    } else log("Auto-equip disabled.","bad");
  }
  return false; // equipping is free
}
function autoEquializeWarn(){
  log("⚠ Manual equip — auto-equip is now OFF so it won't override you.","bad");
  log("Toggle it back on with the [auto] button by the Pack.","bad");
}
function descend(){
  if(G.map[G.player.y][G.player.x]!==T_STAIRS){ log("No stairs down beneath your feet."); return false; }
  saveLevel();
  G.depth++;
  // Reaching a brand-new depth rewards +2 max HP and a small heal. Re-descending a floor
  // you've already been to (after climbing back up) gives nothing — no HP farming.
  if(scaledDepth() > G.maxDepthReached){
    G.maxDepthReached = scaledDepth();
    G.player.maxhp+=2; G.player.hp=Math.min(G.player.maxhp,G.player.hp+6);
  }
  // Once you cross into Act II the hero sprite gains its scars + gear permanently
  // (carries through NG+ because the hero is the same character).
  if(G.depth > ACT1_END) G.player.everAct2 = true;
  G.score+=25;
  log(`You climb down into depth ${G.depth}.`,"gold");
  genLevel("down"); computeFOV();
  MUSIC.play(musicTrackForDepth(G.depth));   // switches if the biome changed; otherwise no-op
  return false;
}

function ascend(){
  if(G.map[G.player.y][G.player.x]!==T_STAIRS_UP){ log("No stairs up beneath your feet."); return false; }
  if(G.depth<=1){ log("This is the top floor — only the surface lies above."); return false; }
  saveLevel();
  G.depth--;
  log(`You climb back up to depth ${G.depth}.`,"gold");
  genLevel("up"); computeFOV();
  MUSIC.play(musicTrackForDepth(G.depth));
  return false;
}

// ---------- monster AI ----------
function monstersTurn(){
  G.shots=[];
  for(let i=1;i<G.ents.length;i++){
    const m=G.ents[i]; if(!m.alive) continue;
    // status effects tick first; damage-over-time can finish a monster off
    if(tickStatus(m) || m.hp<=0){
      m.alive=false;
      log(`The ${m.name} succumbs.`,"good");
      G.score+=m.maxhp*2; gainXp(m.xp);
      if(Math.random()<0.30){ const drop=rollLoot(m.x,m.y,G.depth); if(drop){ drop.x=m.x; drop.y=m.y; G.items.push(drop);} }
      continue;
    }
    const dx=G.player.x-m.x, dy=G.player.y-m.y;
    const adj=Math.abs(dx)<=1&&Math.abs(dy)<=1;
    const dist=Math.max(Math.abs(dx),Math.abs(dy));
    const sees=G.visible[m.y][m.x];

    // self-healing foes mend a little each turn — but NOT while burning/bleeding/poisoned.
    // Bosses are different: they only regenerate once they've lost sight of you (de-aggroed),
    // so you can't out-stalemate a boss that heals while you trade blows.
    if(m.regen && m.hp<m.maxhp && !m._dotThisTurn){
      if(!m.boss || !sees) m.hp=Math.min(m.maxhp, m.hp+m.regen);
    }

    // ranged attacker: it can see you and you're in range (not adjacent).
    // Fires only one turn in two — the off-turn is spent reloading (it may reposition below).
    if(m.ranged && sees && !adj && dist<=m.range && los(m.x,m.y,G.player.x,G.player.y)){
      if(m._reloading){
        m._reloading=false;            // finished reloading; will be free to shoot next turn
        // fall through to the repositioning logic so it isn't a totally wasted turn
      } else {
        traceShot(m.x,m.y,G.player.x,G.player.y,COL.shot);
        attack(m,G.player,true);
        m._reloading=true;             // must reload before the next shot
        continue;
      }
    }
    if(adj){ attack(m,G.player); continue; }
    if(!sees){
      if(ri(0,2)===0){
        const wx=m.x+ri(-1,1), wy=m.y+ri(-1,1);
        if(!blocked(wx,wy)&&!monsterAt(wx,wy)&&!occupied(wx,wy)&&!(wx===G.player.x&&wy===G.player.y)){ m.x=wx; m.y=wy; }
      }
      continue;
    }
    // ranged units keep a little distance: if adjacent-ish they back off, else close in a bit
    let sx=Math.sign(dx), sy=Math.sign(dy);
    if(m.ranged && dist<=2){ sx=-sx; sy=-sy; }   // step away to keep shooting
    if(!blocked(m.x+sx,m.y+sy)&&!monsterAt(m.x+sx,m.y+sy)&&!occupied(m.x+sx,m.y+sy)){ m.x+=sx; m.y+=sy; }
    else if(sx&&!blocked(m.x+sx,m.y)&&!monsterAt(m.x+sx,m.y)&&!occupied(m.x+sx,m.y)) m.x+=sx;
    else if(sy&&!blocked(m.x,m.y+sy)&&!monsterAt(m.x,m.y+sy)&&!occupied(m.x,m.y+sy)) m.y+=sy;
  }
}
// don't let monsters stand on the merchant
function occupied(x,y){ return G.merchant && G.merchant.x===x && G.merchant.y===y; }
// record the tiles a projectile crosses, for a one-frame visual
function traceShot(x1,y1,x2,y2,col){
  let dx=Math.abs(x2-x1),dy=Math.abs(y2-y1),sx=x1<x2?1:-1,sy=y1<y2?1:-1,err=dx-dy,x=x1,y=y1;
  while(!(x===x2&&y===y2)){
    const e2=2*err; if(e2>-dy){err-=dy;x+=sx;} if(e2<dx){err+=dx;y+=sy;}
    if(!(x===x2&&y===y2)) G.shots.push({x,y,col});
  }
}

// ---------- render ----------
// camX/camY now live on G (see src/state.js).
// resolve an item to a sprite id
function itemSpriteId(it){
  if(it.kind==="potion") return "potion";
  if(it.kind==="gold")   return "gold";
  if(it.kind==="weapon") return "weapon";
  if(it.kind==="armor")  return "armor";
  if(it.kind==="helmet") return "helm";
  if(it.kind==="shield") return "shield";
  if(it.kind==="charm")  return "charm";
  return null;
}
// monster name -> sprite id (bosses mapped individually, rest fall back to ASCII)
const MONSTER_SPRITE = {
  // Act I commons
  "rat":"rat", "goblin":"goblin", "goblin archer":"archer", "orc":"orc",
  "troll":"troll", "dark mage":"mage", "mimic":"mimic",
  // Act II commons (sprites loaded; gated by biome in makeMonster)
  "wraith":"wraith", "carrion hound":"hound", "acid spitter":"spitter",
  "glass husk":"glasshusk", "cinderling":"cinderling", "brine stalker":"brine",
  "bone knight":"boneknight",
};
const BOSS_SPRITE = {   // all 40 bosses have art
  // ── Act I ── 1-20
  "Gnarltooth, the Rat King":"boss_ratking",
  "Vharr, Goblin Warlord":"boss_warlord",
  "Bonecrusher the Ogre":"boss_ogre",
  "The Pale Widow":"boss_widow",
  "Grimfang, Alpha of Wolves":"boss_wolf",
  "The Hollow Knight":"boss_hollow",
  "Emberlich":"boss_emberlich",
  "The Maw":"boss_maw",
  "Stoneheart Golem":"boss_golem",
  "Sythiss, Venomlord":"boss_sythiss",
  "Wraith of the Deep":"boss_wraith",
  "Skarn the Executioner":"boss_skarn",
  "The Devourer":"boss_devourer",
  "Frostbite Revenant":"boss_frost",
  "Infernal Brute":"boss_brute",
  "The Faceless":"boss_faceless",
  "Doomhorn the Minotaur":"boss_minotaur",
  "The Nightmother":"boss_nightmother",
  "Warden of the Gate":"boss_warden",
  "Varmathrax, the Ancient Wyrm":"boss_dragon",
  // ── Act II ── 21-40, ending on Zarakhel
  "Vexa, the Drowned Prophet":"boss_vexa",
  "Korrun the Tidebreaker":"boss_korrun",
  "Yshara, Reef-Mother":"boss_yshara",
  "Helgrim, Ashfather":"boss_helgrim",
  "Ozmael, the Cinder Maw":"boss_ozmael",
  "Drust, Glass Tyrant":"boss_drust",
  "Sarn-Khalid, the Pale Lich":"boss_sarn",
  "Mossfather Bairgh":"boss_bairgh",
  "Nyssa, the Spore Witch":"boss_nyssa",
  "The Verdant King":"boss_verdant",
  "Throk-Drazh, Twin-Headed":"boss_throk",
  "Vaelin, Brass Sovereign":"boss_vaelin",
  "Mura, the Star-Weaver":"boss_mura",
  "Iskvar, Pale Flame":"boss_iskvar",
  "Khaazum the Stonebound":"boss_khaazum",
  "The Marrow Princess":"boss_marrow",
  "Volthus, Sky-Sundered":"boss_volthus",
  "Erevhal, the Crowned Worm":"boss_erevhal",
  "The Hollow Choir":"boss_hollowchoir",
  "Zarakhel, the Unborn Sun":"boss_zarakhel",
};
// Act I monster name -> the revamped (Designer Claude v2) sprite id.
// Used only as a render-time swap on Act II floors. Stats / behaviour unchanged.
const MONSTER_V2_SPRITE = {
  "rat":"rat_v2", "goblin":"goblin_v2", "goblin archer":"archer_v2",
  "orc":"orc_v2", "troll":"troll_v2", "dark mage":"mage_v2", "mimic":"mimic_v2",
};

function entSpriteId(m){
  if(m.boss) return BOSS_SPRITE[m.name]||null;   // null -> ASCII fallback for the other 16
  const base = m.elite ? m.name.replace(/^elite /,"") : m.name;   // strip elite prefix
  // On Act II floors, swap Act I commons to their v2 art (scars, war-paint, etc).
  // The base monster object is unchanged — purely a render swap.
  if(G.depth > ACT1_END && MONSTER_V2_SPRITE[base]) return MONSTER_V2_SPRITE[base];
  return MONSTER_SPRITE[base]||null;
}
// float a small status icon above an afflicted entity (graphics mode only)
function drawStatusIcon(ent){
  if(!ent.status||!ent.status.length) return;
  const sx=ent.x-G.camX, sy=ent.y-G.camY;
  if(sx<0||sx>=VIEW_W||sy<0||sy>=VIEW_H) return;
  const s=ent.status[GFX.frame % ent.status.length];   // cycle through if several
  if(!SPRITE_LINES[s.type]) return;
  const px=CELL, half=Math.round(CELL*0.5);
  const cnv=spriteCanvas(s.type, half, 0);
  if(cnv){ ctx.imageSmoothingEnabled=false; ctx.drawImage(cnv, sx*CELL+CELL-half, sy*CELL, half, half); }
}
function glyph(wx,wy,ch,color,glow,spriteId,dim){
  const sx=wx-G.camX, sy=wy-G.camY;
  if(sx<0||sx>=VIEW_W||sy<0||sy>=VIEW_H) return;   // outside the camera window
  // graphics mode: draw the pixel sprite if one exists for this id
  if(GFX.on && spriteId && SPRITE_LINES[spriteId]){
    const px=CELL*2;                                // bake at 2× for crispness, draw to CELL
    const bob=(GFX.frame===1 && SPRITE_ANIM[spriteId]) ? 1 : 0;
    const cnv=spriteCanvas(spriteId, px, bob);
    if(cnv){
      ctx.save();
      if(dim) ctx.globalAlpha=0.45;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(cnv, sx*CELL, sy*CELL, CELL, CELL);
      ctx.restore();
      return;
    }
  }
  // ASCII fallback
  ctx.save();
  if(glow){ ctx.shadowColor=color; ctx.shadowBlur=10; }
  ctx.fillStyle=color;
  ctx.fillText(ch, sx*CELL+CELL/2, sy*CELL+CELL/2+1);
  ctx.restore();
}
function render(){
  // camera follows the player, clamped so it never shows past the map edges
  G.camX = Math.max(0, Math.min(MAP_W-VIEW_W, G.player.x - (VIEW_W>>1)));
  G.camY = Math.max(0, Math.min(MAP_H-VIEW_H, G.player.y - (VIEW_H>>1)));

  ctx.fillStyle="#050406";
  ctx.fillRect(0,0,VIEW_W*CELL,VIEW_H*CELL);
  ctx.font=`${FONT}px "JetBrains Mono", monospace`;
  ctx.textAlign="center"; ctx.textBaseline="middle";

  const bm=biomeFor(G.depth);
  for(let sy=0;sy<VIEW_H;sy++) for(let sx=0;sx<VIEW_W;sx++){
    const x=G.camX+sx, y=G.camY+sy;
    const vis=G.visible[y][x], exp=G.explored[y][x];
    if(!vis&&!exp) continue;
    const dim=!vis;
    const t=G.map[y][x];
    if(t===T_WALL)            glyph(x,y,"#", vis?COL.wall:COL.wallDim, false, bm.wall, dim);
    else if(t===T_STAIRS)     glyph(x,y,">", vis?COL.stairs:COL.wallDim, vis, bm.stairsDown, dim);
    else if(t===T_STAIRS_UP)  glyph(x,y,"<", vis?COL.stairsUp:COL.wallDim, vis, bm.stairsUp, dim);
    else                      glyph(x,y,"·", vis?COL.floor:COL.floorDim, false, bm.floor, dim);
    // blocking decoration on top of a floor tile
    if(G.feats && G.feats[y][x]){
      const fid=G.feats[y][x];
      const fch = fid==="c_bones"?"%": fid==="k_rocks"?"*": fid==="k_shroom"?"♣": fid==="h_brazier"?"¡":"#";
      glyph(x,y,fch, vis?"#a89878":"#3a352e", false, fid, dim);
    }
  }
  if(G.merchant && G.visible[G.merchant.y][G.merchant.x]) glyph(G.merchant.x,G.merchant.y,"M",COL.merchant,true,"merchant");
  for(const ch of G.chests){ if(!ch.opened && G.visible[ch.y][ch.x]) glyph(ch.x,ch.y,"=",COL.chest,true,"chest"); }
  for(const it of G.items){ if(G.visible[it.y][it.x]) glyph(it.x,it.y,it.glyph,it.col,true,itemSpriteId(it)); }
  for(let i=1;i<G.ents.length;i++){ const m=G.ents[i]; if(m.alive&&G.visible[m.y][m.x]){
    glyph(m.x,m.y,m.glyph,m.col,true,entSpriteId(m));
    if(GFX.on) drawStatusIcon(m);
  } }
  for(const s of G.shots){ if(G.visible[s.y]&&G.visible[s.y][s.x]) glyph(s.x,s.y,"•",s.col,true,"arrow"); }
  // Player art: v2 (geared) once you've ever set foot in Act II; original cyan @ otherwise.
  // Once swapped, stays swapped — even after NG+ resets you back to Act I.
  const playerSpr = (G.player && G.player.everAct2) ? "player_v2" : "player";
  glyph(G.player.x,G.player.y,"@",COL.player,true,playerSpr);
  if(GFX.on) drawStatusIcon(G.player);

  drawMinimap();
  updateBossBar();
  updateUI();
}

// compact line-based minimap in the bottom-left of the view (explored tiles only)
function drawMinimap(){
  const cell=2, pad=6;                          // 2px per tile
  const w=MAP_W*cell, h=MAP_H*cell;
  const ox=pad, oy=VIEW_H*CELL - h - pad;       // bottom-left
  ctx.save();
  // backing panel
  ctx.globalAlpha=0.82; ctx.fillStyle="#0a0a0c"; ctx.fillRect(ox-3,oy-3,w+6,h+6);
  ctx.globalAlpha=1; ctx.strokeStyle="rgba(232,183,92,.35)"; ctx.lineWidth=1;
  ctx.strokeRect(ox-3.5,oy-3.5,w+7,h+7);
  for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
    if(!G.explored[y][x]) continue;
    const t=G.map[y][x]; let c=null;
    if(t===T_WALL)            c="#3a352e";
    else if(t===T_STAIRS)     c="#f0e6c0";
    else if(t===T_STAIRS_UP)  c="#8fd6a0";
    else                      c="#15130f";       // floor: faint
    if(!c) continue;
    ctx.fillStyle=c; ctx.fillRect(ox+x*cell, oy+y*cell, cell, cell);
  }
  // merchant + chests (only if discovered) as small markers
  if(G.merchant && G.explored[G.merchant.y][G.merchant.x]){ ctx.fillStyle=COL.merchant; ctx.fillRect(ox+G.merchant.x*cell, oy+G.merchant.y*cell, cell, cell); }
  for(const ch of G.chests){ if(!ch.opened && G.explored[ch.y][ch.x]){ ctx.fillStyle=COL.chest; ctx.fillRect(ox+ch.x*cell, oy+ch.y*cell, cell, cell); } }
  // boss marker if seen
  if(G.bossEnt && G.bossEnt.alive && G.explored[G.bossEnt.y][G.bossEnt.x]){ ctx.fillStyle="#c0413a"; ctx.fillRect(ox+G.bossEnt.x*cell-1, oy+G.bossEnt.y*cell-1, cell+2, cell+2); }
  // player — bright, slightly larger
  ctx.fillStyle=COL.player;
  ctx.fillRect(ox+G.player.x*cell-1, oy+G.player.y*cell-1, cell+2, cell+2);
  ctx.restore();
}

function updateBossBar(){
  const bb=$("bossBar");
  if(G.bossEnt && G.bossEnt.alive && G.visible[G.bossEnt.y] && G.visible[G.bossEnt.y][G.bossEnt.x]){
    bb.classList.remove("hidden");
    $("bossName").textContent=G.bossEnt.name;
    $("bossHpFill").style.width=Math.max(0,100*G.bossEnt.hp/G.bossEnt.maxhp)+"%";
  } else bb.classList.add("hidden");
}

function updateUI(){
  $("hpTxt").textContent=`${Math.max(0,G.player.hp)}/${G.player.maxhp}`;
  $("hpFill").style.width=Math.max(0,100*G.player.hp/G.player.maxhp)+"%";
  $("lvlTxt").textContent=G.player.level;
  $("xpFill").style.width=(100*G.player.xp/G.player.xpNext)+"%";
  const dlabel = G.ngPlus>0 ? `Extra Depth ${G.ngPlus}-${G.depth}` : `${G.depth}`;
  $("depthTxt").textContent=dlabel+(G.depth>=FINAL_DEPTH?" (final)":"");
  $("depthTag").textContent = (function(){
    const act = G.depth<=ACT1_END ? "I" : "II";
    const b = biomeFor(G.depth);
    const ngLabel = G.ngPlus>0 ? ` · NG+${G.ngPlus}` : "";
    return `— ACT ${act} · ${b.name} · depth ${G.depth}${ngLabel} —`;
  })();
  $("atkTxt").textContent=effAtk()+(G.equipped.weapon?` (${G.player.baseAtk}+${gearBonus(G.equipped.weapon)})`:"");
  $("defTxt").textContent=effDef();
  $("goldTxt").textContent=G.gold;
  $("scoreTxt").textContent=G.score;
  $("wepTxt").textContent=G.equipped.weapon?gearName(G.equipped.weapon):"bare fists";
  $("armTxt").textContent=G.equipped.armor?gearName(G.equipped.armor):"none";
  $("helmTxt").textContent=G.equipped.helmet?gearName(G.equipped.helmet):"none";
  $("shldTxt").textContent=G.equipped.shield?gearName(G.equipped.shield):"none";
  $("charmTxt").textContent=G.equipped.charm?G.equipped.charm.name:"none";
  $("potTxt").textContent=G.potions+(G.potions===1?" potion":" potions");

  const isEq = it => ALL_SLOTS.some(s=>G.equipped[s]===it);
  const ul=$("inv");
  if(G.inv.length===0){ ul.innerHTML='<li class="empty">empty</li>'; }
  else ul.innerHTML=G.inv.map((it,i)=>{
    const eq=isEq(it)?' <span class="eq">[equipped]</span>':"";
    const b=it.kind==="charm" ? "charm" : (it.kind==="weapon"?`+${gearBonus(it)} atk`:`+${gearBonus(it)} def`);
    const cls=it.legendary?"leg":(it.kind==="charm"?"chm":"");
    const nm=cls?`<span class="${cls}">${gearName(it)}</span>`:gearName(it);
    return `<li data-i="${i}"><span class="key">${i+1}</span> ${nm} <span style="color:#5f5849">${b}</span>${eq}</li>`;
  }).join("");

  const ab=$("autoBtn"); if(ab){ ab.textContent="auto: "+(G.autoEquipOn?"on":"off"); ab.className="autobtn"+(G.autoEquipOn?"":" off"); }
  const lg=$("log");
  lg.innerHTML=G.logLines.map(l=>`<div class="${l.cls||""}">${l.text}</div>`).join("");
  lg.scrollTop = lg.scrollHeight;   // stick to the latest line

  // player status conditions banner
  const stEl=$("statusLine");
  if(stEl){
    if(G.player.status&&G.player.status.length){
      stEl.innerHTML=G.player.status.map(s=>`<span style="color:${STATUS[s.type].col}">${STATUS[s.type].name} ${s.turns}</span>`).join(" · ");
      stEl.style.display="block";
    } else stEl.style.display="none";
  }

  const sk=[];
  if(G.player.sight>FOV_R)   sk.push(`Sight ${G.player.sight}`);
  if(G.player.regenAmt>0)    sk.push(`Regen +${G.player.regenAmt}/9 turns`);
  if(G.player.lifesteal>0)   sk.push(`Lifesteal +${G.player.lifesteal}/kill`);
  if(G.player.potionBonus>0) sk.push(`Potions +${G.player.potionBonus} heal`);
  if(G.player.evasion>0)     sk.push(`Dodge +${Math.round(G.player.evasion*100)}%`);
  if(G.player.accBonus>0)    sk.push(`Accuracy +${Math.round(G.player.accBonus*100)}%`);
  if(G.player.critBonus>0)   sk.push(`Crit +${Math.round(G.player.critBonus*100)}%`);
  if(G.player.armorPen>0)    sk.push(`Armor pierce ${G.player.armorPen}`);
  if(G.player.thornsSelf>0)  sk.push(`Spikes ${G.player.thornsSelf}`);
  if(G.player.hitLeech>0)    sk.push(`Lifesteal +${G.player.hitLeech}/hit`);
  // equipped charm effect
  const cd=G.equipped.charm&&charmDef(G.equipped.charm);
  if(cd) sk.push(`<span class="chm">Charm: ${cd.desc}</span>`);
  // gear-granted affixes
  const w=G.equipped.weapon;
  if(w&&w.crit)      sk.push(`<span class="leg">Crit ${Math.round(w.crit*100)}%</span>`);
  if(w&&w.lifesteal) sk.push(`<span class="leg">Weapon lifesteal +${w.lifesteal}</span>`);
  if(w&&w.acc)       sk.push(`<span class="leg">Weapon accuracy +${Math.round(w.acc*100)}%</span>`);
  const ge=gearEvade(), gt=gearThorns(), gr=gearRegen();
  if(ge>0) sk.push(`<span class="leg">Armor dodge +${Math.round(ge*100)}%</span>`);
  if(gt>0) sk.push(`<span class="leg">Thorns ${gt}</span>`);
  if(gr>0) sk.push(`<span class="leg">Armor regen +${gr}/9 turns</span>`);
  $("skills").innerHTML = sk.length ? sk.map(s=>`<div>• ${s}</div>`).join("")
                                    : '<span style="color:#5f5849">none yet</span>';
}

// ---------- turn driver ----------
function turn(actionFn){
  if(!G.running||!G.started||G.choosing||G.shopping) return;   // ignore input while a modal is open
  const tookTurn=actionFn();
  if(!G.running){ render(); return; }              // victory (dragon slain) ended the game
  if(!G.player.alive){ render(); endGame(false); return; }
  if(tookTurn){
    monstersTurn();
    // player status conditions tick (poison/burn/bleed can be lethal)
    if(G.player.alive){
      const died=tickStatus(G.player);
      if(died||G.player.hp<=0){ G.player.alive=false; }
    }
    const totalRegen=G.player.regenAmt+gearRegen();
    if(G.player.alive && totalRegen>0 && !G.player._dotThisTurn && ++G.player.regenTick>=9){
      G.player.regenTick=0;
      if(G.player.hp<G.player.maxhp) G.player.hp=Math.min(G.player.maxhp,G.player.hp+totalRegen);
    }
    computeFOV();
  }
  render();
  if(!G.player.alive){ endGame(false); return; }
  if(G.pendingLevelUps>0) presentLevelUp();          // resolve any earned levels
}

// ---------- level-up perk picker ----------
function presentLevelUp(){
  G.choosing=true;
  const pool=PERKS.slice(); G.currentPerks=[];
  while(G.currentPerks.length<3 && pool.length){
    const tot=pool.reduce((s,p)=>s+(p.w||1),0);
    let r=Math.random()*tot, idx=0;
    for(let j=0;j<pool.length;j++){ r-=(pool[j].w||1); if(r<=0){ idx=j; break; } }
    G.currentPerks.push(pool.splice(idx,1)[0]);
  }
  $("lvlSub").textContent=`Level ${G.player.level} — choose a boon`;
  const box=$("perkBtns"); box.innerHTML="";
  G.currentPerks.forEach((p,i)=>{
    const b=document.createElement("button");
    b.className="perk";
    b.innerHTML=`<span class="pk-key">${i+1}</span><span class="pk-name">${p.name}</span>`+
                `<span class="pk-desc">${p.desc}</span>`;
    b.addEventListener("click",()=>choosePerk(i));
    box.appendChild(b);
  });
  $("levelup").classList.remove("hidden");
}
function choosePerk(i){
  if(!G.choosing) return;
  const p=G.currentPerks[i]; if(!p) return;
  p.apply();
  log(`You gain ${p.name}.`,"good");
  G.pendingLevelUps--;
  G.choosing=false;
  $("levelup").classList.add("hidden");
  computeFOV(); render();
  if(G.pendingLevelUps>0) presentLevelUp();           // chain if several levels at once
}

// ---------- overlays ----------
export function endGame(won){
  G.running=false;
  $("bossBar").classList.add("hidden");
  const o=$("overlay"); o.classList.remove("hidden");
  const t=$("overTitle"); t.textContent=won?"THE SUN GOES OUT":"YOU DIED";
  t.className="big"+(won?" lvl":" dead");
  const where = G.ngPlus>0 ? `extra depth ${G.ngPlus}-${G.depth}` : `depth ${G.depth}`;
  $("overText").innerHTML = won
    ? `You stand over <b style="color:#c77dff">Zarakhel</b> at ${where}, score <b style="color:#e8b75c">${G.score}</b>, ${G.gold} gold.<br>The eclipse breaks. Both acts are conquered — but the dungeon always wakes hungrier.`
    : `You reached <b style="color:#e8b75c">${where}</b> with a score of <b style="color:#e8b75c">${G.score}</b> and ${G.gold} gold.<br>The dungeon resets for the next fool.`;
  $("playBtn").textContent = won ? "START OVER ▾" : "DESCEND AGAIN ▾";
  // show the New Game+ button only on victory
  const ng=$("ngBtn");
  if(ng){
    if(won){ ng.style.display=""; ng.textContent = `ENTER EXTRA DEPTH ${G.ngPlus+1} ▾`; }
    else ng.style.display="none";
  }
  document.querySelector(".legend").style.display="none";
  // Music: triumph on victory (carries into the NG+ screen), silence on death.
  if(won) MUSIC.play('victory'); else MUSIC.stop();
}

// New Game+: keep your character, drop to floor 1, but scaling continues climbing
function startNgPlus(){
  G.ngPlus++;
  G.depth=1; G.potions=Math.max(G.potions,1);
  G.maxDepthReached=Math.max(G.maxDepthReached, scaledDepth());  // keep the descend reward honest across tiers
  G.levels={}; G.upX=-1; G.upY=-1; G.merchant=null; G.shopping=false; G.chests=[];
  G.bossEnt=null; G.choosing=false; G.pendingLevelUps=0; G.currentPerks=[];
  G.player.stairX=-1; G.player.stairY=-1; G.player.status=[];
  G.player.hp=G.player.maxhp;                 // a fresh-floor heal as a small mercy
  resetLegendPool();
  $("levelup").classList.add("hidden");
  $("bossBar").classList.add("hidden");
  $("shop").classList.add("hidden");
  $("overlay").classList.add("hidden");
  genLevel("new"); computeFOV();
  log(`You descend anew into Extra Depth ${G.ngPlus}-1. The dark is far deeper now.`,"gold");
  G.running=true; G.started=true;
  MUSIC.play(musicTrackForDepth(G.depth));   // back to floor 1 music
  render();
}


// ============================================================
//  MUSIC — procedural 30s loops, one per biome + title + victory.
//  Synthesised live with the Web Audio API (no audio assets).
//  Style: simple chiptune / dungeon-synth.
// ============================================================
const MUSIC = (function(){
  let actx=null, masterGain=null;
  let currentTrack=null, currentNodes=[];
  let currentScheduler=null;
  let isOn=true;            // user toggle; default ON
  let volume=0.45;          // 0..1, master
  let pendingTrackId=null;  // queued track to play once audio is unlocked
  let unlocked=false;

  function ensureCtx(){
    if(actx) return actx;
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      actx = new Ctx();
      masterGain = actx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(actx.destination);
    }catch(e){ return null; }
    return actx;
  }

  // Note name -> frequency. n is like "C4","D#5","A3","Eb4".
  // Pre-built table for fast lookup; covers C0..B8.
  const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;
  const SEMI = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function freq(note){
    if(typeof note === 'number') return note;
    const m = NOTE_RE.exec(note);
    if(!m) return 440;
    let s = SEMI[m[1]];
    if(m[2]==='#') s+=1; else if(m[2]==='b') s-=1;
    const oct = parseInt(m[3],10);
    const midi = 12*(oct+1)+s;          // standard MIDI
    return 440 * Math.pow(2,(midi-69)/12);
  }

  // Tiny instrument primitives. Each schedules sound starting at time t (seconds, in actx time)
  // and returns nothing — they self-clean via 'onended' on the source.

  // Plucky lead / chime: short attack, exponential decay, choosable osc type
  function pluck(t, note, dur, type='triangle', vol=0.18, dest){
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq(note);
    // ADSR-ish: 5ms attack, exp decay over dur
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(dest||masterGain);
    o.start(t); o.stop(t+dur+0.05);
  }

  // Pad: slow attack and release, long sustain — for ambient atmospheres
  function pad(t, note, dur, type='sawtooth', vol=0.10, dest){
    const o = actx.createOscillator();
    const o2 = actx.createOscillator();
    const g = actx.createGain();
    o.type = type; o2.type = type;
    o.frequency.value = freq(note);
    o2.frequency.value = freq(note)*1.005;   // gentle detune for thickness
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+Math.min(0.4, dur*0.3));
    g.gain.setValueAtTime(vol, t+dur*0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); o2.connect(g); g.connect(dest||masterGain);
    o.start(t); o2.start(t);
    o.stop(t+dur+0.1); o2.stop(t+dur+0.1);
  }

  // Bass: square wave, soft attack, decaying
  function bass(t, note, dur, vol=0.16, dest){
    const o = actx.createOscillator();
    const g = actx.createGain();
    const lp = actx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=600;
    o.type='square';
    o.frequency.value = freq(note);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(lp); lp.connect(g); g.connect(dest||masterGain);
    o.start(t); o.stop(t+dur+0.05);
  }

  // Noise hit (drum-ish). Short white noise burst.
  function noise(t, dur, freqHz, vol, dest){
    const buf = actx.createBuffer(1, Math.max(1, Math.floor(actx.sampleRate*dur)), actx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    const bp = actx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value=freqHz||1200; bp.Q.value=0.7;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    src.connect(bp); bp.connect(g); g.connect(dest||masterGain);
    src.start(t); src.stop(t+dur+0.02);
  }

  // ── Track scheduler ──────────────────────────────────────────
  // A track is a function (ctxTime, trackGain, beat0, beatsPerSec) => void
  // It schedules ONE loop's worth of notes. We re-invoke it every loop with a
  // fresh start time for sample-accurate looping.

  function startTrack(id){
    if(!ensureCtx()){ pendingTrackId=id; return; }
    if(currentTrack===id) return;
    stopTrack();   // crossfades out the previous one
    currentTrack=id;
    const def = TRACKS[id];
    if(!def){ return; }

    // Per-track sub-gain (allows independent fades during crossfade).
    const tg = actx.createGain();
    tg.gain.setValueAtTime(0.0001, actx.currentTime);
    tg.gain.exponentialRampToValueAtTime(1.0, actx.currentTime+0.8);
    tg.connect(masterGain);
    currentNodes.push(tg);

    const bpm = def.bpm || 100;
    const beatsPerSec = bpm/60;
    const loopBeats = def.loopBeats || 48;
    const loopDur = loopBeats / beatsPerSec;

    let loopStart = actx.currentTime + 0.05;
    const scheduleOne = () => {
      try { def.compose(loopStart, tg, beatsPerSec); } catch(e){ console.warn('track err',e); }
    };
    scheduleOne();
    // schedule the next loop just before this one ends
    const scheduler = setInterval(()=>{
      if(currentTrack!==id){ clearInterval(scheduler); return; }
      // when we're within 200 ms of the end, schedule the next loop
      const ahead = loopStart + loopDur - actx.currentTime;
      if(ahead < 0.5){
        loopStart += loopDur;
        scheduleOne();
      }
    }, 100);
    currentScheduler = scheduler;
  }

  function stopTrack(){
    if(currentScheduler){ clearInterval(currentScheduler); currentScheduler=null; }
    // fade out all per-track gains then disconnect after the fade
    const t = actx ? actx.currentTime : 0;
    for(const n of currentNodes){
      try{
        n.gain.cancelScheduledValues(t);
        const v = Math.max(0.0001, n.gain.value);
        n.gain.setValueAtTime(v, t);
        n.gain.exponentialRampToValueAtTime(0.0001, t+0.8);
        setTimeout(()=>{ try{ n.disconnect(); }catch(e){} }, 1100);
      }catch(e){}
    }
    currentNodes = [];
    currentTrack = null;
  }

  // ── Public API ────────────────────────────────────────────────
  function unlock(){
    // Browsers require a user gesture before audio plays. Call this from a click/keydown.
    if(unlocked) return;
    ensureCtx();
    if(!actx) return;
    if(actx.state==='suspended'){ actx.resume().catch(()=>{}); }
    unlocked = true;
    if(isOn && pendingTrackId){ startTrack(pendingTrackId); pendingTrackId=null; }
  }
  function setOn(on){
    isOn = !!on;
    if(!isOn){ stopTrack(); }
    else { if(pendingTrackId){ startTrack(pendingTrackId); pendingTrackId=null; } }
  }
  function setVolume(v){
    volume = Math.max(0, Math.min(1, v));
    if(masterGain) masterGain.gain.setTargetAtTime(volume, actx.currentTime, 0.05);
  }
  function play(id){
    // request a track. If audio isn't unlocked yet, remember the request.
    if(!isOn){ pendingTrackId=null; return; }
    if(!unlocked){ pendingTrackId=id; return; }
    startTrack(id);
  }
  function stop(){ stopTrack(); }
  function isMusicOn(){ return isOn; }
  function getVolume(){ return volume; }
  function current(){ return currentTrack; }

  // ── TRACKS — 10 hand-composed 30s loops ──────────────────────
  // Helper for the composers: schedule a note at beat b (1 beat = 1 quarter)
  // using one of pluck/pad/bass/noise.
  const TRACKS = {};

  // Title — slow, somber dungeon march. Minor key. Piano-ish pluck + low bass.
  TRACKS.title = {
    bpm: 78, loopBeats: 40,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Two-bar bass cycle: A2  E2  F2  C3  ×N
      const bassPat = ['A2','A2','E2','E2','F2','F2','C3','C3'];
      for(let i=0;i<5;i++){
        for(let j=0;j<bassPat.length;j++){
          bass(start+(i*8+j)*Q, bassPat[j], Q*1.2, 0.14, dest);
        }
      }
      // Sustained pad on chord roots
      const padPat = ['A3','E4','F3','C4'];
      for(let i=0;i<10;i++){
        pad(start+i*4*Q, padPat[i%4], 4*Q, 'triangle', 0.07, dest);
      }
      // Sparse melody — drifts in for the second half of the loop
      const mel = [
        [16,'A4',2],[18,'C5',2],[20,'B4',1],[21,'A4',3],
        [24,'G4',2],[26,'A4',6],
        [32,'E5',1],[33,'D5',1],[34,'C5',2],[36,'A4',4],
      ];
      for(const [b,n,d] of mel){
        pluck(start+b*Q, n, d*Q, 'triangle', 0.16, dest);
      }
    }
  };

  // Halls (1–5) — cautious, exploratory, mid-tempo minor
  TRACKS.halls = {
    bpm: 96, loopBeats: 48,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Walking bass: A E F G  A E F G ...
      const bassPat = ['A2','E3','F2','G2'];
      for(let i=0;i<12;i++){
        bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.13, dest);
        // light pulse on the 3
        bass(start+(i*4+2)*Q, bassPat[i%4], Q*1, 0.08, dest);
      }
      // Pad chords (one per bar)
      const pads = ['A3','E4','F3','G3'];
      for(let i=0;i<12;i++) pad(start+i*4*Q, pads[i%4], 4*Q, 'sawtooth', 0.05, dest);
      // Melody — call-and-response across the loop
      const mel = [
        [0,'A4',1],[1,'C5',1],[2,'E5',2],[5,'D5',1],[6,'C5',1],[7,'A4',1],
        [8,'B4',1],[9,'C5',1],[10,'E5',2],[12,'A5',2],[14,'G5',2],
        [16,'E5',1],[17,'D5',1],[18,'C5',2],[20,'B4',2],[22,'A4',2],
        // second half — variation
        [24,'A4',1],[25,'C5',1],[26,'E5',2],[28,'F5',1],[29,'E5',1],[30,'D5',2],
        [32,'C5',2],[34,'B4',1],[35,'A4',1],[36,'E4',4],
        [40,'A4',1],[41,'B4',1],[42,'C5',2],[44,'A4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.95, 'triangle', 0.14, dest);
      // soft kick on the 1 of each bar
      for(let i=0;i<12;i++) noise(start+i*4*Q, 0.08, 120, 0.12, dest);
    }
  };

  // Crypt (6–10) — funereal, low pulsing, choir-like pads
  TRACKS.crypt = {
    bpm: 64, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Heavy slow bass drone alternating D/A
      const bassPat = ['D2','D2','A2','A2'];
      for(let i=0;i<8;i++){
        bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.18, dest);
      }
      // Choir-like pads (sine for purity)
      const padPat = [['D3','F3','A3'],['D3','F3','A3'],['C3','E3','G3'],['C3','E3','G3']];
      for(let i=0;i<8;i++){
        for(const n of padPat[i%4]) pad(start+i*4*Q, n, 4*Q, 'sine', 0.06, dest);
      }
      // Funeral bell every 8 beats (high pluck + low octave)
      for(let i=0;i<4;i++){
        pluck(start+i*8*Q, 'F5', 3*Q, 'sine', 0.12, dest);
        pluck(start+i*8*Q, 'F3', 3*Q, 'sine', 0.10, dest);
      }
      // Sparse low melody in the 2nd half
      const mel = [[16,'D4',2],[18,'F4',2],[20,'E4',4],[24,'D4',2],[26,'C4',2],[28,'D4',4]];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q, 'triangle', 0.13, dest);
    }
  };

  // Caverns (11–15) — eerie ambient, scattered drops, dissonant pad
  TRACKS.cavern = {
    bpm: 80, loopBeats: 40,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Drone bass on E
      for(let i=0;i<5;i++) bass(start+i*8*Q, 'E2', 8*Q, 0.12, dest);
      // Wandering pad — minor 2nds for unease
      const padPat = ['E3','F3','A3','B3','G3'];
      for(let i=0;i<10;i++) pad(start+i*4*Q, padPat[i%padPat.length], 4*Q, 'sine', 0.06, dest);
      // Random water-drip plucks (deterministic; same every loop)
      const drips = [[1,'B5'],[3,'A5'],[6,'C6'],[9,'G5'],[12,'B5'],[15,'D6'],
                     [19,'A5'],[22,'F5'],[25,'B5'],[28,'C6'],[31,'G5'],[34,'A5'],[37,'B5']];
      for(const [b,n] of drips) pluck(start+b*Q, n, 0.4, 'sine', 0.10, dest);
      // Occasional low rumble
      for(let i=0;i<5;i++) noise(start+i*8*Q+Q*2, 0.3, 80, 0.10, dest);
    }
  };

  // Infernal (16–20) — driving, dark, building toward Varmathrax
  TRACKS.infernal = {
    bpm: 116, loopBeats: 64,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Driving 8th-note bass
      const bp = ['D2','D2','D2','F2','C2','C2','C2','D2'];
      for(let i=0;i<8;i++){
        for(let j=0;j<8;j++) bass(start+(i*8+j)*Q, bp[j], Q*0.9, 0.13, dest);
      }
      // Power-chord stabs every 2 beats
      const stabs = ['D3','D3','F3','C3'];
      for(let i=0;i<32;i++) pad(start+i*2*Q, stabs[i%4], Q*1.5, 'sawtooth', 0.08, dest);
      // Lead — minor-key descent
      const mel = [
        [0,'A4',2],[2,'F4',2],[4,'D4',2],[6,'C4',2],
        [8,'A4',2],[10,'F4',2],[12,'E4',4],
        [16,'D5',1],[17,'C5',1],[18,'A4',2],[20,'F4',2],[22,'D4',2],
        [24,'A4',2],[26,'F4',2],[28,'D4',4],
        // 2nd half — climb
        [32,'D4',1],[33,'E4',1],[34,'F4',2],[36,'A4',2],[38,'D5',2],
        [40,'F5',2],[42,'E5',2],[44,'D5',4],
        [48,'A4',2],[50,'C5',2],[52,'D5',2],[54,'F5',2],
        [56,'A5',4],[60,'D5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.95, 'sawtooth', 0.13, dest);
      // Kick on every beat 1 and 3
      for(let i=0;i<32;i++) noise(start+i*2*Q, 0.06, 100, 0.14, dest);
    }
  };

  // Reliquary (21–25) — submerged temple, slow swells, watery
  TRACKS.reliquary = {
    bpm: 72, loopBeats: 36,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Deep slow bass swells
      const bassPat = ['C2','G2','A2','F2'];
      for(let i=0;i<9;i++) bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.13, dest);
      // Sustained pad chords (triadic)
      const pads = [['C3','E3','G3'],['G3','B3','D4'],['A3','C4','E4'],['F3','A3','C4']];
      for(let i=0;i<9;i++){
        for(const n of pads[i%4]) pad(start+i*4*Q, n, 4*Q, 'sine', 0.07, dest);
      }
      // High chimes with echoes
      const mel = [
        [0,'C5',3],[4,'E5',3],[8,'G5',3],[12,'A5',3],
        [16,'G5',2],[18,'E5',2],[20,'C5',4],
        [24,'F5',3],[28,'E5',2],[30,'D5',2],[32,'C5',4],
      ];
      for(const [b,n,d] of mel){
        pluck(start+b*Q, n, d*Q, 'sine', 0.13, dest);
        // poor-man's reverb: echo at half-volume one beat later
        pluck(start+(b+1)*Q, n, d*Q*0.8, 'sine', 0.06, dest);
      }
    }
  };

  // Ashen (26–30) — sparse, scorched, melancholy. The old version used noise
  // crackles + low rumble that piled into a hissy, grating texture; this version
  // is a clean tonal piece with a slow lament line and a faint heat-shimmer pad.
  TRACKS.ashen = {
    bpm: 78, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Slow heavy bass: D2 holding, occasional pull to C2 for darkness
      const bassPat = ['D2','D2','C2','D2'];
      for(let i=0;i<8;i++) bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.13, dest);
      // Warm sustained pad — perfect 5ths
      const padRoot = ['D3','D3','C3','D3'];
      const padFifth= ['A3','A3','G3','A3'];
      for(let i=0;i<8;i++){
        pad(start+i*4*Q, padRoot[i%4],  4*Q, 'triangle', 0.06, dest);
        pad(start+i*4*Q, padFifth[i%4], 4*Q, 'triangle', 0.05, dest);
      }
      // Lament lead — slow, sparse, in D minor
      const mel = [
        [0,'D4',4],[4,'F4',3],[7,'E4',1],
        [8,'D4',2],[10,'C4',2],[12,'D4',4],
        [16,'F4',2],[18,'A4',2],[20,'G4',4],
        [24,'F4',2],[26,'E4',2],[28,'D4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.13, dest);
      // Distant low bell every 8 beats — soft, tonal, NOT a noise burst
      for(let i=0;i<4;i++) pluck(start+i*8*Q, 'D3', 3*Q, 'sine', 0.08, dest);
    }
  };

  // Verdant (31–35) — organic, slightly off-kilter, decaying
  TRACKS.verdant = {
    bpm: 92, loopBeats: 48,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Bass in 5/4 against 4/4 melody — gentle polyrhythm for "off-kilter"
      const bassPat = ['G2','G2','D3','C3','F2'];
      for(let i=0;i<12;i++) bass(start+i*4*Q, bassPat[i%5], Q*3.5, 0.13, dest);
      // Woodwind-ish pad
      for(let i=0;i<12;i++){
        const n = ['G3','C4','D4','F4'][i%4];
        pad(start+i*4*Q, n, 4*Q, 'triangle', 0.06, dest);
      }
      // Melody with grace notes
      const mel = [
        [0,'G4',1],[1,'A4',1],[2,'C5',2],[4,'D5',1],[5,'C5',1],[6,'A4',2],
        [8,'G4',2],[10,'F4',2],[12,'G4',4],
        [16,'C5',1],[17,'D5',1],[18,'E5',2],[20,'D5',2],[22,'C5',2],
        [24,'A4',2],[26,'G4',6],
        [32,'D5',1],[33,'C5',1],[34,'A4',2],[36,'G4',1],[37,'F4',1],[38,'D4',2],
        [40,'G4',2],[42,'A4',2],[44,'G4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.12, dest);
      // Soft hat / leaf rustle
      for(let i=0;i<24;i++) noise(start+i*2*Q, 0.04, 6000, 0.04, dest);
    }
  };

  // Citadel (36–40) — cold celestial, arpeggios over deep bass
  TRACKS.citadel = {
    bpm: 104, loopBeats: 64,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Deep void bass — slow
      const bassPat = ['A1','A1','F1','G1'];
      for(let i=0;i<16;i++) bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.16, dest);
      // High arpeggios — sixteenth notes
      const arpPat = ['A4','C5','E5','A5','G5','E5','C5','A4'];
      for(let i=0;i<64;i++){
        pluck(start+i*Q, arpPat[i%8], Q*0.9, 'sine', 0.09, dest);
      }
      // Wide pad chords
      const padChords = [['A3','C4','E4'],['A3','C4','E4'],['F3','A3','C4'],['G3','B3','D4']];
      for(let i=0;i<16;i++){
        for(const n of padChords[i%4]) pad(start+i*4*Q, n, 4*Q, 'sawtooth', 0.05, dest);
      }
      // High eerie lead — distant
      const mel = [
        [8,'E6',4],[12,'D6',4],
        [24,'C6',2],[26,'D6',2],[28,'E6',4],
        [40,'A5',2],[42,'C6',2],[44,'E6',4],
        [56,'D6',2],[58,'C6',2],[60,'A5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'sine', 0.10, dest);
    }
  };

  // Victory — major key triumph, plays after Zarakhel + on NG+ screen
  TRACKS.victory = {
    bpm: 110, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Heroic bass in C major
      const bassPat = ['C2','G2','A2','F2'];
      for(let i=0;i<8;i++) bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.15, dest);
      // Bright sustained chords
      const chords = [['C3','E3','G3'],['G2','B2','D3'],['A2','C3','E3'],['F2','A2','C3']];
      for(let i=0;i<8;i++){
        for(const n of chords[i%4]) pad(start+i*4*Q, n, 4*Q, 'sawtooth', 0.06, dest);
      }
      // Triumphant fanfare lead
      const mel = [
        [0,'G4',1],[1,'C5',1],[2,'E5',2],[4,'G5',2],[6,'E5',2],
        [8,'D5',1],[9,'B4',1],[10,'D5',2],[12,'G5',4],
        [16,'C5',1],[17,'E5',1],[18,'G5',2],[20,'C6',2],[22,'B5',2],
        [24,'A5',1],[25,'G5',1],[26,'E5',2],[28,'C5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.16, dest);
      // Snare-ish hits on 2 and 4
      for(let i=0;i<16;i++) noise(start+(i*2+1)*Q, 0.05, 1800, 0.10, dest);
      // Kick on 1 and 3
      for(let i=0;i<16;i++) noise(start+i*2*Q, 0.06, 100, 0.13, dest);
    }
  };

  return { play, stop, unlock, setOn, setVolume, isMusicOn, getVolume, current,
           // debug tap (audio-rendering verification only; harmless in production)
           _ctx:()=>actx, _master:()=>masterGain };
})();

// Pick the right track for a given depth (called on biome change).
function musicTrackForDepth(d){
  const b = biomeFor(d);
  if(!b) return 'halls';
  return ({halls:'halls',crypt:'crypt',cavern:'cavern',infernal:'infernal',
           reliquary:'reliquary',ashen:'ashen',verdant:'verdant',citadel:'citadel'})[b.id] || 'halls';
}

function newGame(){
  G.depth=1; G.gold=0; G.score=0; G.potions=2; G.ngPlus=0; G.maxDepthReached=1; G.godMode=false;
  G.equipped={weapon:null,armor:null,helmet:null,shield:null,charm:null}; G.inv=[]; G.logLines=[];
  G.choosing=false; G.pendingLevelUps=0; G.currentPerks=[]; G.bossEnt=null;
  G.levels={}; G.upX=-1; G.upY=-1; G.merchant=null; G.shopping=false; G.chests=[];
  G.autoEquipOn=true; G.autoEquipWarned=false;
  resetLegendPool();
  G.player = makePlayer();
  $("levelup").classList.add("hidden");
  $("bossBar").classList.add("hidden");
  $("shop").classList.add("hidden");
  const ng=$("ngBtn"); if(ng) ng.style.display="none";
  genLevel("new"); computeFOV();
  log("You enter the Caves of Qlud. A draft of cold rot greets you.");
  G.running=true; G.started=true;
  $("overlay").classList.add("hidden");
  MUSIC.play(musicTrackForDepth(G.depth));   // floor 1 = Halls
  render();
}

// ---------- merchant shop ----------
function sellPrice(it){
  if(it===null) return 0;
  if(it.kind==="charm") return Math.round((it.value||60)*0.5);
  if(it.legendary) return Math.round(it.value*0.5);
  return 8+gearBonus(it)*4;
}
function buyPrice(it){
  if(it.kind==="potion") return 14+G.depth*2;
  if(it.kind==="charm") return 70+G.depth*4;
  if(it.legendary) return 1000+G.depth*60+gearBonus(it)*15;   // legendaries are a huge investment (1000+)
  return 18+gearBonus(it)*7;       // gear costs more than its resale value
}
const POTION_PRICE = ()=> 14 + G.depth*2;

// stock is rolled once per merchant (stored on the merchant object so it persists)
function rollShopStock(d){
  const stock=[];
  // 1–10 healing potions (each its own buyable entry)
  const nPot=ri(1,10);
  for(let p=0;p<nPot;p++) stock.push({kind:"potion",glyph:"!",col:COL.potion,name:"healing potion",heal:12});
  // a larger selection of gear, with a small charm chance
  const n=ri(6,9);
  for(let k=0;k<n;k++){
    if(ri(1,100)<=8) stock.push(makeCharm());       // ~8% a charm
    else stock.push(makeGear(0,0,d));               // a random tiered gear piece
  }
  // 5% chance the merchant has a legendary for sale
  if(ri(1,100)<=5) stock.push(makeLegendary(d));
  return stock;
}
function openShop(){
  G.shopping=true;
  if(!G.merchant.stock) G.merchant.stock=rollShopStock(G.depth);
  renderShop(); $("shop").classList.remove("hidden");
}
function closeShop(){ G.shopping=false; $("shop").classList.add("hidden"); render(); }
function shopLabel(it){
  if(it.kind==="potion") return "⚗ healing potion";
  if(it.kind==="charm")  return `¤ ${it.name}`;
  if(it.legendary)       return `★ ${gearName(it)} (+${gearBonus(it)})`;
  return `${gearName(it)} (+${gearBonus(it)})`;
}
function renderShop(){
  $("shopGold").textContent=`Gold: ${G.gold}`;
  $("buyList").innerHTML = G.merchant.stock.map((it,i)=>{
    const pr=buyPrice(it), can=G.gold>=pr;
    return `<div class="shopitem ${can?"":"dis"}" data-buy="${i}">
       <span>${shopLabel(it)}</span><span class="pr">${pr}g</span></div>`;
  }).join("") || '<div class="shopempty">sold out</div>';
  if(G.inv.length===0) $("sellList").innerHTML='<div class="shopempty">pack is empty</div>';
  else $("sellList").innerHTML=G.inv.map((it,i)=>
    `<div class="shopitem" data-sell="${i}">
       <span>${gearName(it)}</span><span class="pr">+${sellPrice(it)}g</span></div>`).join("");
}
function buyItem(i){
  const it=G.merchant.stock[i]; if(!it) return;
  const pr=buyPrice(it);
  if(G.gold<pr) return;
  G.gold-=pr;
  if(it.kind==="potion"){ G.potions++; G.merchant.stock.splice(i,1); log(`You buy a potion for ${pr}g.`,"gold"); }
  else {
    const copy=Object.assign({},it); delete copy.x; delete copy.y;
    G.inv.push(copy); G.merchant.stock.splice(i,1);
    log(`You buy the ${gearName(copy)} for ${pr}g.`,"gold");
    autoEquip(); tryMerge(); autoEquip();
  }
  renderShop(); updateUI();
}
function sellItem(i){
  if(i<0||i>=G.inv.length) return;
  const it=G.inv[i], price=sellPrice(it);
  for(const slot of ALL_SLOTS) if(G.equipped[slot]===it) G.equipped[slot]=null;
  G.inv.splice(i,1);
  G.gold+=price; G.score+=Math.round(price/2);
  log(`You sell the ${gearName(it)} for ${price}g.`,"gold");
  autoEquip(); reconcileCharmHp();
  renderShop(); updateUI();
}

// ---------- input ----------
const MOVES={
  ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],
  w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],
  q:[-1,-1],e:[1,-1],z:[-1,1],c:[1,1],
};
window.addEventListener("keydown",e=>{
  // debug: F1 toggles godmode (no health loss). Works any time.
  if(e.key==="F1"){
    e.preventDefault();
    G.godMode=!G.godMode;
    if(typeof log==="function" && G.started) log(G.godMode?"[debug] godmode ON — you take no damage.":"[debug] godmode OFF.","gold");
    const dt=$("godTag"); if(dt) dt.style.display = G.godMode ? "" : "none";
    if(G.started&&G.running) updateUI();
    return;
  }
  if(G.shopping){
    if(e.key==="Escape"||e.key==="Enter"||e.key==="<"){ e.preventDefault(); closeShop(); }
    return;
  }
  if(G.choosing){                                     // perk picker is open
    if(e.key>="1"&&e.key<="3"){ e.preventDefault(); choosePerk(+e.key-1); }
    return;
  }
  if(!G.started||!G.running){
    if(e.key==="Enter"||e.key===" ") { e.preventDefault(); newGame(); }
    return;
  }
  const k=e.key;
  if(MOVES[k]){ e.preventDefault(); turn(()=>playerMove(...MOVES[k])); return; }
  if(k==="."){ turn(()=>true); return; }                 // wait
  if(k==="g"){ turn(pickup); return; }                   // grab
  if(k==="p"){ turn(quaff); return; }                    // quaff potion
  if(k===">"||k==="l"){ turn(descend); return; }         // stairs down
  if(k==="<"||k==="u"){ turn(ascend);  return; }         // stairs up
  if(k>="1"&&k<="9"){ turn(()=>equipIndex(parseInt(k)-1)); return; }
});

// touch / click controls
document.querySelector(".touch").addEventListener("click",e=>{
  if(G.shopping||G.choosing) return;
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.mv){ const[dx,dy]=b.dataset.mv.split(",").map(Number); turn(()=>playerMove(dx,dy)); }
  else if(b.dataset.act){
    const a=b.dataset.act;
    if(a==="wait") turn(()=>true);
    else if(a==="pickup") turn(pickup);
    else if(a==="quaff") turn(quaff);
    else if(a==="descend") turn(descend);
    else if(a==="ascend") turn(ascend);
  }
});
$("inv").addEventListener("click",e=>{
  const li=e.target.closest("li[data-i]"); if(!li) return;
  turn(()=>equipIndex(parseInt(li.dataset.i)));
});
$("autoBtn").addEventListener("click",()=>{
  G.autoEquipOn=!G.autoEquipOn;
  if(G.autoEquipOn){ log("Auto-equip ON — will equip your strongest gear.","good"); autoEquip(); }
  else log("Auto-equip OFF — equip manually.","bad");
  render();
});
$("gfxBtn").addEventListener("click",()=>{
  GFX.on=!GFX.on;
  const b=$("gfxBtn"); b.textContent="gfx: "+(GFX.on?"on":"off"); b.className="autobtn"+(GFX.on?"":" off");
  updateLegendSprites();
  if(G.started) render();
});
// swap the start-screen legend between ASCII letters and tiny sprite tiles
function updateLegendSprites(){
  const leg=$("legend"); if(!leg) return;
  for(const el of leg.querySelectorAll("i[data-spr]")){
    const id=el.dataset.spr;
    if(GFX.on && SPRITE_LINES[id]){
      if(!el.dataset.glyph) el.dataset.glyph=el.textContent;   // remember the letter
      const src=spriteCanvas(id, 16, 0);                       // baked 16×N source
      if(src){
        // dedicated per-entry canvas (never move the shared cached node into the DOM)
        let mini=el.querySelector("canvas");
        if(!mini){ mini=document.createElement("canvas"); el.textContent=""; el.appendChild(mini); }
        mini.width=16; mini.height=16;
        const mc=mini.getContext("2d"); mc.imageSmoothingEnabled=false;
        mc.clearRect(0,0,16,16); mc.drawImage(src,0,0,16,16);
        mini.style.cssText="width:16px;height:16px;display:inline-block;vertical-align:-3px;image-rendering:pixelated";
      }
    } else if(el.dataset.glyph){
      el.textContent=el.dataset.glyph;   // restore the letter (removes the canvas)
    }
  }
}
// idle-bob + status-icon animation: flip frame ~2/sec while in graphics mode
setInterval(()=>{ if(GFX.on && G.started && G.running){ GFX.frame=1-GFX.frame; render(); } }, 520);
$("playBtn").addEventListener("click",newGame);
$("ngBtn").addEventListener("click",startNgPlus);
$("overlay").addEventListener("click",e=>{ if(e.target.id==="overlay") newGame(); });

$("closeShop").addEventListener("click",closeShop);
$("buyList").addEventListener("click",e=>{
  const row=e.target.closest("[data-buy]"); if(!row||row.classList.contains("dis")) return;
  buyItem(parseInt(row.dataset.buy));
});
$("sellList").addEventListener("click",e=>{
  const row=e.target.closest("[data-sell]"); if(!row) return;
  sellItem(parseInt(row.dataset.sell));
});

// ---------- MUSIC wiring ----------
// Queue the title track immediately; it can't actually play until the user
// makes a gesture (browser policy), at which point MUSIC.unlock() kicks it off.
MUSIC.play('title');
function _musicUnlock(){
  MUSIC.unlock();
  // If user hasn't started a game yet, make sure the title track is queued.
  if(!G.started && MUSIC.isMusicOn() && !MUSIC.current()) MUSIC.play('title');
}
window.addEventListener('click',     _musicUnlock, {once:false, passive:true});
window.addEventListener('keydown',   _musicUnlock, {once:false, passive:true});
window.addEventListener('touchstart',_musicUnlock, {once:false, passive:true});

// music toggle
$("musicBtn").addEventListener("click",()=>{
  const on = !MUSIC.isMusicOn();
  MUSIC.setOn(on);
  const b=$("musicBtn");
  b.classList.toggle("on", on);
  b.textContent = "♪ music: "+(on?"on":"off");
  if(on){
    // resume the track for the current context (title if not playing, biome if in-run)
    if(!G.started) MUSIC.play('title');
    else if(G.running) MUSIC.play(musicTrackForDepth(G.depth));
  }
});
// initial visual state for the toggle (default ON)
$("musicBtn").classList.add("on");

// volume slider
$("musicVol").addEventListener("input",e=>{
  MUSIC.setVolume(parseInt(e.target.value,10)/100);
});
