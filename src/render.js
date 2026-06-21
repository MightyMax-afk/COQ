"use strict";
import { G } from './state.js';
import { MAP_W, MAP_H, FOV_R, ACT1_END, FINAL_DEPTH, T_WALL, T_STAIRS, T_STAIRS_UP } from './config.js';
import { PAL, COL } from './palette.js';
import { $ } from './util.js';
import { biomeFor } from './game.js';
import { STATUS } from './combat.js';
import { effAtk, effDef, gearBonus, gearName, gearEvade, gearThorns, gearRegen, charmDef, ALL_SLOTS, dashMax } from './items.js';
// Atlas (sprite id -> pixel art) and the optional PNG-spritesheet override layer
// live in their own DOM-free modules now (so Node tooling can bake a sheet from
// the exact same art). render.js keeps only the canvas/runtime concerns.
import { SPRITE_LINES, SPRITE_ANIM } from './atlas.js';
import { spriteOverride } from './spritesheet.js';

// re-export the atlas so existing importers (game.js) keep working unchanged
export { SPRITE_LINES };

// ---------- view constants ----------
// Visible window + cell metrics. VIEW_W/VIEW_H are RECOMPUTED by sizeCanvas() to
// fit the player's screen (see below), so the map always shows tiles at roughly
// the same on-screen size whether you're on a 720p, 1080p or larger monitor.
// CELL is the canvas BACKING pixels per tile, fixed at 64 = the native sprite
// resolution, so every 64×64 sprite bakes and draws 1:1 with zero downsampling
// (the browser then scales the whole canvas down to the on-screen size). Seeded
// here for the first paint; VIEW_* are refined once layout is known.
let VIEW_W = 22, VIEW_H = 14;     // visible window in tiles; the camera follows the player
const CELL = 64, FONT = 50;       // backing px per tile (= native sprite size)
const TARGET_CELL = 46;           // desired ON-SCREEN px per tile (drives the zoom feel)
const VIEW_ASPECT = 14 / 9;       // keep the map ~14:9 to match the cabinet layout in index.html

// ---------- sprite runtime ----------
export const GFX = { on:true, frame:0, tick:0 };    // graphics mode on by default
// frame: 0/1 toggle driving the legacy 1px idle bob (16×/32× sprites).
// tick:  free-running counter so multi-frame sprites cycle through ALL their
//        frames (e.g. 3-frame creatures), not just 0/1.
const _spriteCache = {};                    // key:`id|bob|px` -> canvas

// A sprite entry is either:
//   lines       — array of string rows (single-frame, classic)
//   frames      — array of frame entries, each itself an array of string rows
// _frameLines() returns the row array for the requested frame.
function _isMultiFrame(s){ return Array.isArray(s) && Array.isArray(s[0]); }
function _frameLines(s, frame){
  if(_isMultiFrame(s)) return s[frame % s.length];
  return s;
}
function _frameCount(s){ return _isMultiFrame(s) ? s.length : 1; }

// render an N×N sprite (N inferred from the art) into an offscreen canvas
// sized px×px (nearest-neighbor). Supports mixed 16×16, 32×32, 64×64 art
// and both single-frame (bob shift) and multi-frame (per-frame pixels) sprites.
function _bakeSprite(lines, px, bob){
  const N=lines.length;
  const scale=Math.max(1, Math.round(px/N));    // integer scale -> uniform square pixels
  const dim=N*scale;
  const c=document.createElement('canvas'); c.width=dim; c.height=dim;
  const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=false;
  for(let y=0;y<N;y++){
    const srcY=y-bob; if(srcY<0||srcY>=N) continue;
    const row=lines[srcY];
    for(let x=0;x<N;x++){ const col=PAL[row[x]]; if(!col) continue;
      ctx.fillStyle=col; ctx.fillRect(x*scale, y*scale, scale, scale); }
  }
  return c;
}
export function spriteCanvas(id, px, bob, frame){
  const sprite=SPRITE_LINES[id]; if(!sprite) return null;
  const multi=_isMultiFrame(sprite);
  // Multi-frame sprites carry their own animation — ignore the legacy 1-px bob.
  const useBob = multi ? 0 : (bob|0);
  const useFrame = multi ? ((frame|0) % sprite.length) : 0;
  // PNG spritesheet override: if a sheet is loaded and supplies this sprite, draw
  // those pixels instead of baking the procedural art. Multi-frame sprites animate
  // via their own frames; single-frame ones keep the idle bob — converted from the
  // sprite's native rows to 64px-cell units so the override wobbles like the art.
  const N=multi ? sprite[0].length : sprite.length;
  const over=spriteOverride(id, useFrame, px, useBob ? Math.round(useBob*64/N) : 0);
  if(over) return over;
  const key=id+'|'+useBob+'|'+px+'|f'+useFrame;
  if(!_spriteCache[key]) _spriteCache[key]=_bakeSprite(_frameLines(sprite, useFrame), px, useBob);
  return _spriteCache[key];
}
// expose helpers for callers that need to size things off the raw art
export function spriteFrameLines(id, frame){
  const s=SPRITE_LINES[id]; if(!s) return null;
  return _frameLines(s, frame|0);
}
export function spriteFrameCount(id){
  const s=SPRITE_LINES[id]; return s ? _frameCount(s) : 0;
}

// ===== end sprite graphics =====

// ---------- canvas ----------
export const cv = $("game"), ctx = cv.getContext("2d");

// crisp canvas with devicePixelRatio + responsive tile count
export function sizeCanvas(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  // How much on-screen width the map gets = its container's content box. The
  // canvas is width:100% of that box, so dividing by TARGET_CELL gives the tile
  // count that lands each tile near TARGET_CELL px tall on THIS screen. Bigger
  // monitors therefore show more of the map at the same comfortable tile size,
  // smaller ones show less — instead of a fixed count that looks tiny or huge.
  const host = cv.parentElement;
  const availW = (host && host.clientWidth) ? host.clientWidth : (VIEW_W*TARGET_CELL);
  VIEW_W = Math.max(12, Math.min(MAP_W, Math.round(availW / TARGET_CELL)));
  VIEW_H = Math.max(8,  Math.min(MAP_H, Math.round(VIEW_W / VIEW_ASPECT)));
  // Backing buffer is VIEW × 64px so sprites render at native res; a small dpr
  // bump keeps it crisp on hi-density screens. CSS (width:100%) scales the whole
  // canvas down to the ~TARGET_CELL on-screen size.
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
    const px=CELL;                                  // CELL=64 = native sprite size → bake 1:1
    const sprite=SPRITE_LINES[spriteId];
    const multi=Array.isArray(sprite) && Array.isArray(sprite[0]);
    const N=multi ? sprite[0].length : sprite.length;          // 16/32/64
    // Multi-frame sprites animate via real frames, not the legacy bob shift.
    const bob=(!multi && GFX.frame===1 && SPRITE_ANIM[spriteId]) ? Math.max(1, Math.round(N/16)) : 0;
    const cnv=spriteCanvas(spriteId, px, bob, GFX.tick);
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
  // Persistent fire tiles (Pyromancer) — drawn before shots so projectiles render on top
  if(G.fireTiles){ for(const f of G.fireTiles){ if(G.visible[f.y]&&G.visible[f.y][f.x]) glyph(f.x,f.y,"▲","#ff6a00",true,"burn"); } }
  for(const s of G.shots){ if(G.visible[s.y]&&G.visible[s.y][s.x]) glyph(s.x,s.y,"•",s.col,true,s.sprite||"arrow"); }
  // Player art: a chosen class shows its own look; otherwise the Wanderer uses
  // v2 (geared) once you've ever set foot in Act II and the original cyan @ before.
  // Once swapped, stays swapped — even after NG+ resets you back to Act I.
  const inAct2 = !!(G.player && G.player.everAct2);
  let playerSpr = inAct2 ? "player_v2" : "player";
  if(G.player && G.player.classId==="knight") playerSpr = inAct2 ? "player_knight_v2" : "player_knight";
  else if(G.player && G.player.classId==="rogue") playerSpr = inAct2 ? "player_rogue_v2" : "player_rogue";
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
