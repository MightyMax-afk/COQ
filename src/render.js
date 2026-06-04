"use strict";
import { G } from './state.js';
import { MAP_W, MAP_H, FOV_R, ACT1_END, FINAL_DEPTH, T_WALL, T_STAIRS, T_STAIRS_UP } from './config.js';
import { PAL, COL } from './palette.js';
import { $ } from './util.js';
import * as Tiles from './art/tiles.js';
import * as Creatures from './art/creatures.js';
import * as BossArt from './art/bosses.js';
import * as ItemsFx from './art/items-fx.js';
import { biomeFor } from './game.js';
import { STATUS } from './combat.js';
import { effAtk, effDef, gearBonus, gearName, gearEvade, gearThorns, gearRegen, charmDef, ALL_SLOTS, dashMax } from './items.js';

const ART = { ...Tiles, ...Creatures, ...BossArt, ...ItemsFx };

// ---------- view constants ----------
const VIEW_W = 28, VIEW_H = 18;   // visible window in tiles; the camera follows the player
const CELL = 22, FONT = 19;       // logical pixels per cell (canvas is scaled to fit)

// ============================================================
//  PUBLIC ATLAS  — grouped for layout
// ============================================================

// flat sprite lookup: id -> 16-row lines array
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
  player:ART.SP_PLAYER, player_v2:ART.SP_PLAYER_V2, player_knight:ART.SP_PLAYER_KNIGHT, player_rogue:ART.SP_PLAYER_ROGUE,
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
  potion:ART.SP_POTION, gold:ART.SP_GOLD, weapon:ART.SP_WEAPON, weapon_knight:ART.SP_WEAPON_KNIGHT, weapon_rogue:ART.SP_WEAPON_ROGUE, armor:ART.SP_ARMOR, helm:ART.SP_HELM, shield:ART.SP_SHIELD, charm:ART.SP_CHARM,
  arrow:ART.SP_ARROW,
  poison:ART.SP_POISON, burn:ART.SP_BURN, bleed:ART.SP_BLEED, regen:ART.SP_REGEN, weaken:ART.SP_WEAKEN,
};

// Class floor-drop tints: recolor the generic armor/helm/shield drops to match
// the player's class (same maps as the inventory gear tints in sprites.js).
const GEAR_TINT = {
  kn: { n:'3', B:'3', b:'4', '6':'3', '7':'4', e:'5', S:'3', t:'4', T:'5' },
  rg: { '3':'k', '4':'S', '5':'t', S:'k', t:'S', T:'t', L:'H', W:'G', Y:'g', y:'g', i:'H', I:'j', Z:'j', b:'B', e:'b', '7':'6' },
};
const _recolor = (lines, map) => lines.map(row => row.replace(/./g, ch => map[ch] || ch));
for(const [base, src] of [["armor",ART.SP_ARMOR],["helm",ART.SP_HELM],["shield",ART.SP_SHIELD]]){
  SPRITE_LINES[`${base}_kn`] = _recolor(src, GEAR_TINT.kn);
  SPRITE_LINES[`${base}_rg`] = _recolor(src, GEAR_TINT.rg);
}

// which sprites have the idle bob
const SPRITE_ANIM = {
  player:1, player_v2:1, player_knight:1, player_rogue:1, rat:1, goblin:1, archer:1, orc:1, troll:1, mage:1, mimic:1, merchant:1,
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

// ---------- sprite runtime ----------
export const GFX = { on:true, frame:0 };           // graphics mode on by default
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
export function spriteCanvas(id, px, bob){
  const lines=SPRITE_LINES[id]; if(!lines) return null;
  const key=id+'|'+bob+'|'+px;
  if(!_spriteCache[key]) _spriteCache[key]=_bakeSprite(lines, px, bob);
  return _spriteCache[key];
}

// ===== end sprite graphics =====

// ---------- canvas ----------
export const cv = $("game"), ctx = cv.getContext("2d");

// crisp canvas with devicePixelRatio
export function sizeCanvas(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  cv.width  = VIEW_W*CELL*dpr;
  cv.height = VIEW_H*CELL*dpr;
  cv.style.aspectRatio = (VIEW_W*CELL)+" / "+(VIEW_H*CELL);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

// ---------- render helpers ----------
// resolve an item to a sprite id
function itemSpriteId(it){
  if(it.kind==="potion") return "potion";
  if(it.kind==="gold")   return "gold";
  const gc = (!it.legendary && G.player) ? (G.player.classId==="knight"?"_kn":G.player.classId==="rogue"?"_rg":"") : "";
  if(it.kind==="weapon"){
    if(!it.legendary&&G.player&&G.player.classId==="knight") return "weapon_knight";
    if(!it.legendary&&G.player&&G.player.classId==="rogue")  return "weapon_rogue";
    return "weapon";
  }
  if(it.kind==="armor")  return "armor"+gc;
  if(it.kind==="helmet") return "helm"+gc;
  if(it.kind==="shield") return "shield"+gc;
  if(it.kind==="boots")  return "armor"+gc;   // reuse armor sprite until a dedicated boot sprite exists
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

export function entSpriteId(m){
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
export function render(){
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
  for(const s of G.shots){ if(G.visible[s.y]&&G.visible[s.y][s.x]) glyph(s.x,s.y,"•",s.col,true,s.sprite||"arrow"); }
  // Player art: a chosen class shows its own look; otherwise the Wanderer uses
  // v2 (geared) once you've ever set foot in Act II and the original cyan @ before.
  // Once swapped, stays swapped — even after NG+ resets you back to Act I.
  let playerSpr = (G.player && G.player.everAct2) ? "player_v2" : "player";
  if(G.player && G.player.classId==="knight") playerSpr="player_knight";
  else if(G.player && G.player.classId==="rogue") playerSpr="player_rogue";
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

export function updateUI(){
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
  $("wepTxt").textContent=G.equipped.weapon?`${gearName(G.equipped.weapon)} (+${gearBonus(G.equipped.weapon)} atk)`:"bare fists";
  $("armTxt").textContent=G.equipped.armor?`${gearName(G.equipped.armor)} (+${gearBonus(G.equipped.armor)} def)`:"none";
  $("helmTxt").textContent=G.equipped.helmet?`${gearName(G.equipped.helmet)} (+${gearBonus(G.equipped.helmet)} def)`:"none";
  $("shldTxt").textContent=G.equipped.shield?`${gearName(G.equipped.shield)} (+${gearBonus(G.equipped.shield)} def)`:"none";
  $("bootsTxt").textContent=G.equipped.boots?`${gearName(G.equipped.boots)} (+${gearBonus(G.equipped.boots)} def)`:"none";
  $("charmTxt").textContent=G.equipped.charm?`${G.equipped.charm.name}${charmDef(G.equipped.charm)?` — ${charmDef(G.equipped.charm).desc}`:""}`:"none";
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
  // Stick to the latest line only if the player is already near the bottom. If
  // they've scrolled up to read history, leave their position alone instead of
  // yanking them back down on the next render. The threshold is ~2 lines so the
  // smooth-scroll animation (scroll-behavior:smooth) settling between renders
  // still reads as "at bottom".
  const atBottom = lg.scrollHeight - lg.clientHeight - lg.scrollTop <= 40;
  lg.innerHTML=G.logLines.map(l=>`<div class="${l.cls||""}">${l.text}</div>`).join("");
  if(atBottom) lg.scrollTop = lg.scrollHeight;

  // player status conditions banner
  const stEl=$("statusLine");
  if(stEl){
    if(G.player.status&&G.player.status.length){
      stEl.innerHTML=G.player.status.map(s=>`<span style="color:${STATUS[s.type].col}">${STATUS[s.type].name} ${s.turns}</span>`).join(" · ");
      stEl.style.display="block";
    } else stEl.style.display="none";
  }

  const sk=[];
  if(G.player.className && G.player.className!=="Wanderer") sk.push(`Class: ${G.player.className}`);
  const dMax=dashMax();
  if(dMax>0) sk.push(`Dash ${G.player.dashCharges}/${dMax}${G.player.dashCharges<dMax?" (recharging)":""}`);
  if(G.player.sight>FOV_R)   sk.push(`Sight ${G.player.sight}`);
  if(G.player.regenAmt>0)    sk.push(`Regen +${G.player.regenAmt}/9 turns`);
  if(G.player.lifesteal>0)   sk.push(`Lifesteal +${G.player.lifesteal}/kill`);
  if(G.player.potionBonus>0) sk.push(`Potions +${G.player.potionBonus} heal`);
  if(G.player.evasion>0)     sk.push(`Dodge +${Math.round(G.player.evasion*100)}%`);
  if(G.player.accBonus>0)    sk.push(`Accuracy +${Math.round(G.player.accBonus*100)}%`);
  if(G.player.critBonus>0)   sk.push(`Crit +${Math.round(G.player.critBonus*100)}%`);
  if(G.player.armorPen>0)    sk.push(`Sunder (ignore ${G.player.armorPen} enemy defense)`);
  if(G.player.thornsSelf>0)  sk.push(`Spikes ${G.player.thornsSelf}`);
  if(G.player.hitLeech>0)    sk.push(`Lifesteal +${G.player.hitLeech}/hit`);
  // boolean Act II perks — these used to be applied silently with no UI, so the
  // player couldn't tell they had them (e.g. Deflect's +20% dodge vs ranged).
  if(G.player.giantSlayer>0) sk.push(`Giant Slayer (+${Math.round(G.player.giantSlayer*100)}% target max HP dmg)`);
  if(G.player.secondWind)    sk.push("Second Wind (under 25% HP: +5 atk, +15% dodge)");
  if(G.player.searingBlades>0) sk.push(`Searing Blades (${Math.round(G.player.searingBlades*100)}% melee burn)`);
  if(G.player.antidote)      sk.push("Antidote (incoming poison/burn/bleed −2 turns)");
  if(G.player.deflect>0)     sk.push(`Deflect (+${Math.round(G.player.deflect*100)}% dodge vs ranged)`);
  if(G.player.closeQuarters>0) sk.push(`Close Quarters (+${G.player.closeQuarters} def vs 2+ adjacent foes)`);
  if(G.player.luckyFind>0)   sk.push(`Lucky Find (+${Math.round(G.player.luckyFind*100)}% drop chance)`);
  if(G.player.scavenger)     sk.push("Scavenger (+25% gold, 20% gear +1 enchant)");
  if(G.player.catalyst)      sk.push("Catalyst (equipped charm stats doubled)");
  if(G.player.retribution)   sk.push("Retribution (dodged melee → your def as dmg)");
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
