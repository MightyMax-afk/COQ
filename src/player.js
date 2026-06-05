import { G } from './state.js';
import { log } from './util.js';
import { FOV_R } from './config.js';

export const PERKS = [
  {name:"Vitality",     w:3, desc:"+10 max HP, heal to full", apply(){ G.player.maxhp+=10; G.player.hp=G.player.maxhp; }},
  {name:"Power",        w:3, desc:"+2 attack",                apply(){ G.player.baseAtk+=2; }},
  {name:"Toughness",    w:3, desc:"+2 defense",               apply(){ G.player.baseDef+=2; }},
  {name:"Keen Eyes",    w:2, desc:"+1 sight radius",          apply(){ G.player.sight=Math.min(13,G.player.sight+1); }},
  {name:"Regeneration", w:1, desc:"+1 HP healed every 9 turns", apply(){ G.player.regenAmt+=1; }},
  {name:"Bloodletter",  w:2, desc:"+2 HP on every kill",      apply(){ G.player.lifesteal+=2; }},
  {name:"Alchemy",      w:2, desc:"potions heal +8 more",     apply(){ G.player.potionBonus+=8; }},
  {name:"Berserker",    w:2, desc:"+4 attack, -1 defense",    apply(){ G.player.baseAtk+=4; G.player.baseDef=Math.max(0,G.player.baseDef-1); }},
  {name:"Evasion",      w:2, desc:"+8% chance to dodge",      apply(){ G.player.evasion+=0.08; }},
  {name:"Precision",    w:3, desc:"+8% attack accuracy",      apply(){ G.player.accBonus+=0.08; }},
  // --- Build A additions ---
  {name:"Deadly Aim",   w:2, desc:"+10% critical-hit chance", apply(){ G.player.critBonus+=0.10; }},
  {name:"Sunder",       w:2, desc:"strikes ignore 2 enemy defense", apply(){ G.player.armorPen+=2; }},
  {name:"Iron Skin",    w:2, desc:"+3 defense, +5 max HP",    apply(){ G.player.baseDef+=3; G.player.maxhp+=5; G.player.hp+=5; }},
  {name:"Spiked Hide",  w:2, desc:"reflect damage when hit (stacks +1)", apply(){ G.player.thornsSelf+=1; }},
  {name:"Hardy",        w:1, desc:"+20 max HP, heal to full", apply(){ G.player.maxhp+=20; G.player.hp=G.player.maxhp; }},
  {name:"Executioner",  w:1, desc:"+2 attack and +6% crit",   apply(){ G.player.baseAtk+=2; G.player.critBonus+=0.06; }},
  {name:"Vampire",      w:0.4, desc:"+1 HP on every hit (stacks)", apply(){ G.player.hitLeech+=1; }},
  {name:"Adrenaline",   w:2, desc:"+12% accuracy, +6% dodge", apply(){ G.player.accBonus+=0.12; G.player.evasion+=0.06; }},
  // --- Act II additions ---
  {name:"Giant Slayer",  w:0.4, key:"giantSlayer", cap:0.20, desc:"+4% of target's max HP as bonus damage (stacks to 20%)", apply(){ G.player.giantSlayer=Math.min(0.20, G.player.giantSlayer+0.04); }},
  {name:"Second Wind",   w:2, binary:true, key:"secondWind", desc:"+5 Attack and +15% Dodge when below 25% HP", apply(){ G.player.secondWind = true; }},
  {name:"Searing Blades", w:2, key:"searingBlades", cap:1.0, desc:"+10% chance to Burn on melee, 3 turns (stacks to 100%)", apply(){ G.player.searingBlades=Math.min(1.0, G.player.searingBlades+0.10); }},
  {name:"Antidote",      w:2, binary:true, key:"antidote", desc:"Reduces duration of incoming poison/burn/bleed by 2 turns", apply(){ G.player.antidote = true; }},
  {name:"Deflect",       w:2, key:"deflect", cap:0.60, desc:"+15% Dodge against ranged attacks (stacks to 60%)", apply(){ G.player.deflect=Math.min(0.60, G.player.deflect+0.15); }},
  {name:"Close Quarters", w:2, key:"closeQuarters", cap:12, desc:"+3 Defense when adjacent to 2+ enemies (stacks to +12)", apply(){ G.player.closeQuarters=Math.min(12, G.player.closeQuarters+3); }},
  {name:"Scavenger",     w:2, binary:true, key:"scavenger", desc:"+25% gold found, 20% chance for gear to gain +1 enchant", apply(){ G.player.scavenger = true; }},
  {name:"Lucky Find",    w:2, key:"luckyFind", cap:0.70, desc:"+10% monster drop chance (stacks to 70%)", apply(){ G.player.luckyFind=Math.min(0.70, G.player.luckyFind+0.10); }},
  {name:"Catalyst",      w:1, binary:true, key:"catalyst", desc:"Doubles the stats and effects of your equipped Charm", apply(){ G.player.catalyst = true; }},
  {name:"Retribution",   w:1, binary:true, key:"retribution", desc:"Dodging a melee attack deals your Defense as damage to the attacker", apply(){ G.player.retribution = true; }},
];

export function gainXp(n){
  G.player.xp+=n;
  while(G.player.xp>=G.player.xpNext){
    G.player.xp-=G.player.xpNext; G.player.level++;
    G.player.xpNext=Math.round(G.player.xpNext*1.6);   // steeper: each level costs much more
    G.pendingLevelUps++;                              // resolved via the perk picker
    log(`You reach level ${G.player.level}!`,"good");
  }
}

// ---------- character classes ----------
// A class is just a different starting stat block: each one mutates the fresh
// player via apply(). Every field touched here already exists on the player and
// is read by combat/render, so classes need no new mechanics. "wanderer" is the
// original classless start, kept as the default so existing balance is intact.
export const CLASSES = [
  {id:"wanderer", name:"Wanderer",
   blurb:"The classic descent — balanced stats, no specialty. Shaped entirely by the perks and gear you find.",
   apply(p){ /* base stats unchanged */ }},
  {id:"knight", name:"Knight",
   blurb:"A walking wall: +12 HP, +3 Defense, and +3 Defense more whenever 2+ foes crowd you — but a blunted blade (−1 Attack).",
   apply(p){ p.maxhp+=12; p.hp=p.maxhp; p.baseDef+=3; p.baseAtk=Math.max(1,p.baseAtk-1); p.closeQuarters=3; }},
  {id:"rogue", name:"Rogue",
   blurb:"A glass dagger: +2 Attack, +10% Crit, +8% Dodge and an innate Dash — fast and lethal, but frail (−6 max HP).",
   apply(p){ p.baseAtk+=2; p.critBonus+=0.10; p.evasion+=0.08; p.maxhp=Math.max(1,p.maxhp-6); p.hp=p.maxhp;
             p.innateDash=1; p.dashCharges=1; }},   // the nimble class always has at least one dash (even on tier-0 boots)
];
export function classById(id){ return CLASSES.find(c=>c.id===id) || CLASSES[0]; }

export function makePlayer(classId){
  const p={glyph:"@",baseAtk:4,baseDef:1,maxhp:32,hp:32,level:1,xp:0,xpNext:30,
        sight:FOV_R,regenAmt:0,regenTick:0,lifesteal:0,potionBonus:0,
        evasion:0,accBonus:0,critBonus:0,armorPen:0,thornsSelf:0,hitLeech:0,charmHp:0,
        leechCounter:0,everAct2:false,
        // Act II build perks (boolean flags, default off)
        giantSlayer:0,secondWind:false,searingBlades:0,antidote:false,deflect:0,
        closeQuarters:0,scavenger:false,luckyFind:0,catalyst:false,retribution:false,
        dashCharges:0,dashRegen:0,innateDash:0,   // innateDash: class-granted dash, on top of boots/charm
        status:[],alive:true,isPlayer:true,stairX:-1,stairY:-1};
  const cls=classById(classId);
  cls.apply(p);
  p.classId=cls.id;       // drives class-specific sprites (map @ and inventory hero)
  p.className=cls.name;   // shown on the HUD
  return p;
}
