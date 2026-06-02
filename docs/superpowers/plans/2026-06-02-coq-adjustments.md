# COQ Adjustments Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a batch of COQ fixes and features — Capslock fix, equipped-stat display, Sunder label, a stacking/capped perk system, the Zarakhel boss AI, a Dash ability, and a redesigned merchant panel.

**Architecture:** Pure browser ES-module game, no build step and no test runner. Edits are made directly to `src/*.js` and `index.html`; verification is done by serving over HTTP (`python3 -m http.server 8000` from `/root/COQ`) and exercising the game in a browser (Playwright MCP or manual). Each task ends with a concrete in-browser check and a commit.

**Tech Stack:** Vanilla JS ES modules, Canvas 2D, HTML/CSS. No dependencies.

---

## Verification harness (used by every task)

Start the dev server once at the beginning of execution:

```bash
cd /root/COQ && python3 -m http.server 8000 >/tmp/coq-http.log 2>&1 &
```

Open `http://localhost:8000/` in the browser. After editing a `src/` file, **hard-refresh** (ES modules are cached). A fast way to reach late-game state for testing: press **F1** in-game to toggle godmode (no damage taken), which the codebase already supports (game.js:731).

For logic-only checks you can evaluate expressions in the page console, e.g. `window` does not expose `G` by default — if you need direct state access during verification, temporarily run the game and read the on-screen HUD/log rather than poking internals.

---

## Task 1: Capslock-proof the keyboard controls

**Files:**
- Modify: `src/game.js:767-775` (the in-game keydown command dispatch)

- [ ] **Step 1: Lowercase single-character keys before dispatch**

In `src/game.js`, the in-game key handler currently starts at line 767 with `const k=e.key;`. Replace that single line:

```javascript
  const k=e.key;
```

with:

```javascript
  // Normalize single printable keys to lowercase so Capslock/Shift don't break
  // movement and commands. Digits, symbols (>,<,.), and named keys (ArrowUp,
  // Escape) are unaffected by toLowerCase().
  const k=e.key.length===1 ? e.key.toLowerCase() : e.key;
```

- [ ] **Step 2: Remove now-redundant uppercase branch for inventory**

Still in `src/game.js`, line 768 is:

```javascript
  if(k==="i"||k==="I"){ e.preventDefault(); openInventory(); return; }   // open the full inventory screen
```

Replace with (k is already lowercased):

```javascript
  if(k==="i"){ e.preventDefault(); openInventory(); return; }   // open the full inventory screen
```

- [ ] **Step 3: Verify in browser**

Serve and open the game, start a run. Turn **Capslock ON**. Confirm: `W/A/S/D` and `Q/E/Z/C` still move, `I` opens inventory, `G`/`P`/`L`/`U` still work, and `>`/`<`/`.` are unaffected. Turn Capslock off and confirm everything still works.

- [ ] **Step 4: Commit**

```bash
cd /root/COQ && git add src/game.js && git commit -m "Fix: Capslock no longer breaks movement/commands

Lowercase single-char keys in the in-game keydown dispatch so uppercased
e.key values (Capslock/Shift) still match the lowercase MOVES/command table.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Show stats on the equipped panel + relabel Sunder + charm effect

**Files:**
- Modify: `src/render.js:346-351` (equipped slot text)
- Modify: `src/render.js:387` (Sunder label)

- [ ] **Step 1: Append stat bonuses to each equipped slot**

In `src/render.js`, replace lines 346-351:

```javascript
  $("wepTxt").textContent=G.equipped.weapon?gearName(G.equipped.weapon):"bare fists";
  $("armTxt").textContent=G.equipped.armor?gearName(G.equipped.armor):"none";
  $("helmTxt").textContent=G.equipped.helmet?gearName(G.equipped.helmet):"none";
  $("shldTxt").textContent=G.equipped.shield?gearName(G.equipped.shield):"none";
  $("bootsTxt").textContent=G.equipped.boots?gearName(G.equipped.boots):"none";
  $("charmTxt").textContent=G.equipped.charm?G.equipped.charm.name:"none";
```

with:

```javascript
  $("wepTxt").textContent=G.equipped.weapon?`${gearName(G.equipped.weapon)} (+${gearBonus(G.equipped.weapon)} atk)`:"bare fists";
  $("armTxt").textContent=G.equipped.armor?`${gearName(G.equipped.armor)} (+${gearBonus(G.equipped.armor)} def)`:"none";
  $("helmTxt").textContent=G.equipped.helmet?`${gearName(G.equipped.helmet)} (+${gearBonus(G.equipped.helmet)} def)`:"none";
  $("shldTxt").textContent=G.equipped.shield?`${gearName(G.equipped.shield)} (+${gearBonus(G.equipped.shield)} def)`:"none";
  $("bootsTxt").textContent=G.equipped.boots?`${gearName(G.equipped.boots)} (+${gearBonus(G.equipped.boots)} def)`:"none";
  $("charmTxt").textContent=G.equipped.charm?`${G.equipped.charm.name}${charmDef(G.equipped.charm)?` — ${charmDef(G.equipped.charm).desc}`:""}`:"none";
```

(`gearBonus` and `charmDef` are already imported in render.js at line 12.)

- [ ] **Step 2: Relabel "Armor pierce" → "Sunder"**

In `src/render.js`, line 387 is:

```javascript
  if(G.player.armorPen>0)    sk.push(`Armor pierce ${G.player.armorPen}`);
```

Replace with:

```javascript
  if(G.player.armorPen>0)    sk.push(`Sunder (ignore ${G.player.armorPen} enemy defense)`);
```

- [ ] **Step 3: Verify in browser**

Start a run, equip a weapon and some armor (pick up gear, it auto-equips). Confirm the equipped panel now reads e.g. `iron sword (+3 atk)`, `plate greaves (+3 def)`, and a charm shows its effect. Level up and pick **Sunder**; confirm the Skills panel shows `Sunder (ignore 2 enemy defense)` instead of `Armor pierce 2`.

- [ ] **Step 4: Commit**

```bash
cd /root/COQ && git add src/render.js && git commit -m "Show equipped-item stats on HUD; label Sunder in skills

Each equipped slot now shows its atk/def bonus (and charms show their
effect). The Sunder perk reads as 'Sunder (ignore N enemy defense)'
instead of the unrecognizable 'Armor pierce N'.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Perk system — stacking with caps, binary own-once, no dead picks

**Files:**
- Modify: `src/player.js:18,26-35` (perk definitions) and `:50,53-54` (`makePlayer` defaults)
- Modify: `src/combat.js:65,98,139` (numeric consumers)
- Modify: `src/items.js:247` (Close Quarters def)
- Modify: `src/game.js:390` and `src/combat.js:85` (Lucky Find drop chance)
- Modify: `src/game.js:476-482` (picker eligibility filter)
- Modify: `src/render.js:392,394,396,397` and add a Lucky Find line (live numeric labels)

- [ ] **Step 1: Convert the five stacking perks to numeric with caps**

In `src/player.js`, replace the Giant Slayer line (26) and the Searing Blades / Deflect / Close Quarters / Lucky Find lines (28,30,31,33). The full replacements:

Line 26:
```javascript
  {name:"Giant Slayer",  w:2, desc:"Attacks deal bonus damage equal to 4% of target's max HP", apply(){ G.player.giantSlayer = true; }},
```
→
```javascript
  {name:"Giant Slayer",  w:0.4, key:"giantSlayer", cap:0.20, desc:"+4% of target's max HP as bonus damage (stacks to 20%)", apply(){ G.player.giantSlayer=Math.min(0.20, G.player.giantSlayer+0.04); }},
```

Line 28:
```javascript
  {name:"Searing Blades", w:2, desc:"Melee hits have 20% chance to Burn (3 turns)", apply(){ G.player.searingBlades = true; }},
```
→
```javascript
  {name:"Searing Blades", w:2, key:"searingBlades", cap:1.0, desc:"+10% chance to Burn on melee, 3 turns (stacks to 100%)", apply(){ G.player.searingBlades=Math.min(1.0, G.player.searingBlades+0.10); }},
```

Line 30:
```javascript
  {name:"Deflect",       w:2, desc:"+20% Dodge against ranged attacks", apply(){ G.player.deflect = true; }},
```
→
```javascript
  {name:"Deflect",       w:2, key:"deflect", cap:0.60, desc:"+15% Dodge against ranged attacks (stacks to 60%)", apply(){ G.player.deflect=Math.min(0.60, G.player.deflect+0.15); }},
```

Line 31:
```javascript
  {name:"Close Quarters", w:2, desc:"+3 Defense when adjacent to 2 or more enemies", apply(){ G.player.closeQuarters = true; }},
```
→
```javascript
  {name:"Close Quarters", w:2, key:"closeQuarters", cap:12, desc:"+3 Defense when adjacent to 2+ enemies (stacks to +12)", apply(){ G.player.closeQuarters=Math.min(12, G.player.closeQuarters+3); }},
```

Line 33:
```javascript
  {name:"Lucky Find",    w:2, desc:"Monsters have a 10% higher chance to drop loot", apply(){ G.player.luckyFind = true; }},
```
→
```javascript
  {name:"Lucky Find",    w:2, key:"luckyFind", cap:0.70, desc:"+10% monster drop chance (stacks to 70%)", apply(){ G.player.luckyFind=Math.min(0.70, G.player.luckyFind+0.10); }},
```

- [ ] **Step 2: Mark the five binary perks own-once**

In `src/player.js`, add `binary:true` and a `key` to each of the remaining Act II flag perks. Replace lines 27, 29, 32, 34, 35:

```javascript
  {name:"Second Wind",   w:2, desc:"+5 Attack and +15% Dodge when below 25% HP", apply(){ G.player.secondWind = true; }},
```
→
```javascript
  {name:"Second Wind",   w:2, binary:true, key:"secondWind", desc:"+5 Attack and +15% Dodge when below 25% HP", apply(){ G.player.secondWind = true; }},
```

```javascript
  {name:"Antidote",      w:2, desc:"Reduces duration of incoming poison/burn/bleed by 2 turns", apply(){ G.player.antidote = true; }},
```
→
```javascript
  {name:"Antidote",      w:2, binary:true, key:"antidote", desc:"Reduces duration of incoming poison/burn/bleed by 2 turns", apply(){ G.player.antidote = true; }},
```

```javascript
  {name:"Scavenger",     w:2, desc:"+25% gold found, 20% chance for gear to gain +1 enchant", apply(){ G.player.scavenger = true; }},
```
→
```javascript
  {name:"Scavenger",     w:2, binary:true, key:"scavenger", desc:"+25% gold found, 20% chance for gear to gain +1 enchant", apply(){ G.player.scavenger = true; }},
```

```javascript
  {name:"Catalyst",      w:1, desc:"Doubles the stats and effects of your equipped Charm", apply(){ G.player.catalyst = true; }},
```
→
```javascript
  {name:"Catalyst",      w:1, binary:true, key:"catalyst", desc:"Doubles the stats and effects of your equipped Charm", apply(){ G.player.catalyst = true; }},
```

```javascript
  {name:"Retribution",   w:1, desc:"Dodging a melee attack deals your Defense as damage to the attacker", apply(){ G.player.retribution = true; }},
```
→
```javascript
  {name:"Retribution",   w:1, binary:true, key:"retribution", desc:"Dodging a melee attack deals your Defense as damage to the attacker", apply(){ G.player.retribution = true; }},
```

- [ ] **Step 3: Update `makePlayer` defaults (boolean → numeric for the five stackers)**

In `src/player.js`, lines 53-54 currently read:

```javascript
        giantSlayer:false,secondWind:false,searingBlades:false,antidote:false,deflect:false,
        closeQuarters:false,scavenger:false,luckyFind:false,catalyst:false,retribution:false,
```

Replace with (numeric stackers default 0; binary perks stay false; add dash fields used later):

```javascript
        giantSlayer:0,secondWind:false,searingBlades:0,antidote:false,deflect:0,
        closeQuarters:0,scavenger:false,luckyFind:0,catalyst:false,retribution:false,
        dashCharges:0,dashRegen:0,
```

- [ ] **Step 4: Update numeric consumers in combat.js**

In `src/combat.js` line 65:
```javascript
  if(def.isPlayer && G.player.deflect && att.ranged) eva += 0.20;   // Deflect: dodge ranged shots
```
→
```javascript
  if(def.isPlayer && att.ranged) eva += G.player.deflect;   // Deflect: dodge ranged shots (stacking %)
```

Line 98:
```javascript
  if(att.isPlayer && G.player.giantSlayer) dmg += Math.floor(def.maxhp*0.04);
```
→
```javascript
  if(att.isPlayer && G.player.giantSlayer) dmg += Math.floor(def.maxhp*G.player.giantSlayer);
```

Line 139:
```javascript
  if(att.isPlayer && !ranged && G.player.searingBlades && def.alive!==false && def.hp>0 && Math.random()<0.20){
```
→
```javascript
  if(att.isPlayer && !ranged && G.player.searingBlades>0 && def.alive!==false && def.hp>0 && Math.random()<G.player.searingBlades){
```

- [ ] **Step 5: Update Close Quarters in items.js**

In `src/items.js` line 247:
```javascript
    if(adj>=2) d+=3;
```
→
```javascript
    if(adj>=2) d+=G.player.closeQuarters;
```

- [ ] **Step 6: Update Lucky Find drop chance (two call sites)**

In `src/game.js` line 390:
```javascript
      if(Math.random() < (G.player.luckyFind?0.40:0.30)){ const drop=rollLoot(m.x,m.y,G.depth); if(drop){ drop.x=m.x; drop.y=m.y; G.items.push(drop);} }
```
→
```javascript
      if(Math.random() < (0.30+G.player.luckyFind)){ const drop=rollLoot(m.x,m.y,G.depth); if(drop){ drop.x=m.x; drop.y=m.y; G.items.push(drop);} }
```

In `src/combat.js` line 85:
```javascript
          if(Math.random() < (G.player.luckyFind?0.40:0.30)){
```
→
```javascript
          if(Math.random() < (0.30+G.player.luckyFind)){
```

- [ ] **Step 7: Add the eligibility filter to the perk picker**

In `src/game.js`, `presentLevelUp()` currently builds the pool at line 476:

```javascript
function presentLevelUp(){
  G.choosing=true;
  const pool=PERKS.slice(); G.currentPerks=[];
```

Replace those three lines with:

```javascript
function presentLevelUp(){
  G.choosing=true;
  // Skip perks the player has already maxed: binary perks already owned, and
  // stacking perks whose value has hit its cap. Keeps every offered pick useful.
  const pool=PERKS.filter(p=>{
    if(p.binary) return !G.player[p.key];
    if(p.cap!=null) return (G.player[p.key]||0) < p.cap - 1e-9;
    return true;
  }); G.currentPerks=[];
```

The existing `while(G.currentPerks.length<3 && pool.length)` loop below already handles a pool smaller than 3, so no further change is needed there.

- [ ] **Step 8: Show live numeric values in the Skills panel**

In `src/render.js`, replace lines 392, 394, 396, 397:

Line 392:
```javascript
  if(G.player.giantSlayer)   sk.push("Giant Slayer (+4% of target max HP as dmg)");
```
→
```javascript
  if(G.player.giantSlayer>0) sk.push(`Giant Slayer (+${Math.round(G.player.giantSlayer*100)}% target max HP dmg)`);
```

Line 394:
```javascript
  if(G.player.searingBlades) sk.push("Searing Blades (20% melee burn)");
```
→
```javascript
  if(G.player.searingBlades>0) sk.push(`Searing Blades (${Math.round(G.player.searingBlades*100)}% melee burn)`);
```

Line 396:
```javascript
  if(G.player.deflect)       sk.push("Deflect (+20% dodge vs ranged)");
```
→
```javascript
  if(G.player.deflect>0)     sk.push(`Deflect (+${Math.round(G.player.deflect*100)}% dodge vs ranged)`);
```

Line 397:
```javascript
  if(G.player.closeQuarters) sk.push("Close Quarters (+3 def vs 2+ adjacent foes)");
```
→
```javascript
  if(G.player.closeQuarters>0) sk.push(`Close Quarters (+${G.player.closeQuarters} def vs 2+ adjacent foes)`);
```

Then add a Lucky Find readout (it currently isn't shown). Immediately after the Close Quarters line, add:

```javascript
  if(G.player.luckyFind>0)   sk.push(`Lucky Find (+${Math.round(G.player.luckyFind*100)}% drop chance)`);
```

- [ ] **Step 9: Verify in browser**

Start a run, press F1 (godmode) for safety, and grind a few levels (kill monsters). When the perk picker appears, repeatedly pick **Deflect** if offered; confirm the Skills panel climbs 15% → 30% → 45% → 60% and then **Deflect stops being offered**. Pick **Sunder** twice and confirm `armorPen` shows 4 (stacks, unchanged). Pick a binary perk (e.g. **Retribution**) and confirm it never reappears. Confirm Giant Slayer shows up rarely.

- [ ] **Step 10: Commit**

```bash
cd /root/COQ && git add src/player.js src/combat.js src/items.js src/game.js src/render.js && git commit -m "Perk rework: stacking perks with caps + no dead picks

Deflect (+15%/pick, cap 60%), Searing Blades (+10%, cap 100%), Lucky Find
(+10%, cap 70%), Giant Slayer (+4%, cap 20%, rarity 0.4), Close Quarters
(+3 def, cap 12) now stack and show live values. Binary perks (Second Wind,
Antidote, Scavenger, Catalyst, Retribution) and maxed stackers are filtered
out of the level-up picker so every choice is meaningful.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Zarakhel custom AI (Solar Dash + Enrage)

**Files:**
- Modify: `src/game.js:396-397` (inject AI block in `monstersTurn`)

- [ ] **Step 1: Confirm bosses carry an `atk` field**

The injected Enrage does `m.atk += 10`. Verify boss entities use `atk` (combat.js:93 reads `att.atk` for non-players). Quick check:

```bash
cd /root/COQ && grep -n "atk" src/bosses.js | head
```
Expected: boss stat construction sets an `atk` property. If the field has a different name, adapt the injected `m.atk` references to match before committing.

- [ ] **Step 2: Inject the AI block**

In `src/game.js`, line 396-397 currently read:

```javascript
    const sees=G.visible[m.y][m.x];

```

Insert the AI block immediately after line 396 (after `sees` is declared, before the blank line and the `m.regen` comment). The result:

```javascript
    const sees=G.visible[m.y][m.x];

    // --- ZARAKHEL CUSTOM AI ---
    if(m.name === "Zarakhel, the Unborn Sun" && sees) {
      // Enrage mechanic: If below 50% HP, gain a temporary attack boost on his turn
      if(m.hp < m.maxhp * 0.5 && !m._enraged) {
         m._enraged = true;
         m.atk += 10;
         log(`Zarakhel burns with a blinding intensity! His attacks grow fiercer!`, "bad");
      }

      // Solar Dash mechanic: If player is trying to kite (3 to 4 tiles away)
      if(!adj && dist >= 3 && dist <= 4 && los(m.x, m.y, G.player.x, G.player.y)) {
         const sx = Math.sign(dx), sy = Math.sign(dy);
         const dashX = G.player.x - sx;
         const dashY = G.player.y - sy;

         // Only dash if the destination tile directly adjacent to the player is free
         if(!blocked(dashX, dashY) && !monsterAt(dashX, dashY) && !occupied(dashX, dashY)) {
             // Leave a visual trail
             G.shots.push({x: m.x, y: m.y, col: "#ffd866"});
             m.x = dashX;
             m.y = dashY;
             log(`Zarakhel flashes across the room and strikes!`, "bad");
             attack(m, G.player);
             continue; // Turn complete, skip standard movement
         }
      }
    }
    // --- END ZARAKHEL AI ---

```

- [ ] **Step 3: Verify in browser**

This boss is on floor 40. Rather than play 40 floors, verify the code path doesn't error and the name-gate is inert for other monsters: start a normal run and confirm regular monsters behave exactly as before (no console errors, no stray dashes). For the boss itself, a focused check: confirm the `los`/`blocked`/`monsterAt`/`occupied`/`attack` calls resolve (no `ReferenceError` in console on any monster turn). If a deep playtest is desired, temporarily lower `FINAL_DEPTH` in `src/config.js` to a low number in a throwaway edit, reach the boss, confirm he dashes to close a 3–4 tile gap (yellow trail) and enrages under 50% HP, then revert the config change.

- [ ] **Step 4: Commit**

```bash
cd /root/COQ && git add src/game.js && git commit -m "Add Zarakhel boss AI: Solar Dash gap-closer + Enrage

The final boss now closes a 3-4 tile kite gap with a dashing strike
(yellow trail) and gains +10 attack once below 50% HP, so he can no
longer be kited to death indefinitely.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Dash core — charges, charm, leap, regen

**Files:**
- Modify: `src/items.js:27-39` (add Dash Charm) and add `dashMax()` helper
- Modify: `src/render.js:12` (import `dashMax`) and Skills panel (dash readout)
- Modify: `src/game.js` — move `G.shots` reset, add `dash()`, regen in `turn()`

- [ ] **Step 1: Add the Dash Charm**

In `src/items.js`, the `CHARMS` array ends at line 38 with the Savage Charm. Add a new entry. The last stat charm line is:

```javascript
  {id:"savage",  name:"Savage Charm",    desc:"+8% critical chance",       stat:{critBonus:0.08}},
```

Add directly after it (still inside the array):

```javascript
  {id:"dash",    name:"Dash Charm",      desc:"+1 dash charge",            dash:1},
```

- [ ] **Step 2: Add the `dashMax()` helper**

In `src/items.js`, add this exported function near the other gear helpers (e.g. just after the `charmDef` function at line 42):

```javascript
// Max dash charges: boots tier (leather 0, chain 1, plate greaves 2),
// legendary boots 3, plus +1 if a Dash Charm is equipped.
export function dashMax(){
  let n=0;
  const b=G.equipped.boots;
  if(b) n = b.legendary ? 3 : b.tier;
  const c=G.equipped.charm, cd=c&&charmDef(c);
  if(cd && cd.dash) n += cd.dash;
  return n;
}
```

- [ ] **Step 3: Import `dashMax` and show the dash readout**

In `src/render.js` line 12, add `dashMax` to the items.js import:

```javascript
import { effAtk, effDef, gearBonus, gearName, gearEvade, gearThorns, gearRegen, charmDef, ALL_SLOTS } from './items.js';
```
→
```javascript
import { effAtk, effDef, gearBonus, gearName, gearEvade, gearThorns, gearRegen, charmDef, ALL_SLOTS, dashMax } from './items.js';
```

Then in the Skills panel, near the top of the `sk` list (just after `const sk=[];` at line 379), add:

```javascript
  const dMax=dashMax();
  if(dMax>0) sk.push(`Dash ${G.player.dashCharges}/${dMax}${G.player.dashCharges<dMax?" (recharging)":""}`);
```

- [ ] **Step 4: Move the `G.shots` reset so player dash trails survive**

The player dash runs in `actionFn()` *before* `monstersTurn()`. Currently `monstersTurn()` clears `G.shots` at its top (game.js:382), which would erase the player's trail. Move the reset to the start of `turn()`.

In `src/game.js`, `monstersTurn()` begins (line 381-382):

```javascript
function monstersTurn(){
  G.shots=[];
  for(let i=1;i<G.ents.length;i++){
```

Remove the reset line:

```javascript
function monstersTurn(){
  for(let i=1;i<G.ents.length;i++){
```

Then in `turn()` (line 449-450), which begins:

```javascript
function turn(actionFn){
  if(!G.running||!G.started||G.choosing||G.shopping) return;   // ignore input while a modal is open
  const tookTurn=actionFn();
```

add the reset right before `actionFn()` runs:

```javascript
function turn(actionFn){
  if(!G.running||!G.started||G.choosing||G.shopping) return;   // ignore input while a modal is open
  G.shots=[];                                       // clear last frame's shots/trails before this turn acts
  const tookTurn=actionFn();
```

- [ ] **Step 5: Add the `dash()` action**

In `src/game.js`, add this function next to `playerMove` (after `playerMove` ends at line 273). It also needs `dashMax` imported — add it to the items.js import at the top of game.js.

First, find the items.js import line in `src/game.js` (it imports `effAtk`, `gearName`, etc.) and add `dashMax` to it. Confirm with:

```bash
cd /root/COQ && grep -n "from './items.js'" src/game.js
```
Add `dashMax` to that import list.

Then add the function:

```javascript
// Dash: leap up to 2 tiles in a direction. Pure movement — stops at walls,
// monsters, and the merchant. Costs 1 charge; a blocked dash costs nothing and
// is not a turn. A successful dash leaves a short trail and ends the turn.
function dash(dx,dy){
  if(dashMax()<=0){ log("You have no dash — find better boots or a Dash Charm.","bad"); return false; }
  if(G.player.dashCharges<=0){ log("Dash is still recharging.","bad"); return false; }
  let steps=0, cx=G.player.x, cy=G.player.y; const trail=[];
  for(let s=1;s<=2;s++){
    const tx=G.player.x+dx*s, ty=G.player.y+dy*s;
    if(blocked(tx,ty)||monsterAt(tx,ty)||occupied(tx,ty)||(tx===G.player.x&&ty===G.player.y)) break;
    cx=tx; cy=ty; steps=s; trail.push({x:tx,y:ty});
  }
  if(steps===0){ log("You can't dash there.","bad"); return false; }   // no move, no charge, no turn
  for(const t of trail) G.shots.push({x:t.x,y:t.y,col:"#7ad0ff"});
  G.player.x=cx; G.player.y=cy;
  G.player.dashCharges--;
  log(`You dash ${steps} tile${steps>1?"s":""}!`,"good");
  return true;
}
```

- [ ] **Step 6: Regenerate a charge every 5 turns**

In `src/game.js`, inside `turn()`'s `if(tookTurn){ ... }` block, the regen for HP is computed around lines 459-466. Add dash regen right after the FOV recompute (`computeFOV();`) near the end of that block, before its closing brace. Insert:

```javascript
    // Dash recharge: 1 charge per 5 turns, capped at the current max (clamps down
    // if boots/charm changed and max shrank).
    if(G.player.alive){
      const dMax=dashMax();
      if(G.player.dashCharges>dMax) G.player.dashCharges=dMax;
      if(G.player.dashCharges<dMax){
        if(++G.player.dashRegen>=5){ G.player.dashRegen=0; G.player.dashCharges++; }
      } else G.player.dashRegen=0;
    }
```

- [ ] **Step 7: Verify in browser**

Start a run. With no boots, the Skills panel shows no Dash line and pressing the dash control logs "You have no dash." Pick up/equip **plate greaves** (or any tier-1+ boots) — confirm a `Dash 0/2` readout appears and fills to `2/2` after ~10 turns (1 per 5 turns). (Dash *controls* are wired in Task 6; for now you can verify the readout and regen by watching the HUD across turns. To test the action directly before Task 6, temporarily call `dash(1,0)` is not necessary — proceed to Task 6 for full control testing.)

- [ ] **Step 8: Commit**

```bash
cd /root/COQ && git add src/items.js src/render.js src/game.js && git commit -m "Add Dash core: charges from boots/charm, 5-turn regen, leap action

dashMax() = boots tier (0/1/2) or 3 for legendary boots, +1 for the new
Dash Charm. Charges regenerate 1 per 5 turns (the '5-turn cooldown') up to
max. dash() leaps up to 2 tiles, stops at walls/monsters/merchant, costs a
charge and a turn on success, nothing on a blocked attempt. G.shots reset
moved to turn() start so dash trails render.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Dash controls — desktop (Space+dir) and mobile (toggle button)

**Files:**
- Modify: `src/game.js` (keydown/keyup, touch handler, reset `G.dashArmed`)
- Modify: `index.html:369-376` (add Dash button) + a little CSS for the active state

- [ ] **Step 1: Track Space-held for desktop dash**

In `src/game.js`, add a module-level flag and a keyup listener. Put the flag declaration just above the `window.addEventListener("keydown",...)` at line 729:

```javascript
let spaceHeld=false;
window.addEventListener("keyup",e=>{ if(e.key===" ") spaceHeld=false; });
```

- [ ] **Step 2: Handle Space and Space+direction in the in-game keydown**

In `src/game.js`, the in-game dispatch (after the Task 1 lowercasing) starts around line 767 with `const k=...`. The movement line is:

```javascript
  if(MOVES[k]){ e.preventDefault(); turn(()=>playerMove(...MOVES[k])); return; }
```

Insert, immediately *before* that line, the Space arming and the Space+direction dash:

```javascript
  if(k===" "){ e.preventDefault(); spaceHeld=true; return; }      // hold Space to arm a dash
  if(spaceHeld && MOVES[k]){ e.preventDefault(); turn(()=>dash(...MOVES[k])); return; }
```

(Because `MOVES` includes both letters and `ArrowUp`/etc., Space + WASD, Space + QEZC, and Space + arrows all dash.)

- [ ] **Step 3: Add the mobile Dash toggle button to the HTML**

In `index.html`, the action row (lines 369-376) ends with the `menu` button. Add a Dash button. Replace:

```html
        <button data-act="inventory">pack (I)</button>
        <button data-act="menu">menu</button>
```
with:
```html
        <button data-act="inventory">pack (I)</button>
        <button data-act="dash" id="dashBtn">dash</button>
        <button data-act="menu">menu</button>
```

- [ ] **Step 4: Add a CSS active state for the armed Dash button**

In `index.html`, add a small rule in the `<style>` block (near the touch/acts styles). Add:

```css
      .acts button.armed{ background:var(--amber); color:#1a1206; box-shadow:0 0 10px rgba(255,216,102,.6); }
```

(If `--amber` isn't in scope there, use `#ffd866`.)

- [ ] **Step 5: Wire the touch handler for arm + dash**

In `src/game.js`, the touch click handler (lines 779-793). The movement branch is:

```javascript
  if(b.dataset.mv){ const[dx,dy]=b.dataset.mv.split(",").map(Number); turn(()=>playerMove(dx,dy)); }
```

Replace with (consume the armed state to dash instead of move):

```javascript
  if(b.dataset.mv){
    const[dx,dy]=b.dataset.mv.split(",").map(Number);
    if(G.dashArmed){ G.dashArmed=false; updateDashBtn(); turn(()=>dash(dx,dy)); }
    else turn(()=>playerMove(dx,dy));
  }
```

In the `data-act` branch of the same handler, add a `dash` case alongside the others (e.g. after the `inventory` case):

```javascript
    else if(a==="dash"){ G.dashArmed=!G.dashArmed; updateDashBtn(); }
```

Then add the helper near the touch wiring:

```javascript
function updateDashBtn(){ const b=$("dashBtn"); if(b) b.classList.toggle("armed", !!G.dashArmed); }
```

- [ ] **Step 6: Reset `G.dashArmed` on new game**

In `src/game.js`, the two reset sites (around lines 539 and 559) set `G.shopping=false` etc. Add `G.dashArmed=false;` to both so a fresh run starts disarmed. For example:

```javascript
  G.levels={}; G.upX=-1; G.upY=-1; G.merchant=null; G.shopping=false; G.chests=[];
```
becomes (both occurrences):
```javascript
  G.levels={}; G.upX=-1; G.upY=-1; G.merchant=null; G.shopping=false; G.chests=[]; G.dashArmed=false;
```

- [ ] **Step 7: Verify in browser**

Equip boots so you have charges. **Desktop:** hold **Space** and tap a direction — confirm you leap up to 2 tiles (blue trail), a charge is spent (`Dash 1/2`), and monsters take their turn. Dash into a wall and confirm nothing happens (no charge lost, no turn). Release Space and confirm normal movement resumes. **Mobile (resize browser / touch emulation):** tap **dash** (button highlights), tap a direction — confirm it dashes and the button un-highlights. Tap dash twice to toggle off without moving.

- [ ] **Step 8: Commit**

```bash
cd /root/COQ && git add src/game.js index.html && git commit -m "Add Dash controls: hold Space+direction (desktop), toggle button (mobile)

Desktop holds Space to arm a directional dash; mobile gets a 'dash' toggle
button that arms the next directional tap and un-toggles after use. G.dashArmed
resets on new game.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Merchant panel — equipped gear + stats, enriched sell list

**Files:**
- Modify: `index.html:328-342` (add an equipped/stats column to `#shop`)
- Modify: `src/game.js:620-631` (`renderShop` populates it; sell rows show stats)

- [ ] **Step 1: Add an equipped/stats panel to the shop markup**

In `index.html`, the shop's `.shopcols` block (331-340) has Buy and Sell columns. Add a third column for your gear. Replace:

```html
        <div class="shopcols">
          <div class="shopcol">
            <div class="shoph">Buy</div>
            <div id="buyList"></div>
          </div>
          <div class="shopcol">
            <div class="shoph">Sell from pack</div>
            <div id="sellList"></div>
          </div>
        </div>
```

with:

```html
        <div class="shopcols">
          <div class="shopcol">
            <div class="shoph">Buy</div>
            <div id="buyList"></div>
          </div>
          <div class="shopcol">
            <div class="shoph">Sell from pack</div>
            <div id="sellList"></div>
          </div>
          <div class="shopcol">
            <div class="shoph">Your gear</div>
            <div id="shopGear"></div>
          </div>
        </div>
```

- [ ] **Step 2: Populate the gear panel and enrich sell rows in `renderShop`**

In `src/game.js`, `renderShop()` (620-631). The sell-list block currently is:

```javascript
  if(G.inv.length===0) $("sellList").innerHTML='<div class="shopempty">pack is empty</div>';
  else $("sellList").innerHTML=G.inv.map((it,i)=>
    `<div class="shopitem" data-sell="${i}">
       <span>${gearName(it)}</span><span class="pr">+${sellPrice(it)}g</span></div>`).join("");
}
```

Replace it with (adds a stat suffix to each sell row and renders the gear panel):

```javascript
  if(G.inv.length===0) $("sellList").innerHTML='<div class="shopempty">pack is empty</div>';
  else $("sellList").innerHTML=G.inv.map((it,i)=>{
    const stat = it.kind==="charm" ? "charm"
               : it.kind==="weapon" ? `+${gearBonus(it)} atk`
               : `+${gearBonus(it)} def`;
    return `<div class="shopitem" data-sell="${i}">
       <span>${gearName(it)} <small style="color:#8a7a55">${stat}</small></span><span class="pr">+${sellPrice(it)}g</span></div>`;
  }).join("");
  // equipped gear + live stats so the player can compare before buying/selling
  const slotLine=(label,slot,kindUnit)=>{
    const it=G.equipped[slot];
    if(!it) return `<div class="shopitem"><span>${label}</span><span class="pr" style="color:#5f5849">—</span></div>`;
    const val = slot==="weapon" ? `+${gearBonus(it)} atk`
              : slot==="charm" ? (charmDef(it)?charmDef(it).desc:"charm")
              : `+${gearBonus(it)} def`;
    return `<div class="shopitem"><span>${gearName(it)}</span><span class="pr">${val}</span></div>`;
  };
  $("shopGear").innerHTML =
    `<div class="shopitem"><span>Attack</span><span class="pr">${effAtk()}</span></div>`+
    `<div class="shopitem"><span>Defense</span><span class="pr">${effDef()}</span></div>`+
    slotLine("(weapon)","weapon")+slotLine("(armor)","armor")+slotLine("(helmet)","helmet")+
    slotLine("(shield)","shield")+slotLine("(boots)","boots")+slotLine("(charm)","charm");
}
```

- [ ] **Step 3: Ensure helpers are imported in game.js**

`renderShop` now uses `effAtk`, `effDef`, `gearBonus`, `charmDef`, `gearName`. Confirm they're imported from items.js in game.js:

```bash
cd /root/COQ && grep -n "from './items.js'" src/game.js
```
Add any missing names (`effAtk`, `effDef`, `gearBonus`, `charmDef`) to that import.

- [ ] **Step 4: Verify in browser**

Walk into the merchant. Confirm a third "Your gear" column shows live **Attack**/**Defense** and each equipped slot with its bonus (or `—` when empty), and that the **Sell from pack** rows now show `+N atk`/`+N def`/`charm` next to each item. Buy/sell something and confirm the gear panel and stats update live. Confirm narrow/mobile width still lays out acceptably (the column wraps under the others).

- [ ] **Step 5: Commit**

```bash
cd /root/COQ && git add index.html src/game.js && git commit -m "Merchant: add live equipped-gear/stats panel + stats on sell rows

The shop now shows your current Attack/Defense and every equipped slot with
its bonus, and each 'sell from pack' row shows the item's stat, so you can
compare and sell from your inventory with full info.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification pass

- [ ] Hard-refresh and play a short run touching every change: move with Capslock on; equip gear and read the stat-annotated HUD; level up and confirm stacking/own-once perk behavior; equip boots + dash with Space+dir and the mobile toggle; visit the merchant and confirm the gear panel. Watch the browser console for errors throughout.
- [ ] `git log --oneline -8` to confirm one commit per task.

## Notes / deferred

- **§8 "frostbite of the abyss"** from the spec is **not** in this plan — it was a fragmentary report with no described symptom. Pick it up once the user describes what went wrong (suspected: a confusing generated item name combining the `Frostbite` weapon / `of the Abyss` suffix / `Treads of the Abyss` boots).
- **Dash first-equip feel:** by design, charges start at 0 and fill via regen (5 turns each), so freshly equipped legendary boots take ~15 turns to reach 3 dashes. If this feels bad in playtest, a one-line tweak can grant 1 charge immediately on a max increase — flagged for post-playtest tuning, not implemented now.
