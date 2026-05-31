"use strict";
import { ACT1_END, FINAL_DEPTH, T_WALL, T_STAIRS, T_STAIRS_UP } from './config.js';
import { clamp, ri, log, $ } from './util.js';
import { G } from './state.js';
import { COL } from './palette.js';
import { makeGear, rollLoot, chestLoot, makeCharm, makeLegendary, resetLegendPool, autoEquip, tryMerge, gearBonus, gearName, gearRegen, isEquippable, reconcileCharmHp, ALL_SLOTS } from './items.js';
import { PERKS, gainXp, makePlayer } from './player.js';
import { tickStatus, attack } from './combat.js';
import { makeMonster, monsterAt } from './monsters.js';
import { genLevel, computeFOV, los, saveLevel, inB } from './worlds.js';
import { MUSIC, musicTrackForDepth } from './audio.js';
import { render, updateUI, sizeCanvas, spriteCanvas, GFX, SPRITE_LINES } from './render.js';

// ============================================================
//  BUILD VERSION  —  bump this each time we change something
// ============================================================
const BUILD = "v0.18.0";
const BUILD_DATE = "2026-05-31";
/* CHANGELOG
   v0.18.0 ESCAPE / PAUSE MENU + persistence. New #escMenu overlay opened with
           Esc (desktop) or a "menu" button in the touch controls (mobile), a
           full-viewport modal with a Close Menu button. It houses Save Game
           and Load Game (localStorage key "caves_of_qlud_save") and a confirmed
           New Game, plus the relocated config toggles (graphics/auto-equip/
           music/volume) and a new Sound FX toggle that gates combat strike
           SFX. While the menu is open, movement and turn-taking are blocked.
           Permadeath: dying wipes the save so an old file can't be reloaded;
           victory keeps it (NG+ continues). Note: keep the ?v= query on the
           game.js <script> in index.html in sync with this BUILD so returning
           players fetch fresh code instead of a cached build.
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

// (VIEW_W, VIEW_H, CELL, FONT, SPRITE_LINES, SPRITE_ANIM moved to render.js)

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
export function biomeFor(d){
  const within = ((d-1) % 40);            // 0..39 within a tier
  return BIOMES[Math.min(7, Math.floor(within/5))];
}

// (GFX, _spriteCache, _bakeSprite, spriteCanvas moved to render.js)

// ---------- state ----------
// All mutable run-state now lives on the shared G object (see src/state.js).
export const scaledDepth = () => G.depth + G.ngPlus*FINAL_DEPTH;

// ($, cv, ctx, sizeCanvas moved to render.js / util.js)
sizeCanvas();
window.addEventListener("resize", ()=>{ sizeCanvas(); if(G.started) render(); });

// stamp the build version into the UI
$("verTag").textContent = `build ${BUILD}`;
(function(){
  const ov=$("overText");
  if(ov) ov.innerHTML += `<br><span style="color:#5f5849;font-size:11px">build ${BUILD} · ${BUILD_DATE}</span>`;
})();

// ---------- combat ----------

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

// (render, updateUI, drawMinimap, updateBossBar, entSpriteId, glyph, drawStatusIcon,
//  itemSpriteId, MONSTER_SPRITE, BOSS_SPRITE, MONSTER_V2_SPRITE moved to render.js)

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
  closeEscMenu();
  // Permadeath: a death wipes the save so the player can't reload an old file
  // to escape it. A victory leaves any save intact (NG+ carries on).
  if(!won){ try{ localStorage.removeItem(SAVE_KEY); }catch(err){} }
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
  closeEscMenu();
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

// ---------- escape / pause menu ----------
// One overlay (#escMenu) holds Save / Load / New Game plus all the config
// toggles. It can only be opened during live gameplay (not over the level-up
// or shop modals), and while it's open every gameplay key is swallowed so the
// player can't move or burn a turn while browsing it.
const SAVE_KEY = "caves_of_qlud_save";
const escMenuOpen   = () => { const m=$("escMenu"); return !!m && !m.classList.contains("hidden"); };
const openEscMenu   = () => $("escMenu").classList.remove("hidden");
const closeEscMenu  = () => $("escMenu").classList.add("hidden");
const toggleEscMenu = () => escMenuOpen() ? closeEscMenu() : openEscMenu();

function saveGame(){
  G.shots = [];                                  // transient projectile trails — never persist them
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(G));
    log("Game saved successfully.","gold");
  }catch(err){
    log("Save failed — storage is unavailable.","bad");
  }
  updateUI();        // paint the save confirmation into the log immediately
  closeEscMenu();
}

function loadGame(){
  let raw=null;
  try{ raw = localStorage.getItem(SAVE_KEY); }catch(err){ raw=null; }
  if(!raw){ log("No saved game found.","bad"); updateUI(); return; }
  let data;
  try{ data = JSON.parse(raw); }catch(err){ log("Saved game is corrupt.","bad"); updateUI(); return; }

  // Deep re-assign the saved fields back onto the LIVE G object. Every module
  // imported G by reference, so we mutate it in place rather than swap the
  // pointer — clear its own keys, then copy the parsed snapshot over.
  for(const k of Object.keys(G)) delete G[k];
  Object.assign(G, data);

  // JSON.parse hands back fresh objects, which splits two aliases the engine
  // relies on. Re-link them so the loaded state isn't fragmented:
  //   • the player is always ents[0] (movement/render read G.player directly)
  //   • the boss bar reads G.bossEnt, which must be the live entity in G.ents
  if(Array.isArray(G.ents) && G.ents.length) G.ents[0] = G.player;
  G.bossEnt = (Array.isArray(G.ents) ? G.ents.find(e=>e && e.boss) : null) || null;
  G.shots = [];

  // Rebuild derived/engine state from the restored data.
  computeFOV();                                  // visibility from the loaded position
  MUSIC.play(musicTrackForDepth(G.depth));       // biome track matching the loaded depth
  log(`Game loaded — depth ${G.depth}.`,"gold"); // logged before the redraw so it paints into the log
  render();                                      // recomputes the camera window, redraws, refreshes boss bar
  updateUI();
  closeEscMenu();
}

function menuNewGame(){
  if(!window.confirm("Are you sure? You will lose your current character and all run progression!")) return;
  closeEscMenu();
  newGame();
}

function syncSfxBtn(){
  const b=$("sfxBtn"); if(!b) return;
  const on=MUSIC.isSfxOn();
  b.textContent="⚡ sfx: "+(on?"on":"off");
  b.className="autobtn"+(on?"":" off");
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
  // Escape: toggle the pause menu — only during live gameplay, never over the
  // perk picker or the shop (those own the key themselves below).
  if(e.key==="Escape" && G.started && G.running && !G.choosing && !G.shopping){
    e.preventDefault();
    toggleEscMenu();
    return;
  }
  // While the pause menu is open, swallow every other key so the player can't
  // move or take a turn behind it.
  if(escMenuOpen()){ e.preventDefault(); return; }
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
  if(G.shopping||G.choosing||escMenuOpen()) return;
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.mv){ const[dx,dy]=b.dataset.mv.split(",").map(Number); turn(()=>playerMove(dx,dy)); }
  else if(b.dataset.act){
    const a=b.dataset.act;
    if(a==="wait") turn(()=>true);
    else if(a==="pickup") turn(pickup);
    else if(a==="quaff") turn(quaff);
    else if(a==="descend") turn(descend);
    else if(a==="ascend") turn(ascend);
    else if(a==="menu"){ if(G.started&&G.running) openEscMenu(); }   // mobile: open the pause menu (Esc has no equivalent on touch)
  }
});
$("inv").addEventListener("click",e=>{
  if(escMenuOpen()) return;
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
// (_musicUnlock and its window listeners live in audio.js)
MUSIC.play('title');

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

// ---------- escape-menu button wiring ----------
$("saveBtn").addEventListener("click", saveGame);
$("loadBtn").addEventListener("click", loadGame);
$("menuNewGameBtn").addEventListener("click", menuNewGame);
$("closeEscBtn").addEventListener("click", closeEscMenu);
$("sfxBtn").addEventListener("click",()=>{
  MUSIC.setSfxOn(!MUSIC.isSfxOn());
  syncSfxBtn();
  log(MUSIC.isSfxOn()?"Sound effects ON.":"Sound effects OFF.", MUSIC.isSfxOn()?"good":"bad");
});
syncSfxBtn();   // initial label/state (default ON)
