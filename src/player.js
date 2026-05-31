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

export function makePlayer(){ return {glyph:"@",baseAtk:4,baseDef:1,maxhp:32,hp:32,level:1,xp:0,xpNext:30,
        sight:FOV_R,regenAmt:0,regenTick:0,lifesteal:0,potionBonus:0,
        evasion:0,accBonus:0,critBonus:0,armorPen:0,thornsSelf:0,hitLeech:0,charmHp:0,
        leechCounter:0,everAct2:false,
        status:[],alive:true,isPlayer:true,stairX:-1,stairY:-1}; }
