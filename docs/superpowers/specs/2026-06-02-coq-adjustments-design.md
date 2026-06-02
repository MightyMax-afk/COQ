# Caves of Qlud — Adjustments Batch (2026-06-02)

A batch of bug fixes, balance reworks, and two new features (Dash, redesigned
Merchant) plus a custom AI for the final boss.

## 1. Capslock breaks movement controls (bug)

**Problem:** `MOVES` (game.js:724) only maps lowercase keys (`w/a/s/d/q/e/z/c`).
With Capslock on, `e.key` is `"W"` etc. and no movement (or `i`, `g`, `p`, etc.)
fires.

**Fix:** In the keydown handler, normalize single printable letter keys to
lowercase for command lookup. Single-char alpha keys (`k.length===1`) get
`k.toLowerCase()` before the `MOVES[k]` / inventory / pickup / quaff checks.
Non-letter keys (`>`, `<`, `.`, digits, arrows, `Escape`) are unaffected.
Shift-based bindings (`>` `<`) keep working because we only lowercase letters.

## 2. Equipped panel doesn't show stats (regression/feature)

**Problem:** render.js:346–351 prints only the item name per equipment slot.

**Fix:** Append the slot's contribution next to the name:
- weapon → `name (+N atk)`
- armor / helmet / shield / boots → `name (+N def)`
- charm → `name — <effect desc>`

Uses existing `gearBonus(it)` and `charmDef(it).desc`. Empty slots keep their
current `"none"` / `"bare fists"` text.

## 3. Sunder missing from the skills list (bug)

**Problem:** Sunder applies `armorPen+=2` and the skills panel shows it as
`"Armor pierce N"` (render.js:387), so the player can't match it to the perk
they picked.

**Fix:** Relabel to `Sunder (ignore N enemy defense)`.

## 4. Perk picker rework — stacking, caps, and no dead picks

**Problem:** The 10 Act II perks are boolean flags; re-picking one does nothing,
and the picker keeps offering perks the player already has.

**Design:** Split the 10 perks into two groups.

### 4a. Stacking perks (converted from boolean → numeric)

| Perk | Per pick | Cap | Picker weight |
|------|----------|-----|---------------|
| Deflect | +15% ranged dodge | 60% | 2 |
| Searing Blades | +10% burn chance | 100% | 2 |
| Lucky Find | +10% drop chance | 70% | 2 |
| Giant Slayer | +4% target max HP dmg | 20% | **0.4** (rare, like Vampire) |
| Close Quarters | +3 def when swarmed | +12 | 2 |

Storage: replace the boolean flags with numbers on `G.player`:
`deflect` (fraction, e.g. 0.15), `searingBlades` (fraction), `luckyFind`
(fraction), `giantSlayer` (fraction), `closeQuarters` (flat def). Defaults `0`.

Consumers to update:
- combat.js:65 `eva += 0.20` → `eva += G.player.deflect`
- Searing Blades burn-chance check → use `G.player.searingBlades` as the chance
- Giant Slayer bonus dmg → `Math.round(target.maxhp * G.player.giantSlayer)`
- Lucky Find drop checks (game.js:390, the `0.40`/`0.30` branch) → base + `luckyFind`
- Close Quarters def bonus → `+= G.player.closeQuarters`
- render.js skills panel → show live values:
  `Deflect (+45% dodge vs ranged)`, `Giant Slayer (+12% max HP dmg)`,
  `Searing Blades (40% melee burn)`, `Lucky Find (+30% drop)`,
  `Close Quarters (+9 def vs 2+ foes)`.

`apply()` for each adds its increment and clamps to the cap with `Math.min`.

### 4b. Binary perks (own-once, then stop offering)

Scavenger, Antidote, Second Wind, Catalyst, Retribution stay boolean.

### 4c. Picker eligibility filter

When building the 3 perk choices, exclude any perk that is "maxed":
- stacking perk whose value is already at its cap
- binary perk whose flag is already `true`

Implement as a per-perk `maxed(p)` predicate keyed by perk name (or a small
`cap`/`isBinary` field added to each reworked perk entry). The weighted draw
samples only from non-maxed perks. Edge case: if fewer than 3 perks remain
eligible, offer however many remain (the picker already handles variable counts,
to verify during planning).

## 5. Zarakhel custom AI (final boss)

Inject the user-provided block into `monstersTurn()` immediately after the
`sees` declaration (game.js:396) and before the `m.regen` check (game.js:401).
All referenced helpers exist: `los` (worlds.js), `blocked` (game.js:262),
`monsterAt` (monsters.js), `occupied` (game.js:435), `attack` (combat.js),
`log`, and `G.shots`. Boss name matches exactly: `"Zarakhel, the Unborn Sun"`.

Behavior:
- **Enrage:** below 50% HP, one-time `m.atk += 10` with a log line.
- **Solar Dash:** if not adjacent, player is 3–4 tiles away with line of sight,
  and the tile adjacent to the player (opposite the boss) is free, the boss
  flashes to that tile (yellow `#ffd866` trail via `G.shots`), attacks, and ends
  its turn. Closes the kite gap so the player needs Dash (feature 7) to escape.

Verify during planning that boss entities carry an `atk` field that `attack()`
reads (the snippet mutates `m.atk`).

## 6. Dash (new movement ability)

A short-range leap for escaping/repositioning. Pure movement — no attack.

### Charges & cooldown (unified model)

- **Max charges** = boots tier + Dash Charm:
  - no boots / leather (tier 0): 0
  - chain sabatons (tier 1): 1
  - plate greaves (tier 2): 2
  - legendary boots: 3
  - Dash Charm equipped: **+1** to whatever the boots give
- **Current charges** stored on `G.player.dashCharges`, clamped to `[0, max]`.
- **Regen:** a turn counter increments each player turn; every **5 turns**, if
  `dashCharges < max`, add 1. This *is* the "5-turn cooldown."
- Computed `dashMax()` helper reads equipped boots tier/legendary + charm.
  On equip changes, `dashCharges` is clamped down if max shrank; it is **not**
  auto-filled when max grows (regen fills it).

### Movement

- Leap up to **2 tiles** in a cardinal/diagonal direction (reuses the 8 `MOVES`
  vectors). Move to the farthest unobstructed tile of the two (so a 1-tile
  result is allowed when tile 2 is blocked). Stops at walls (`blocked`),
  monsters (`monsterAt`), and the merchant (`occupied`).
- If the first tile is already blocked, the dash fails: no move, **no charge
  spent**, brief "can't dash there" feedback, not a turn.
- A successful dash leaves a trail (push the passed-over tile(s) into `G.shots`,
  colour e.g. `#7ad0ff`) and **consumes the player's turn** (monsters act).
- Spends 1 charge on success.

### Controls

- **Desktop:** hold **Space**, then press a direction. Track a `spaceHeld` flag
  via keydown/keyup of `" "`. While held, a `MOVES` key triggers `dash(dx,dy)`
  instead of `playerMove`. Space alone does nothing in-game (it only starts a
  new game on the title screen, which is unaffected).
- **Mobile:** a **Dash toggle button** added to the `.touch` controls. Tapping
  it arms dash (`G.dashArmed=true`, button shows active state). The next
  directional button tap performs a dash and disarms (`G.dashArmed=false`).
  Tapping the button again while armed cancels.

### UI

Show `Dash X/Y` in the skills/stat area whenever `dashMax() > 0`, dimmed when
`dashCharges === 0`.

### Dash Charm

New entry in `CHARMS` (items.js:27): `{id:"dash", name:"Dash Charm",
desc:"+1 dash charge", dash:1}`. Because it grants no stat, `dashMax()` checks
for the equipped charm's `dash` field rather than the `stat` map. (Confirm
`charmStat`/`catalyst` doubling does not misread it — `dash` is outside `stat`,
so Catalyst won't double it; acceptable.)

## 7. Merchant interface redesign

Keep the existing buy list + sell list, add two things:

1. **Equipped + stats panel** in the shop showing current `atk`/`def` and each
   equipped slot (weapon/armor/helmet/shield/boots/charm) with its bonus —
   reusing the same formatting as feature 2, so the player can compare before
   buying/selling without leaving the shop.
2. **Stats on the sell list:** each sell row shows the item's `+N atk` / `+N def`
   / charm effect (currently name + price only), so selling from the inventory
   view is informed.

This satisfies "sell directly from inventory view" (the sell list already sells
from `G.inv`; we just enrich it) and "show equipped gear + stats." Layout: add a
compact equipped/stat column or header band to the existing `#shop` panel; mirror
the equipped-panel markup from the main HUD. No change to buy/sell logic.

## 8. OPEN — "frostbite of the abyss"

Not yet actionable: the report was a fragment with no described symptom. There is
a `Frostbite` legendary weapon, a `of the Abyss` legendary suffix, and
`Treads of the Abyss` boots — likely a confusing/duplicated generated item name.
**Deferred** pending the user describing what actually went wrong. Not included
in the implementation plan until clarified.

## Files touched (summary)

- `src/game.js` — keydown normalize (Capslock), Zarakhel AI block, dash logic +
  controls (keydown/keyup + touch), perk-picker eligibility filter, dash regen
  in the turn loop.
- `src/player.js` — rework 5 perks boolean→numeric with caps; binary perks gain
  an "owned" marker; `makePlayer` adds `dashCharges`, dash counters, and numeric
  perk defaults.
- `src/combat.js` — Deflect / Searing Blades / Giant Slayer read numeric values.
- `src/render.js` — equipped panel stats, Sunder label, live numeric-perk
  labels, dash charge readout.
- `src/items.js` — Dash Charm entry; `dashMax()` helper (boots tier + charm).
- `src/render.js` (shop) / `index.html` + shop render — merchant equipped/stats
  panel and enriched sell list.

## Out of scope

No changes to save format beyond new `G.player` fields (older saves load with
`undefined` → treat as 0/false; add defensive defaults on load if a load path
exists). No rebalancing of non-listed perks. No art changes.
