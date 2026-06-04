"use strict";
import { G } from './state.js';
import { ri } from './util.js';
import { COL } from './palette.js';
import { ACT1_END } from './config.js';
import { biomeFor } from './game.js';

export const ELITE_SKILLS = [
  {id:"vampiric", name:"Vampiric", apply(m,d){ m.eliteLeech=Math.max(2,Math.round(m.atk*0.4)); }},   // heals when it hits you
  {id:"swift",    name:"Swift",    apply(m,d){ m.evade=Math.min(0.5,(m.evade||0)+0.18); m.acc=(m.acc||0)+0.15; }},
  {id:"venomous", name:"Venomous", apply(m,d){ m.eliteStatus={type:"poison",turns:3,amount:Math.max(2,Math.round(d*0.4))}; }},
  {id:"brutal",   name:"Brutal",   apply(m,d){ m.eliteCrit=0.30; }},   // 30% chance to hit twice
  {id:"armored",  name:"Armored",  apply(m,d){ m.def+=Math.round(2+m.def*0.35); }},
];
export function makeElite(d,x,y){
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
export function makeMonster(d,x,y){
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
    // XP tracks the monster's actual strength (scales with its HP), NOT a separate
    // steep depth curve. The old 1.12^(d-1) curve outran every stat — at NG+ scaled
    // depths it ballooned XP ~93x by d40, causing runaway leveling. Tying it to hpMul
    // keeps XP proportional to how tough the monster really is.
    m.xp    = Math.round(m.xp*hpMul);
    if(m.regen) m.regen += Math.floor((d-1)/4);
  }
  m.x=x; m.y=y; m.hp=m.maxhp; m.alive=true;
  return m;
}
export function monsterAt(x,y){ for(let i=1;i<G.ents.length;i++){const e=G.ents[i]; if(e.alive&&e.x===x&&e.y===y) return e;} return null; }
