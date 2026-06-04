# COQ: control hint, log scroll, boss rebalance, hidden test gauntlet

Date: 2026-06-03
Status: approved (design)

Four independent changes batched into one release.

## 1. Dash control hint (PC)

**Problem:** The footer controls reference in `index.html` lists every key
except dash. On desktop, dash is "hold `Space` + a direction", which is
undiscoverable.

**Change:** Add a dash entry to the footer controls line (`index.html:443-444`),
using the existing `<kbd>` styling, e.g. `dash <kbd>Space</kbd>+dir`. No other
UI changes. Mobile already exposes a `dash` button.

## 2. Log scroll fix

**Problem:** `render.js:388` runs `lg.scrollTop = lg.scrollHeight` on every
render, so any attempt to scroll up through the log snaps back to the bottom on
the next render.

**Change:** "Stick only if already at bottom." Before rewriting `lg.innerHTML`,
measure whether the user is at (or within a few px of) the bottom. Only re-pin
to the bottom afterward if they were. If they've scrolled up to read history,
new lines no longer yank them down. During normal play they're at the bottom,
so messages still auto-follow.

Threshold: treat `scrollHeight - clientHeight - scrollTop <= ~4px` as "at
bottom".

## 3. Final boss rebalance (Zarakhel)

Player feedback: even with dash, Zarakhel catches up and the fight is a marathon
where one mistake wipes the run. Per-hit damage is intentionally kept scary; the
two levers to dial down are the gap-closer and HP/fight length.

### 3a. Solar Dash cooldown (`game.js`, Zarakhel AI ~line 483)

Currently the Solar Dash gap-closer fires *every* turn the player is 3-4 tiles
away with line of sight, so kiting/dashing never creates distance.

Add a cooldown: when the dash fires, set `m._solarCd = 4`. Decrement `_solarCd`
on each of Zarakhel's turns. The dash may only fire when `_solarCd` is absent or
`<= 0`. After a flash-close, the player gets a ~4-turn window in which Zarakhel
can only walk (1 tile/turn), so a 2-tile player dash opens real distance.

Damage and the under-50%-HP enrage (+10 atk) are unchanged.

### 3b. HP cut for the final boss only (`bosses.js` `makeBoss`)

Current heavy HP formula: `620 * 1.085^(sd - ACT1_END)`. At floor 40 (sd 40)
that is ~3,170 HP. Varmathrax (Act-I end, sd 20) sits at the base (`620 * 1.085^0
= 620`) and is unaffected by the exponent.

Change: give `isFinal` a gentler growth base of `1.07` instead of `1.085`,
keeping the `620` base. Floor-40 Zarakhel becomes `620 * 1.07^20` ≈ 2,400 HP
(~24% shorter fight). Varmathrax untouched (exponent is 0 for it).

Implementation note: the `hp` calc uses `hpBase` shared between heavy/normal. Add
a final-specific base so only Zarakhel changes — e.g. `const finalHpBase = 1.07;`
used when `isFinal`, otherwise the existing `1.085` heavy path for Varmathrax.

## 4. Hidden test gauntlet (Shift+T)

A debug arena for testing the Act-I and final boss fights with end-game gear.
Completely hidden — no footer/legend/title reference.

### Trigger

In the keydown handler (`game.js` ~line 909, before the single-key lowercase
normalization so `Shift+T` is detected as uppercase `T`): if `e.shiftKey` and the
key is `T`/`t`, and `G.started && G.running && G.depth === 1`, call
`enterTestRoom()` and return. Anywhere else (not started, not floor 1) it is a
no-op.

### Layout — `genTestRoom()` (new, in `worlds.js`, mirroring `genLevel`)

Linear, hand-laid map:

```
[ Loadout room ] -- corridor -- [ Varmathrax chamber ] --(sealed)-- [ Zarakhel chamber ]
```

- Player spawns in the loadout room.
- The passage from the Varmathrax chamber to the Zarakhel chamber is a `T_WALL`
  tile (sealed) until Varmathrax dies.
- No up-stairs, no down-stairs, no regular monsters/merchant/chests/decor — it is
  a clean arena. `G.depth` is set to `20` for biome/music flavor only; bosses are
  placed explicitly at true stats (not via `scaledDepth`).

### Gear (equipped + pile)

On entry the player is given a full best-in-slot loadout: a legendary weapon,
legendary armor in every armor slot, a charm, and a stack of potions — all
auto-equipped. An additional pile of spare legendaries/charms is dropped on the
loadout-room floor for swapping. Use the existing `makeLegendary` /
`makeLegendaryWeapon` / `makeLegendaryArmor` / `makeCharm` factories at a deep
`d` (e.g. `FINAL_DEPTH`).

### Bosses at true floor stats

- Varmathrax: `makeBoss(ACT1_END, ACT1_END)` → `makeBoss(20, 20)` (act1End, heavy,
  ~620 HP).
- Zarakhel: `makeBoss(FINAL_DEPTH, FINAL_DEPTH)` → `makeBoss(40, 40)` (final, heavy,
  rebalanced ~2,400 HP from §3b, Solar Dash cooldown from §3a).

Both placed directly into `G.ents` in their respective chambers. `G.bossEnt` is
set to Varmathrax initially.

### Sequential gate

Store gate state on `G`, e.g. `G.testGate = { x, y, opened:false, act1: <varmathrax ent> }`.
In the turn driver (`turn()` in `game.js`, after `monstersTurn()`), if
`G.testGate` exists, is not opened, and its act1 boss is no longer alive: set the
gate tile to `T_FLOOR`, set `opened = true`, switch `G.bossEnt` to the Zarakhel
ent (so the boss bar follows), recompute FOV, and `log("The way deeper opens.")`.
Clear `G.testGate` when leaving the arena / new game.

### Leaving

Re-pressing `Shift+T` on floor 1 rebuilds the arena fresh. Starting a new game
exits it normally. (No dedicated exit stair — it is a throwaway test space.)

## Release chores (per project workflow)

In `src/game.js`: bump `BUILD` (feature batch → minor, current `v0.25.0` →
`v0.26.0`), set `BUILD_DATE` to `2026-06-03`, and prepend a terse numbered
`/* CHANGELOG */` entry covering all four items. Live site rebuilds from `main`.

## Addenda (added during implementation, per live feedback)

### A. Test gauntlet grants ~20 levels

End-game gear on a floor-1 HP pool (~32) still let Zarakhel ~3-hit the test
player, because defense has diminishing returns past 20 (`items.js`), so even
full legendary armor leaves ~40/hit and the HP bar is tiny. On entry the test
player now also gets +20 levels of raw power: `level += 20`, `maxhp += 250`,
`baseAtk += 20`, `baseDef += 10`, then full heal. Verified: the test player
clears Zarakhel keeping ~70% HP.

### B. Zarakhel attack −10%

On top of the HP cut (§3b), the final boss's attack is reduced 10%
(`bosses.js`: `atk = isFinal ? round(atkRaw*0.9) : atkRaw`). The enrage (+10) and
Solar Dash cooldown (§3a) are unchanged.

### C. XP is stat-based, not depth-based

Monster XP scaled on a steep standalone depth curve (`m.xp *= 1.12^(d-1)` in
`monsters.js`), which ballooned to ~93× by floor 40. Because `d` is the *scaled*
depth, NEW GAME+ floors handed out runaway XP → fast leveling. XP now scales with
the monster's HP multiplier (`m.xp *= hpMul`, i.e. `1.06^(d-1)`), so it tracks the
monster's actual strength. Preserves the hand-tuned base XP values (ranged-unit
premiums intact).

## Out of scope

- No changes to Varmathrax stats.
- No persistence of the test arena (not saved/loaded).
