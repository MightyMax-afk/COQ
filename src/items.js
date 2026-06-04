"use strict";
import { G } from './state.js';
import { ri, log } from './util.js';
import { COL } from './palette.js';
import { statusAtkMod } from './combat.js';

// ---------- gear slot data ----------
export const WEAPONS = [
  {name:"dagger",      atk:2}, {name:"short sword", atk:4},
  {name:"battle axe",  atk:7}, {name:"war hammer",  atk:10},
];
// armor-type gear: each "kind" is its own equipment slot with its own tier ladder
export const ARMOR_TIERS = {
  armor:  [{name:"leather armor", def:1}, {name:"chain mail", def:3}, {name:"plate armor", def:6}],
  helmet: [{name:"leather cap",   def:1}, {name:"iron helm",  def:2}, {name:"great helm",  def:4}],
  shield: [{name:"wooden shield", def:1}, {name:"kite shield",def:3}, {name:"tower shield",def:5}],
  boots:  [{name:"leather boots", def:1}, {name:"chain sabatons", def:2}, {name:"plate greaves", def:3}],
};
export const GEAR_GLYPH = { weapon:")", armor:"[", helmet:"^", shield:"0", boots:"L" };
export const GEAR_COL   = { weapon:"#9ad0ff", armor:"#c0a060", helmet:"#d0b48a", shield:"#a8b0c0", boots:"#8a6020" };
export const ARMOR_KINDS = ["armor","helmet","shield","boots"];
export const ALL_SLOTS   = ["weapon","armor","helmet","shield","boots","charm"];
export const GEAR_SLOTS  = ["weapon","armor","helmet","shield","boots"];   // mergeable tiered gear (excludes charms)

// ---------- charms (5th equipment slot: passive trinkets) ----------
// found in chests / dropped by bosses / sold by merchants. Each grants a passive.
export const CHARMS = [
  {id:"venom",   name:"Venom Charm",     desc:"hits apply poison",         glyph:"¤", onHit:{type:"poison",turns:3,amount:2}},
  {id:"ember",   name:"Ember Charm",     desc:"hits apply burn",           glyph:"¤", onHit:{type:"burn",turns:3,amount:3}},
  {id:"serrate", name:"Serrated Charm",  desc:"hits cause bleeding",       glyph:"¤", onHit:{type:"bleed",turns:4,amount:2}},
  {id:"sap",     name:"Sapping Charm",   desc:"hits weaken the enemy",     glyph:"¤", onHit:{type:"weaken",turns:3,amount:2}},
  {id:"vigor",   name:"Vigor Charm",     desc:"+15 max HP",                stat:{maxhp:15}},
  {id:"fury",    name:"Fury Charm",      desc:"+3 attack",                 stat:{atk:3}},
  {id:"guard",   name:"Guard Charm",     desc:"+3 defense",                stat:{def:3}},
  {id:"swift",   name:"Swift Charm",     desc:"+10% dodge",                stat:{evasion:0.10}},
  {id:"focus",   name:"Focus Charm",     desc:"+12% accuracy",             stat:{acc:0.12}},
  {id:"leech",   name:"Leeching Charm",  desc:"+1 HP every other hit",   stat:{hitLeech:1}},
  {id:"savage",  name:"Savage Charm",    desc:"+8% critical chance",       stat:{critBonus:0.08}},
  {id:"dash",    name:"Dash Charm",      desc:"+1 dash charge",            dash:1},
];
export function makeCharm(){ const c=CHARMS[ri(0,CHARMS.length-1)];
  return {kind:"charm", charmId:c.id, glyph:"¤", col:"#c77dff", name:c.name, value:60}; }
export function charmDef(it){ return CHARMS.find(c=>c.id===it.charmId); }
// Max dash charges: boots tier (leather 0, chain 1, plate greaves 2),
// legendary boots 3, plus the Dash Charm's bonus if equipped (doubled by Catalyst).
export function dashMax(){
  let n=0;
  const b=G.equipped.boots;
  if(b) n = b.legendary ? 3 : b.tier;
  const c=G.equipped.charm, cd=c&&charmDef(c);
  if(cd && cd.dash) n += cd.dash * ((G.player&&G.player.catalyst) ? 2 : 1);
  return n;
}

// ---------- legendary gear (boss drops) ----------
// 40 unique weapon names + legendary armor pieces; each rolled with a random title + affix
const LEG_NAMES=[
  "Doomrender","Soulreaver","Bloodfang","Frostbite","Emberwail","Stormcleaver","Gravecaller","Dreadmaw",
  "Wyrmsplitter","Starpiercer","Nightedge","Bonewhisper","Venomtalon","Runebrand","Gloomreaper","Thornlash",
  "Ashbringer","Voidripper","Ironsong","Hollowcry","Skullrender","Mournblade","Cinderfang","Hexedge",
  "Direclaw","Sablethorn","Grimwail","Ghostpiercer","Duskbane","Wraithmaw","Blightfang","Pyreblade",
  "Frosthowl","Doomcaller","Soulbiter","Bloodthirst","Shadowrend","Tempestedge","Necrolash","Dragonsbane",
];
const LEG_ARMOR_NAMES={
  armor:  ["Aegis of the Fallen","Carapace of Night","Bulwark Eternal","Scales of the Wyrm","Shroud of Ash"],
  helmet: ["Crown of Dread","Visage of the Void","Helm of the Damned","Skull of Kings","Gaze of Ruin"],
  shield: ["Wall of Souls","Bastion of Embers","Ward of the Deep","Bulwark of Bone","Mirror of Gloom"],
  boots:  ["Treads of the Abyss","Steps of the Void","Windwalker Greaves","Ember Striders","Sabatons of Ruin"],
};
const LEG_TITLE=["of the Abyss","of Ruin","the Unbroken","of Embers","of the Pale Moon","the Devourer",
                 "of Lost Kings","the Merciless","of the Deep","of Nine Sorrows","the Kingslayer","of Cinders"];
const LEG_AFFIX=[
  {key:"lifesteal", txt:"heals you on hit",        roll:()=>({lifesteal:ri(1,3)})},
  {key:"crit",      txt:"chance to strike double", roll:()=>({crit:0.10+ri(0,10)/100})},
  {key:"acc",       txt:"improves your accuracy",  roll:()=>({acc:0.05+ri(0,10)/100})},
  {key:"cleave",    txt:"forged for raw carnage",  roll:()=>({})},   // pure-damage flavor
];
const LEG_ARMOR_AFFIX=[
  {key:"thorns",  txt:"reflects damage to attackers", roll:()=>({thorns:ri(2,5)})},
  {key:"evade",   txt:"helps you slip blows",          roll:()=>({evadeBonus:0.05+ri(0,8)/100})},
  {key:"ward",    txt:"wrought of impenetrable make",  roll:()=>({})},  // pure-defense flavor
  {key:"fleet",   txt:"grants unearthly swiftness",    roll:()=>({evadeBonus:0.10+ri(0,5)/100, regen:1})},
];
export function resetLegendPool(){
  G.legendPool=LEG_NAMES.slice();
  for(let i=G.legendPool.length-1;i>0;i--){ const j=ri(0,i); [G.legendPool[i],G.legendPool[j]]=[G.legendPool[j],G.legendPool[i]]; }
}
export function makeLegendary(d){
  // 60% legendary weapon, 40% legendary armor piece
  if(ri(1,100)<=60) return makeLegendaryWeapon(d);
  return makeLegendaryArmor(d);
}
export function makeLegendaryWeapon(d){
  if(!G.legendPool||!G.legendPool.length) resetLegendPool();
  const baseName=G.legendPool.pop();
  const title=LEG_TITLE[ri(0,LEG_TITLE.length-1)];
  const affix=LEG_AFFIX[ri(0,LEG_AFFIX.length-1)];
  // Scaling bumped from 1.4/depth to 2.2/depth so legendaries stay the obvious best
  // weapon in their depth band — old scaling was beaten by enchanted regular gear in Act II.
  const atk=10+Math.round(d*2.2)+ri(0,6);
  return Object.assign({
    kind:"weapon", legendary:true, glyph:")", col:"#ffd86b",
    fixedName:`${baseName} ${title}`, fixedBonus:atk, affixTxt:affix.txt, value:atk*12,
  }, affix.roll());
}
export function makeLegendaryArmor(d, kind){
  if(!kind) kind=ARMOR_KINDS[ri(0,ARMOR_KINDS.length-1)];
  const names=LEG_ARMOR_NAMES[kind];
  const baseName=names[ri(0,names.length-1)];
  const affix=LEG_ARMOR_AFFIX[ri(0,LEG_ARMOR_AFFIX.length-1)];
  // Same rationale as the legendary weapon — bump 0.7 -> 1.1 to stay ahead of regular armor.
  const def=4+Math.round(d*1.1)+ri(0,3);
  return Object.assign({
    kind, legendary:true, glyph:GEAR_GLYPH[kind], col:"#ffd86b",
    fixedName:baseName, fixedBonus:def, affixTxt:affix.txt, value:def*14,
  }, affix.roll());
}

// ---------- loot rolls ----------
// what a (non-mimic) chest contains
export function chestLoot(d){
  const out=[]; const r=ri(1,100);
  out.push({kind:"gold",glyph:"$",col:COL.gold,name:"gold",value:ri(15,30)*d});  // always some gold
  if(r<=4) out.push(makeCharm());                        // 4% a charm (very rare)
  else if(r<=60) out.push(makeGear(0,0,d+1));            // a slightly better gear piece
  else out.push({kind:"potion",glyph:"!",col:COL.potion,name:"potion",heal:12});
  return out;
}

// a single floor-loot item. Returns null sometimes so not every roll yields gear.
export function rollLoot(x,y,d){
  const t=ri(1,100);
  if(t<=8) return {x,y,kind:"potion",glyph:"!",col:COL.potion,name:"potion",heal:12};
  if(t<=34) return {x,y,kind:"gold",glyph:"$",col:COL.gold,name:"gold",value:ri(5,15)*d};
  // remaining ~66% is gear
  return makeGear(x,y,d);
}
// build a normal (non-legendary) gear piece of a random slot.
// The base tier ladder maxes out early (by ~depth 9), so deeper drops arrive
// pre-enchanted: the further past the tier ceiling, the more +levels baked in.
// This is what makes loot keep getting better all the way down to floor 40.
export function makeGear(x,y,d){
  const kind = GEAR_SLOTS[ri(0,GEAR_SLOTS.length-1)];
  const tbl=tierTable(kind);
  const maxTier = tbl.length-1;
  const tier=Math.min(maxTier, ri(0, (kind==="weapon"?1:0)+(d/3|0)));
  // depth beyond the point the ladder tops out grants baked-in enchant levels.
  // ~+1 every 3 floors past depth 6, with a little variance; never negative.
  let ench=0;
  if(tier>=maxTier && d>6){
    const baked = Math.floor((d-6)/3);
    ench = Math.max(0, baked + ri(-1,1));
  }
  // Scavenger: a chance for any found gear to arrive pre-enchanted by +1.
  if(G.player && G.player.scavenger && Math.random()<0.20) ench+=1;
  return {x,y,kind,glyph:GEAR_GLYPH[kind],col:GEAR_COL[kind],tier,ench};
}

// ---------- stats / gear helpers ----------
export function tierTable(kind){ return kind==="weapon" ? WEAPONS : ARMOR_TIERS[kind]; }
export function gearBonus(it){
  if(it.kind==="charm") return 0;          // charms have no tier bonus
  if(it.legendary) return it.fixedBonus;
  const tbl=tierTable(it.kind);
  const base = it.kind==="weapon" ? tbl[it.tier].atk : tbl[it.tier].def;
  return base + it.ench*(it.kind==="weapon"?3:2);
}
export function gearName(it){
  if(it.kind==="charm") return it.name;
  if(it.legendary) return it.fixedName;
  const cls = G.player && G.player.classId;
  if(it.kind==="weapon"){
    const names = CLASS_WEAPON_NAMES[cls];
    if(names){ const base = names[it.tier]; return it.ench>0 ? `${base} +${it.ench}` : base; }
  } else if(CLASS_GEAR_NAMES[cls] && CLASS_GEAR_NAMES[cls][it.kind]){
    const base = CLASS_GEAR_NAMES[cls][it.kind][it.tier];
    if(base) return it.ench>0 ? `${base} +${it.ench}` : base;
  }
  const base = tierTable(it.kind)[it.tier].name;
  return it.ench>0 ? `${base} +${it.ench}` : base;
}
// Same gear tiers/stats, re-flavored per class (Wanderer keeps the default
// tables). Knight: heavy steel-and-gold arms. Rogue: light blades + stealth kit.
const CLASS_WEAPON_NAMES = {
  knight: ["arming sword", "longsword",  "flanged mace", "greatsword"],
  rogue:  ["shiv",         "dirk",       "rapier",       "assassin's blade"],
};
const CLASS_GEAR_NAMES = {
  knight: {
    armor:  ["brigandine",      "scale mail",      "knight's plate"],
    helmet: ["iron coif",       "barbute",         "great helm"],
    shield: ["round shield",    "kite shield",     "tower shield"],
    boots:  ["leather greaves", "chain sabatons",  "plate greaves"],
  },
  rogue: {
    armor:  ["leather jerkin",  "studded leather", "shadow cloak"],
    helmet: ["leather hood",    "studded hood",    "shadow cowl"],
    shield: ["buckler",         "reinforced buckler", "spiked buckler"],
    boots:  ["soft boots",      "leather treads",  "shadow striders"],
  },
};
export const isGear = it => GEAR_SLOTS.includes(it.kind);          // mergeable tiered gear
export const isEquippable = it => ALL_SLOTS.includes(it.kind);     // gear or charm
export function bestOf(kind){ let b=null; for(const it of G.inv) if(it.kind===kind && (!b||gearBonus(it)>gearBonus(b))) b=it; return b; }
export function autoEquip(){
  for(const slot of GEAR_SLOTS){
    if(G.autoEquipOn){
      // upgrade to the strongest available in this slot
      const best=bestOf(slot);
      if(best && (!G.equipped[slot] || gearBonus(best)>gearBonus(G.equipped[slot]))) G.equipped[slot]=best;
    } else {
      // toggle off: only fill an empty slot, never override a manual choice
      if(!G.equipped[slot]){ const best=bestOf(slot); if(best) G.equipped[slot]=best; }
    }
    // if the equipped item left the pack (sold/merged away), fall back to best available
    if(G.equipped[slot] && !G.inv.includes(G.equipped[slot])) G.equipped[slot]=bestOf(slot)||null;
  }
  if(!G.equipped.charm){ const c=G.inv.find(it=>it.kind==="charm"); if(c) G.equipped.charm=c; }
  if(G.equipped.charm && !G.inv.includes(G.equipped.charm)) G.equipped.charm=G.inv.find(it=>it.kind==="charm")||null;
  reconcileCharmHp();
}
export function tryMerge(){
  for(let pass=0; pass<24; pass++){               // loop so cascades resolve
    const groups={};
    // Group by (kind, tier, ench). We include EQUIPPED gear in the count
    // (it counts toward the 3-of-a-kind threshold), but we never delete a worn
    // piece — we swap-upgrade it instead. This fixes the old behaviour where
    // 1 equipped + 2 in pack would never fuse and one would always be "left over".
    for(const it of G.inv){
      if(it.legendary||!isGear(it)) continue;
      const k=it.kind+":"+it.tier+":"+it.ench;
      (groups[k]=groups[k]||[]).push(it);
    }
    let did=false;
    for(const k in groups){
      const g=groups[k];
      if(g.length<3) continue;
      const maxTier=tierTable(g[0].kind).length-1;
      const atMax = g[0].tier>=maxTier && g[0].ench>=99;   // +99 is the enchant ceiling
      if(atMax) continue;   // can't fuse further; leave the spares in the pack
      // Split into worn vs spare. Always consume spares first; only touch the
      // worn copy if we still don't have 3 victims (i.e. swap-upgrade).
      const worn  = g.filter(it => ALL_SLOTS.some(s=>G.equipped[s]===it));
      const spare = g.filter(it => !worn.includes(it));
      const up = g[0].tier<maxTier
        ? {kind:g[0].kind,glyph:g[0].glyph,col:g[0].col,tier:g[0].tier+1,ench:g[0].ench}
        : {kind:g[0].kind,glyph:g[0].glyph,col:g[0].col,tier:g[0].tier,ench:g[0].ench+1};
      let logVerb = `Three ${gearName(g[0])} fuse into a ${gearName(up)}!`;
      if(spare.length >= 3){
        // classic path: 3 spares fuse into one new item
        for(let n=0;n<3;n++) G.inv.splice(G.inv.indexOf(spare[n]),1);
        G.inv.push(up);
      } else {
        // swap-upgrade path: consume all spares + the worn copy, drop the upgrade
        // straight into the slot the worn piece was in. Net: no leftovers, no naked slot.
        const wornPiece = worn[0];
        const wornSlot = ALL_SLOTS.find(s=>G.equipped[s]===wornPiece);
        for(const sp of spare) G.inv.splice(G.inv.indexOf(sp),1);
        G.inv.splice(G.inv.indexOf(wornPiece),1);
        G.inv.push(up);
        G.equipped[wornSlot] = up;
        logVerb = `Your ${gearName(g[0])} fuses with ${spare.length} duplicate${spare.length>1?'s':''} — now wearing ${gearName(up)}!`;
      }
      log(logVerb,"gold");
      did=true; break;
    }
    if(!did) break;
  }
}

// total defense from all worn armor pieces + any legendary evade bonus
// value of a charm's stat field (0 if none/charm not equipped)
export function charmStat(key){ const c=G.equipped.charm; const d=c&&charmDef(c); let v=(d&&d.stat&&d.stat[key])||0;
  if(G.player&&G.player.catalyst) v*=2;   // Catalyst: doubles the equipped charm's stat value
  return v; }
export function effAtk(){ const w=G.equipped.weapon; let a=G.player.baseAtk+(w?gearBonus(w):0)+charmStat("atk")-statusAtkMod(G.player);
  if(G.player.secondWind && G.player.hp < G.player.maxhp*0.25) a+=5;   // Second Wind: desperate strength
  return a; }
export function effDef(){
  let d=G.player.baseDef+charmStat("def");
  for(const slot of ARMOR_KINDS){ const it=G.equipped[slot]; if(it) d+=gearBonus(it); }
  // Close Quarters: surrounded by 2+ adjacent foes grants +3 defense (before the cap).
  if(G.player.closeQuarters){
    let adj=0;
    for(const e of G.ents){ if(e&&e.alive&&!e.isPlayer&&Math.abs(e.x-G.player.x)<=1&&Math.abs(e.y-G.player.y)<=1) adj++; }
    if(adj>=2) d+=G.player.closeQuarters;
  }
  // diminishing returns past 20: each point beyond counts for half, so you can't wall to immunity
  if(d>20) d=20+(d-20)*0.5;
  return Math.round(d);
}
export function gearEvade(){ let e=charmStat("evasion"); for(const slot of ARMOR_KINDS){ const it=G.equipped[slot]; if(it&&it.evadeBonus) e+=it.evadeBonus; }
  if(G.player.secondWind && G.player.hp < G.player.maxhp*0.25) e+=0.15;   // Second Wind: desperate footwork
  return e; }
export function gearThorns(){ let t=0; for(const slot of ARMOR_KINDS){ const it=G.equipped[slot]; if(it&&it.thorns) t+=it.thorns; } return t; }
export function gearRegen(){ let r=charmStat("regenAmt"); for(const slot of ARMOR_KINDS){ const it=G.equipped[slot]; if(it&&it.regen) r+=it.regen; } return r; }
// charm-granted extras read elsewhere
export function totalMaxHpBonus(){ return charmStat("maxhp"); }
export function totalAcc(){ return charmStat("acc"); }
export function totalCrit(){ return charmStat("critBonus"); }
export function totalHitLeech(){ return charmStat("hitLeech"); }

// keep player.maxhp in sync with the equipped charm's maxhp bonus
export function reconcileCharmHp(){
  const want=totalMaxHpBonus();
  const have=G.player.charmHp||0;
  if(want!==have){
    G.player.maxhp += (want-have);
    G.player.charmHp = want;
    if(G.player.hp>G.player.maxhp) G.player.hp=G.player.maxhp;
    if(want>have) G.player.hp=Math.min(G.player.maxhp, G.player.hp+(want-have)); // gain the new HP too
  }
}
