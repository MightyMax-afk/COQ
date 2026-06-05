"use strict";
import { G } from './state.js';
import { clamp, ri, log } from './util.js';
import { COL } from './palette.js';
import { effAtk, effDef, gearEvade, gearThorns, totalAcc, totalCrit, totalHitLeech, charmDef, makeGear, makeCharm, makeLegendary, rollLoot } from './items.js';
import { GOLD_DROP_MUL } from './config.js';
import { gainXp } from './player.js';
import { endGame } from './game.js';
import { MUSIC } from './audio.js';

// ---------- status conditions ----------
// each entity may carry .status = [{type, turns, amount}]; ticked once per turn.
export const STATUS = {
  poison: {name:"Poison", col:"#7bc96f", dot:true},   // damage over time, ignores armor
  burn:   {name:"Burn",   col:"#ff8a5a", dot:true},
  bleed:  {name:"Bleed",  col:"#e0524a", dot:true},
  regen:  {name:"Regen",  col:"#86d166"},             // heal over time
  weaken: {name:"Weak",   col:"#b6a0ff"},             // -attack while active
};
export function addStatus(ent,type,turns,amount){
  // Antidote perk: incoming damage-over-time on the player lasts 2 fewer turns (min 1).
  if(ent===G.player && G.player.antidote && STATUS[type] && STATUS[type].dot){
    turns = Math.max(1, turns - 2);
  }
  if(!ent.status) ent.status=[];
  const ex=ent.status.find(s=>s.type===type);
  if(ex){ ex.turns=Math.max(ex.turns,turns); ex.amount=Math.max(ex.amount,amount); }
  else ent.status.push({type,turns,amount});
}
export function statusAtkMod(ent){       // total attack reduction from 'weaken'
  if(!ent.status) return 0;
  return ent.status.filter(s=>s.type==="weaken").reduce((a,s)=>a+s.amount,0);
}
// tick all of one entity's statuses; returns true if it died from a DoT.
// sets ent._dotThisTurn so the caller can suppress regen while bleeding/burning/poisoned.
export function tickStatus(ent){
  ent._dotThisTurn=false;
  if(!ent.status||!ent.status.length) return false;
  let died=false;
  for(const s of ent.status){
    const def=STATUS[s.type];
    if(def.dot){
      if(ent===G.player && G.godMode){ s.turns--; continue; }   // debug godmode: ignore DoT on the player
      ent.hp-=s.amount; ent._dotThisTurn=true;
      if(ent===G.player) log(`${def.name} hits you for ${s.amount}.`,"bad");
      else log(`The ${ent.name} suffers ${s.amount} ${def.name.toLowerCase()}.`,"good");
      if(ent.hp<=0 && !died){ died=true; }
    } else if(s.type==="regen"){
      if(ent.hp<ent.maxhp) ent.hp=Math.min(ent.maxhp,ent.hp+s.amount);
    }
    s.turns--;
  }
  ent.status=ent.status.filter(s=>s.turns>0);
  return died;
}
export function statusLabel(ent){        // short text for the UI, e.g. "Poison 3, Bleed 2"
  if(!ent.status||!ent.status.length) return "";
  return ent.status.map(s=>`${STATUS[s.type].name} ${s.turns}`).join(", ");
}

export function rollHit(att,def){
  const w=G.equipped.weapon;
  let acc = att.isPlayer ? 0.90+G.player.accBonus+totalAcc() : (0.85+(att.acc||0));
  if(att.isPlayer && w && w.acc) acc+=w.acc;
  let eva = def.isPlayer ? G.player.evasion+gearEvade() : (def.evade||0);
  if(def.isPlayer && att.ranged) eva += G.player.deflect;   // Deflect: dodge ranged shots (stacking %)
  return Math.random() < clamp(acc - eva, 0.35, 0.99);
}

// melee or ranged strike. `ranged` true skips the adjacency assumption.
export function attack(att,def,ranged){
  const w=G.equipped.weapon;
  if(!rollHit(att,def)){
    if(att.isPlayer)      log(`You ${ranged?"shoot at":"swing at"} the ${def.name} and miss.`);
    else if(def.isPlayer){
      log(`The ${att.name} ${att.ranged?"shoots":"lunges"} but misses.`);
      // Retribution: a dodged MELEE blow is answered with your Defense as damage.
      if(G.player.retribution && !att.ranged && att.alive){
        const rdmg = effDef();
        att.hp -= rdmg;
        log(`You counter-strike the ${att.name} for ${rdmg}!`,"good");
        if(att.hp<=0){
          att.alive=false;
          log(`The ${att.name} dies to your riposte.`,"good");
          G.score+=att.maxhp*2; gainXp(att.xp);
          if(Math.random() < (0.30+G.player.luckyFind)){
            const drop=rollLoot(att.x,att.y,G.depth); if(drop){ drop.x=att.x; drop.y=att.y; G.items.push(drop); }
          }
        }
      }
    }
    return;
  }
  const a = att.isPlayer ? effAtk() : att.atk;
  let d = def.isPlayer ? effDef() : def.def;
  if(att.isPlayer && G.player.armorPen) d=Math.max(0, d-G.player.armorPen);   // Sunder ignores some defense
  let dmg = Math.max(1, a - d + ri(-1,2));
  // Giant Slayer: bonus damage scaling with the target's max HP (great vs tanks/bosses).
  if(att.isPlayer && G.player.giantSlayer) dmg += Math.floor(def.maxhp*G.player.giantSlayer);
  // Player anti-stonewall: even against very high armor, a hit always lands a meaningful
  // chunk (~3% of the target's max HP). Stops armored elites/bosses from being un-killable
  // when your attack hasn't out-scaled their defense.
  if(att.isPlayer && !def.isPlayer){
    const floorDmg = Math.max(1, Math.round(def.maxhp*0.03));
    if(dmg < floorDmg) dmg = floorDmg;
  }
  let crit=false;
  const critChance = Math.min(0.50, (att.isPlayer ? G.player.critBonus+totalCrit() : 0) + (w && w.crit ? w.crit : 0));
  if(att.isPlayer && critChance>0 && Math.random()<critChance){ dmg*=2; crit=true; }
  // elite "Brutal": chance to strike twice
  if(!att.isPlayer && att.eliteCrit && Math.random()<att.eliteCrit){ dmg*=2; crit=true; }
  // debug godmode: the player simply takes no damage
  if(def.isPlayer && G.godMode) dmg = 0;
  def.hp -= dmg;
  // strike SFX — player landing a blow vs. the player taking one
  if(att.isPlayer) MUSIC.playPlayerHit();
  else if(def.isPlayer) MUSIC.playEnemyHit();
  if(att.isPlayer) log(`You ${ranged?"hit":"hit"} the ${def.name} for ${dmg}${crit?" (crit!)":""}.`, crit?"gold":"good");
  else if(def.isPlayer){
    log(`The ${att.name} ${att.ranged?"shoots":"hits"} you for ${dmg}${crit?" (crit!)":""}.`,"bad");
    // elite "Vampiric": heals itself off the damage it deals
    if(att.eliteLeech){ att.hp=Math.min(att.maxhp, att.hp+att.eliteLeech); }
    // elite "Venomous": applies its status to the player
    if(att.eliteStatus){ const s=att.eliteStatus; addStatus(G.player,s.type,s.turns,s.amount);
      log(`The ${att.name}'s strike leaves you ${STATUS[s.type].name.toLowerCase()}ed.`,"bad"); }
    // thorns from armor + the Spiked Hide perk reflect onto a melee attacker (not ranged)
    const th=gearThorns()+G.player.thornsSelf;
    if(th>0 && !att.ranged && att.alive){
      att.hp-=th; log(`You lash back for ${th}.`,"good");
      if(att.hp<=0){ att.alive=false; log(`The ${att.name} dies on your spikes.`,"good"); G.score+=att.maxhp*2; gainXp(att.xp); }
    }
  }
  // on-hit status from an equipped charm (player only), e.g. poison/burn/bleed/weaken
  if(att.isPlayer && def.alive!==false && def.hp>0){
    const c=G.equipped.charm, cd=c&&charmDef(c);
    if(cd && cd.onHit){ const o=cd.onHit; addStatus(def,o.type,o.turns,o.amount);
      log(`The ${def.name} is afflicted: ${STATUS[o.type].name}.`,"good"); }
  }
  // Searing Blades: a melee strike may set the target alight.
  if(att.isPlayer && !ranged && G.player.searingBlades>0 && def.alive!==false && def.hp>0 && Math.random()<G.player.searingBlades){
    addStatus(def,"burn",3,3);
    log(`Your blade sears the ${def.name}.`,"good");
  }
  // healing on a successful hit: weapon lifesteal + Vampire perk + Leeching charm, capped
  if(att.isPlayer){
    let heal=0; if(w && w.lifesteal) heal+=w.lifesteal; heal+=G.player.hitLeech;
    // Leeching charm only fires every other hit (was every-hit +2, broken-tier).
    G.player.leechCounter = (G.player.leechCounter||0) + 1;
    if(G.player.leechCounter % 2 === 0) heal += totalHitLeech();
    heal=Math.min(heal,4);   // hard cap so sustain can't outrun all incoming damage
    if(heal>0) G.player.hp=Math.min(G.player.maxhp,G.player.hp+heal);
  }
  if(def.hp<=0 && def.alive!==false){
    def.alive=false;
    if(def.isPlayer){ log("You collapse. The dark takes you.","bad"); }
    else {
      G.score+=def.maxhp*2; gainXp(def.xp);
      if(att.isPlayer && G.player.lifesteal>0) G.player.hp=Math.min(G.player.maxhp,G.player.hp+G.player.lifesteal);
      if(def.boss){
        log(`${def.name} is slain!`,"gold");
        // Both act-enders (Varmathrax + Zarakhel) always drop a legendary; other bosses 5%.
        if(def.final || def.act1End || Math.random()<0.05){
          const leg=makeLegendary(G.depth); leg.x=def.x; leg.y=def.y; G.items.push(leg);
          log(`It drops the ${leg.fixedName}!`,"gold");
        } else {
          // most bosses drop a strong (but normal) gear piece + a charm chance
          const g=makeGear(def.x,def.y,G.depth+2); G.items.push(g);
          if(Math.random()<0.12){ const ch=makeCharm(); ch.x=def.x; ch.y=def.y; G.items.push(ch); }
          log(`It drops some loot.`,"gold");
        }
        if(def.act1End){
          log(`The wyrm falls. Act I is conquered — but below, something stirs.`,"gold");
        }
      } else if(def.mimic){
        log(`The mimic dies, spilling its hoard.`,"gold");
        // mimics drop solid loot: gear (rare legendary), gold, and SOMETIMES a charm
        if(Math.random()<0.12){ const leg=makeLegendary(G.depth); leg.x=def.x; leg.y=def.y; G.items.push(leg); log(`It held the ${leg.fixedName}!`,"gold"); }
        else { const g=makeGear(def.x,def.y,G.depth+1); G.items.push(g); }
        if(Math.random()<0.25){ const ch=makeCharm(); ch.x=def.x; ch.y=def.y; G.items.push(ch); }
        const gld={kind:"gold",glyph:"$",col:COL.gold,name:"gold",value:Math.round(ri(20,40)*G.depth*GOLD_DROP_MUL),x:def.x,y:def.y}; G.items.push(gld);
      } else if(def.elite){
        log(`The ${def.name} falls — it was carrying something.`,"gold");
        // elites always drop: a strong gear piece, gold, sometimes a charm, rare legendary
        if(Math.random()<0.06){ const leg=makeLegendary(G.depth); leg.x=def.x; leg.y=def.y; G.items.push(leg); log(`It held the ${leg.fixedName}!`,"gold"); }
        else { const g=makeGear(def.x,def.y,G.depth+2); G.items.push(g); }
        if(Math.random()<0.15){ const ch=makeCharm(); ch.x=def.x; ch.y=def.y; G.items.push(ch); }
        const gld={kind:"gold",glyph:"$",col:COL.gold,name:"gold",value:Math.round(ri(15,30)*Math.max(1,G.depth)*GOLD_DROP_MUL),x:def.x,y:def.y}; G.items.push(gld);
      } else {
        log(`The ${def.name} dies.`,"good");
        if(att.isPlayer && Math.random() < (0.30+G.player.luckyFind)){   // ordinary enemies sometimes drop loot (Lucky Find: stacking +10%)
          const drop=rollLoot(def.x,def.y,G.depth); if(drop){ drop.x=def.x; drop.y=def.y; G.items.push(drop); }
        }
      }
      if(def.final){ endGame(true); }
    }
  }
}
