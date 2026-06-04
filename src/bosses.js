"use strict";
import { G } from './state.js';
import { ri, log } from './util.js';
import { ACT1_END, FINAL_DEPTH, T_FLOOR } from './config.js';
import { scaledDepth } from './game.js';

export const BOSS_DEFS = [
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
export function makeBoss(floor, sd){
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
  // Zarakhel (final) was a ~3,170 HP marathon, eased to ~1,650, then cut a further
  // 20% to ~1,320 at floor 40. Gentler HP growth base + a final-only 0.8 multiplier.
  // Varmathrax (Act-I end) sits at the exponent's base (sd-ACT1_END = 0) so it's
  // untouched, and the 0.8 only applies to the final boss.
  const heavyHpBase = isFinal ? 1.05 : hpBase;
  let hp = heavy
    ? Math.round(620 * Math.pow(heavyHpBase, sd - ACT1_END))
    : Math.round(55  * Math.pow(hpBase,      sd - 1));
  if(isFinal) hp = Math.round(hp * 0.6);   // Zarakhel: -20% HP (per request)
  const atkRaw = heavy
    ? Math.round(32  * Math.pow(atkBase, sd - ACT1_END))
    : Math.round(7   * Math.pow(atkBase, sd - 1));
  // Zarakhel (final) gets -25% attack power on top of the HP cut — still the
  // hardest fight, but no longer a near-one-shot even through good armor.
  // (Was -10%; dropped further per player feedback that he hit too hard.)
  const atk = isFinal ? Math.round(atkRaw*0.75) : atkRaw;
  const b={glyph:def.glyph,col:def.col,name:def.name,boss:true,final:isFinal,act1End:isAct1End,
          maxhp:hp,hp,atk:atk,
          def:Math.round(2+sd*0.45),
          regen:Math.max(2,Math.round(sd*0.45)),
          xp:Math.round(hp*1.1),evade:heavy?0.06:0.05,alive:true};
  // The Pale Widow (floor 4) and Emberlich (floor 7) attack from range
  if(floor===4||floor===7){ b.ranged=true; b.range=6; }
  return b;
}
export function placeBoss(d,room){
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
