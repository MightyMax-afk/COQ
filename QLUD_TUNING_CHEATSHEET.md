# Caves of Qlud — Tuning Cheat Sheet
### for build v0.17.0

Every number you'd want to tweak, where it lives, and what it does. Line numbers
are for **v0.15.1** — they'll drift a little if you add/remove lines, so each entry
also gives a **search string** you can paste into your editor's Find (Ctrl/Cmd-F)
to jump straight to it. Everything is inside the single `<script>` block.

> **How to find anything fast:** open the file in any text editor, hit Find, paste
> the `search:` text. That always beats trusting a line number.

> **Tip:** after editing, just reload the `.html` in your browser. No build step.
> If the game won't load after an edit, you probably broke a comma or bracket —
> undo and try again.

---

## 0. The two most important dials

If you only remember two things:

| What | Line | Search | Now |
|---|---|---|---|
| **Monster HP growth per floor** | ~3383 | `const hpMul  = Math.pow` | `1.06` (≈+6%/floor) |
| **Monster attack growth per floor** | ~3384 | `const atkMul = Math.pow` | `1.05` (≈+5%/floor) |

Raise these → game gets harder deeper. Lower → easier. `1.06` means "6% more each
floor, compounding." At depth 40 that's about ×9.7 HP. Bumping to `1.08` roughly
doubles end-game HP; dropping to `1.04` roughly halves it.

---

## 1. Monster base stats (before depth scaling)

**Act I commons** — line ~3363 · search: `name:"rat",          maxhp:4`

These are the stats every monster starts from at depth 1, before scaling multiplies them.

```
rat            maxhp:4   atk:2  def:0  xp:3   evade:0.15
goblin         maxhp:8   atk:3  def:1  xp:6   evade:0.08
goblin archer  maxhp:6   atk:4  def:0  xp:9   evade:0.10  ranged range:5
orc            maxhp:14  atk:5  def:2  xp:12  evade:0.04  regen:1
troll          maxhp:24  atk:8  def:3  xp:25  evade:0      regen:2
dark mage      maxhp:12  atk:7  def:1  xp:20  evade:0.06  ranged range:6 regen:1
```

**Act II commons** — line ~3371 · search: `name:"wraith"`

Only spawn on Act II floors (21-40), biome-gated. Same scaling formula applies.

```
wraith         maxhp:14  atk:6  def:0  xp:18  evade:0.22                       (highest evade in the game)
carrion hound  maxhp:8   atk:5  def:0  xp:8   evade:0.10
acid spitter   maxhp:10  atk:5  def:1  xp:13  evade:0.05  ranged range:4       eliteStatus:poison 3t/2
glass husk     maxhp:16  atk:7  def:5  xp:20  evade:0.02                       (tanky, low evade)
cinderling     maxhp:7   atk:5  def:0  xp:11  evade:0.08
brine stalker  maxhp:22  atk:8  def:2  xp:22  evade:0     regen:1
bone knight    maxhp:30  atk:9  def:4  xp:28  evade:0.04                       (mini-elite stats)
```

- `maxhp` health · `atk` attack · `def` damage subtracted from incoming hits
- `xp` experience you gain for the kill · `evade` chance (0–1) to dodge your hits
- `ranged` + `range` = attacks from afar (and only fires every other turn, by design)
- `regen` = HP healed per turn (suppressed while burning/poisoned/bleeding)
- `eliteStatus` = applies a status condition when it hits you (acid spitter's poison)

To make, e.g., trolls beefier: change `maxhp:24` → `maxhp:35` on the troll line.
To make wraiths even slipperier: change `evade:0.22` → `0.28`.

---

## 2. How often each monster type appears (spawn weights)

These are *weights*, not percentages — higher weight = shows up more.

**Act I weights** — line ~3325 · search: `let wRat`

Active on *every* floor (Act II floors still have these in the pool too).
The Act I weights shift with depth `d` (= scaled depth, climbs into NG+):

```
wRat    = max(6, 50 - d*4)              rats common early, fade out
wGob    = 30                             goblins steady throughout
wArcher = d<=2 ? 6 : min(34, 8+(d-2)*4)  archers ramp up after floor 2
wOrc    = d<=3 ? 4 : min(40, 6+(d-3)*5)  orcs ramp up after floor 3
wTroll  = d<=4 ? 1 : min(28, (d-4)*3)    trolls after floor 4
wMage   = d<=4 ? 0 : min(24, (d-4)*4)    mages after floor 4
```

**Act II weights** — line ~3352 · search: `const wWraith`

Biome-gated — each new monster is `0` outside its biome, fixed value inside.
The biome is looked up by the **unscaled** floor number (`depth`, 1–40), so NG+
Act I floors still get only Act I monsters.

```
wWraith  = (Reliquary || Citadel)       ? 40 : 0
wHound   = (Ashen     || Verdant)       ? 44 : 0
wSpitter = (Verdant   || Reliquary)     ? 36 : 0     ranged + poison-on-hit
wHusk    = (Ashen     || Citadel)       ? 34 : 0
wCinder  = (Ashen     || Citadel)       ? 38 : 0
wBrine   = (Reliquary)                  ? 40 : 0
wBoneKn  = (Citadel   || Ashen)         ? 30 : 0     mini-elite tier
```

Biome bands: Reliquary 21-25 · Ashen 26-30 · Verdant 31-35 · Citadel 36-40.

Want more trolls deep? Raise the `28` cap or the `*3` rate on `wTroll`.
Want zero mages ever? Set `wMage` to `0`.
Want acid spitters in the Citadel too? Add `|| inCitadel` to the `wSpitter` condition.
Want to swap a creature into Act I? Change e.g. `(inReliquary || inCitadel)` to `true` and pick a small weight (~6) so it doesn't dominate.

---

## 3. Monster depth scaling (the difficulty curve)

**Line ~3305** · search: `depth scaling: COMPOUND`

```
hpMul  = Math.pow(1.06, d-1)   // HP × this. 1.06 = +6%/floor compounding
atkMul = Math.pow(1.05, d-1)   // attack × this. 1.05 = +5%/floor
m.def  += Math.floor((d-1)/3)  // +1 defense every 3 floors
m.xp    = Math.round(m.xp*Math.pow(1.12,d-1))  // XP reward grows +12%/floor
if(m.regen) m.regen += Math.floor((d-1)/4)     // regen +1 every 4 floors
```

- **The big two are `hpMul` and `atkMul`** (see section 0).
- `def` term: `(d-1)/3` → defense +1 every 3 floors. Change the `3` to `2` for
  faster armor growth, `4` for slower.
- `xp` term: only affects how fast you level. Doesn't change danger.

Quick reference for `1.06`/`1.05` at key depths:

| depth | HP × | atk × |
|---|---|---|
| 10 | 1.7 | 1.6 |
| 20 | 3.0 | 2.5 |
| 30 | 5.4 | 4.1 |
| 40 | 9.7 | 6.7 |

`d` here is the **scaled depth** — it keeps climbing in New Game+ (NG+ floor 1 = depth 41).

---

## 4. Elites (the gold-tinted tough variants)

**Spawn chance** · line ~3228 · search: `ri(1,100)<=15`
```
if(!isMerchantFloor && rooms.length>1 && ri(1,100)<=15){   // 15% chance of one elite per floor
```
Change `15` to taste (e.g. `25` for more elites, `5` for rare).

**Elite stat multipliers** · line ~3311 · search: `m.maxhp=Math.round(m.maxhp*1.8)`
```
m.maxhp = m.maxhp * 1.8    // 80% more HP than a normal monster of that type
m.atk   = m.atk   * 1.6    // 60% more attack
m.xp    = m.xp    * 2.2    // 2.2× the XP reward
```

**Elite skills** (one is rolled at random) · line ~3301 · search: `const ELITE_SKILLS`
```
vampiric   heals itself for 40% of the damage it deals to you   (m.atk*0.4)
swift      +0.18 evade, +0.15 accuracy
venomous   poisons you on hit (turns:3, amount = d*0.4)
brutal     30% chance to hit twice                              (eliteCrit=0.30)
armored    +defense: round(2 + its def * 0.35)
```
The numbers in parentheses are the knobs. e.g. make "brutal" scarier with `0.30` → `0.50`.

---

## 5. Bosses

**The boss roster (names/colors/order)** · line ~2892 · search: `const BOSS_DEFS`
40 entries, one per floor. #20 is Varmathrax (end of Act I), #40 is Zarakhel (the win).
Edit names/glyphs/colors here. To reorder which boss is on which floor, reorder the list.

**Boss stat formulas** · line ~2949 · search: `const hp = heavy`
```
heavy = isFinal || isAct1End          // Varmathrax (20) + Zarakhel (40) use the big curve

heavy = isFinal || isAct1End          // Varmathrax (20) + Zarakhel (40)
act1  = sd <= ACT1_END                // act-band gate (uses scaled depth)
hpBase  = act1 ? 1.085 : 1.08         // Act I bosses bumped in v0.17.0
atkBase = act1 ? 1.075 : 1.07

hp  = heavy ? 620 * hpBase^(sd-20)    // act-enders: 620 base
            :  55 * hpBase^(sd-1)     // every other boss: 55 base
atk = heavy ?  32 * atkBase^(sd-20)
            :   7 * atkBase^(sd-1)
def    = round(2 + sd*0.45)           // boss defense grows 0.45/floor
regen  = max(2, round(sd*0.45))       // bosses only regen when they can't see you
```
- `sd` = scaled depth. `620`/`55` are the HP bases; `1.08` is the boss HP growth.
- To make ALL bosses easier, drop `hpBase`/`atkBase` constants (the `act1` gate is per-act).
  To soften just the two big ones, change the `620` base or its multiplier.
- `def:Math.round(2+sd*0.45)` — boss armor. Lower the `0.45` if bosses feel spongy.

**Ranged bosses** · line ~2961 · search: `if(floor===4||floor===7)`
The Pale Widow (floor 4) and Emberlich (floor 7) shoot. Add floor numbers to give
more bosses ranged attacks.

**Boss intro text** · search: `rears up — there is no way down`

---

## 6. Player starting stats

**Line ~4154** · search: `baseAtk:4,baseDef:1,maxhp:32`
```
baseAtk:4   baseDef:1   maxhp:32   hp:32   level:1   xp:0   xpNext:30
sight:FOV_R regenAmt:0  lifesteal:0 potionBonus:0
evasion:0   accBonus:0  critBonus:0 armorPen:0  thornsSelf:0  hitLeech:0
```
This is who you are at the start of a fresh run. Want to test deep floors without
grinding? Temporarily bump `maxhp:32` → `maxhp:9999` and `baseAtk:4` → `baseAtk:999`.
(Or just press **F1** in-game for godmode — no damage taken.)

**Starting resources** · line ~4769 · search: `gold=0; score=0; potions=2`
```
gold=0   potions=2
```

---

## 7. Player progression

**XP curve** · line ~3693 · search: `player.xpNext=Math.round(player.xpNext*1.6)`
```
xpNext *= 1.6    // each level costs 60% more XP than the last
```
Start cost is `xpNext:30` (section 6). Lower the `1.6` to level up faster.

**Per-floor descent reward** · line ~2882 · search: `player.maxhp+=2`
```
player.maxhp += 2   // +2 max HP each time you reach a NEW deepest floor
player.hp = min(maxhp, hp+6)   // and a small +6 heal
```
(Only triggers on a genuinely new depth — no farming by going up/down.)

**Level-up perks** (the 3-choice boons) · line ~2866 · search: `const PERKS`
Each has a weight `w` (higher = offered more often) and an `apply()` with the effect.
```
Vitality     w:3  +10 max HP, heal to full
Power        w:3  +2 attack
Toughness    w:3  +2 defense
Keen Eyes    w:2  +1 sight radius (cap 13)
Regeneration w:1  +1 HP / 9 turns
Bloodletter  w:2  +2 HP per kill
Alchemy      w:2  potions heal +8 more
Berserker    w:2  +4 attack, -1 defense
Evasion      w:2  +8% dodge
Precision    w:3  +8% accuracy
Deadly Aim   w:2  +10% crit
Sunder       w:2  ignore 2 enemy defense
Iron Skin    w:2  +3 defense, +5 max HP
Spiked Hide  w:2  reflect damage when hit (+1/stack)
Hardy        w:1  +20 max HP, heal to full
Executioner  w:1  +2 attack, +6% crit
Vampire      w:0.4 +1 HP per hit (very rare)
Adrenaline   w:2  +12% accuracy, +6% dodge
```
Edit the number inside `apply(){...}` to change strength; edit `w:` to change how
often it's offered (`w:0` = never).

---

## 8. Combat math (hit chance, damage, crits)

**Hit chance** · line ~3581 · search: `let acc = att.isPlayer`
```
player acc = 0.90 + accBonus + charm acc (+ weapon acc)
monster acc = 0.85 + its acc
hit if random < clamp(acc - target_evade, 0.35, 0.99)
```
- `0.90` = your base hit chance. `0.85` = monsters'. 
- `clamp(..., 0.35, 0.99)`: even a dodgy target is hit ≥35% of the time, and nothing
  is ever a guaranteed miss/hit beyond 99%.

**Damage** · line ~3598 · search: `let dmg = Math.max(1, a - d + ri(-1,2))`
```
dmg = max(1, attacker_atk - defender_def + random(-1..+2))
```

**Anti-stonewall floor (the "elites aren't invincible" rule)** · line ~3603 · search: `floorDmg = Math.max(1, Math.round(def.maxhp*0.03)`
```
your hits always deal at least 3% of the target's max HP   (def.maxhp*0.03)
```
Raise the `0.03` → you punch through armor harder. Lower → armor matters more.

**Crit** · line ~3607 · search: `critChance = Math.min(0.50`
```
crit chance = min(0.50, critBonus + weapon crit)   // doubles damage, capped at 50%
```

---

## 9. Loot

**Floor loot roll** (what you find on the ground) · line ~3398 · search: `if(t<=8) return`
```
t<=8    → potion (heal 12)
t<=34   → gold (value = random(5..15) * depth)
rest    → gear (a weapon/armor/helmet/shield)
```
The `8` and `34` are out of 100. Widen the potion band (`t<=8` → `t<=15`) for more potions.

**Gear tiers** · line ~2849 · search: `const WEAPONS`
```
WEAPONS: dagger(atk2) short sword(4) battle axe(7) war hammer(10)
armor:   leather(def1) chain(3) plate(6)
helmet:  leather cap(1) iron helm(2) great helm(4)
shield:  wooden(1) kite(3) tower(5)
```
These are the base bonuses per tier. The ladder tops out fairly early — deeper power
comes from enchantment (next item).

**Gear quality with depth (the "better loot deeper" system)** · line ~3416 · search: `const baked = Math.floor((d-6)/3)`
```
tier = min(maxTier, random(0 .. (weapon?1:0) + depth/3))   // reaches max tier ~depth 9
once at max tier and depth>6:
  baked = floor((depth-6)/3)        // +1 enchant per ~3 floors past depth 6
  ench  = max(0, baked + random(-1..+1))
```
- Enchant adds `+3 atk` per level to weapons, `+2 def` per level to armor
  (line ~3403, search: `it.ench*(it.kind`).
- Want loot to scale faster deep? Change `(d-6)/3` → `(d-6)/2`.

**Legendaries** (guaranteed from act-end bosses + elites, rare from others) · line ~3076 · search: `atk=10+Math.round(d*2.2)`
```
legendary weapon atk = 10 + depth*2.2 + random(0..6)   // v0.17.0: bumped 1.4 -> 2.2
legendary armor  def = 4 + depth*1.1 + random(0..3)   // v0.17.0: bumped 0.7 -> 1.1
```

---

## 10. Spawn density & the map

**Monsters per room** · line ~3218 · search: `const n=ri(0, Math.min(5`
```
n = random(0 .. min(5, 2 + depth/6))   // capped at 5 per room
```
This is the "too many enemies at the end" knob. Raise the `5` cap for denser floors,
lower it for sparser. The `depth/6` controls how fast it ramps.

**Map size & view** · line ~521 · search: `const MAP_W = 50`
```
MAP_W = 50   MAP_H = 30   FOV_R = 8   // map width/height, sight radius
```

**Merchant frequency** · line ~3096 · search: `const MERCHANT_EVERY=4`
```
MERCHANT_EVERY = 4   // a shop every 4 floors (4, 8, 12, ... not on the final floor)
```

**Shop stock** · line ~4811 · search: `const nPot=ri(1,10)`
```
nPot = random(1..10) healing potions; gear stocked alongside
```

---

## 11. Act / depth structure

**Line ~2834** · search: `const ACT1_END = 20`
```
ACT1_END    = 20   // Varmathrax's floor — Act I ends, descent continues
FINAL_DEPTH = 40   // Zarakhel's floor — beating him wins the run
```

**Biome bands** · search: `function biomeFor`
```
depth 1-5 Halls · 6-10 Crypt · 11-15 Caverns · 16-20 Infernal
     21-25 Reliquary · 26-30 Ashen · 31-35 Verdant · 36-40 Citadel
```
Cycles per NG+ tier. The biome list itself is `const BIOMES` just above `biomeFor`.

**Upstairs allowed** · search: `const upAllowed`
```
depths 2-10 and 22-30 (first 10 floors of each act)
```

---

## 12. Quick recipes

**"I want the whole game easier."**
→ Section 0: drop `hpMul` to `1.04` and `atkMul` to `1.04`. Also drop boss `1.08`→`1.05` (section 5).

**"I want to test the late floors right now."**
→ Press **F1** in game (godmode). Or bump starting `maxhp`/`baseAtk` (section 6).
   To jump floors, the dev way is the browser console: type `depth=35; genLevel('down'); render()`.

**"Deep floors are a swarm."**
→ Section 10: lower the `5` cap in `const n=ri(0, Math.min(5, ...))`.

**"Loot still feels weak at the bottom."**
→ Section 9: change `(d-6)/3` to `(d-6)/2` so enchants pile up faster, and/or
   bump the legendary formulas `depth*1.4` / `depth*0.7`.

**"Bosses are damage sponges."**
→ Section 5: lower the boss HP base (`55`/`620`) or its growth (`1.08`).

**"Elites are still too tanky."**
→ Section 8: raise the anti-stonewall `0.03` to `0.05`. And/or section 4: lower the
   elite HP multiplier `1.8`.

---

*Built for Caves of Qlud v0.17.0. If a search string ever fails, the code was
edited since — search for a nearby unique word instead.*
