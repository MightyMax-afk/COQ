"use strict";
/* ============================================================
   Caves of Qlud — full-screen Inventory / Equipment overlay.

   This is the live-game integration for the standalone design in
   inventory-preview.html. It builds the #invScreen overlay (styled by
   inventory-screen.css), populates it from the real run-state on G, draws
   item icons + a layered paper-doll hero via the global window.QLUD
   (sprites.js, loaded as a classic script before this module), and lets the
   player equip pack items by clicking them.

   It also surfaces EVERY active perk — including the boolean Act II perks
   (Deflect, Giant Slayer, …) that the side HUD used to hide — and shows the
   computed stat totals so you can see how stacked perks actually add up.
   ============================================================ */
import { G } from './state.js';
import { log } from './util.js';
import { PERKS } from './player.js';
import {
  effAtk, effDef, gearBonus, gearName, gearEvade, gearThorns, gearRegen,
  totalAcc, totalCrit, totalHitLeech, charmDef, isEquippable, reconcileCharmHp,
} from './items.js';
import { render, updateUI } from './render.js';

// sprites.js publishes window.QLUD as a classic (non-module) global.
const QL = () => window.QLUD;

// ---------- item -> sprite-id mapping ----------
// (mirrors inventory-preview.html, mapped to the game's real item shapes)
const WPN_VAR  = ['dagger', 'sword', 'axe', 'hammer'];          // weapon tier 0-3
const ARM_VAR  = ['leather', 'chain', 'plate'];                 // armor  tier 0-2
const HELM_VAR = ['cap', 'iron', 'great'];                      // helmet tier 0-2
const SHD_VAR  = ['wood', 'kite', 'tower'];                     // shield tier 0-2
const BOOTS_VAR = ['leather', 'iron', 'iron'];                  // boots  tier 0-2 (only 2 icons exist)
// only 5 charm icons exist in sprites.js — map the 11 game charms onto the closest.
const CHARM_ICON = {
  vigor: 'charm_vigor', ember: 'charm_ember', savage: 'charm_savage', guard: 'charm_guard',
  focus: 'charm_focus', fury: 'charm_ember', venom: 'charm_focus', serrate: 'charm_savage',
  sap: 'charm_guard', swift: 'charm_focus', leech: 'charm_vigor',
};

function iconId(it){
  if(!it) return 'gold';
  switch(it.kind){
    case 'weapon': return it.legendary ? (/frost/i.test(it.fixedName || '') ? 'wpn_frost' : 'wpn_fire')
                                       : 'wpn_' + (WPN_VAR[it.tier] || 'sword');
    case 'armor':  return 'arm_'  + (it.legendary ? 'plate' : (ARM_VAR[it.tier]  || 'leather'));
    case 'helmet': return 'helm_' + (it.legendary ? 'great' : (HELM_VAR[it.tier] || 'cap'));
    case 'shield': return it.legendary ? 'shd_legend' : 'shd_' + (SHD_VAR[it.tier] || 'wood');
    case 'boots':  return 'boots_' + (it.legendary ? 'iron' : (BOOTS_VAR[it.tier] || 'leather'));
    case 'charm':  return CHARM_ICON[it.charmId] || 'charm_focus';
    default: return 'gold';
  }
}
// paper-doll layer id for an equipped piece (charms aren't worn on the doll)
function pdId(it){ if(!it || it.kind === 'charm') return null; return 'pd_' + iconId(it); }
function rarityOf(it){
  if(!it) return 'common';
  if(it.legendary) return 'legend';
  if(it.kind === 'charm') return 'charm';
  if(it.ench > 0) return 'magic';
  return 'common';
}
function bonusText(it){
  if(!it) return '';
  if(it.kind === 'weapon') return '+' + gearBonus(it) + ' ATK';
  if(it.kind === 'charm'){ const d = charmDef(it); return d ? d.desc : 'passive'; }
  return '+' + gearBonus(it) + ' DEF';
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- equipment slot layout ----------
const LEFT  = ['weapon', 'armor', 'charm'];
const RIGHT = ['helmet', 'shield', 'boots'];
const ROLE  = { weapon: 'Main Hand', armor: 'Torso', charm: 'Charm', helmet: 'Head', shield: 'Off Hand', boots: 'Feet' };
const EMPTY_LABEL = { weapon: 'bare fists', armor: 'unarmored', charm: 'no charm', helmet: 'bare head', shield: 'no shield', boots: 'barefoot' };

// boolean Act II perks: flag on G.player -> the PERKS entry that grants it.
const FLAG_PERKS = [
  ['giantSlayer', 'Giant Slayer'], ['secondWind', 'Second Wind'], ['searingBlades', 'Searing Blades'],
  ['antidote', 'Antidote'], ['deflect', 'Deflect'], ['closeQuarters', 'Close Quarters'],
  ['scavenger', 'Scavenger'], ['luckyFind', 'Lucky Find'], ['catalyst', 'Catalyst'], ['retribution', 'Retribution'],
];
const perkDesc = name => { const p = PERKS.find(p => p.name === name); return p ? p.desc : ''; };

// ---------- overlay lifecycle ----------
let built = false;
let filter = 'all';        // pack filter: all | weapon | armor | charm

const $iv = id => document.getElementById(id);
export const isInventoryOpen = () => { const s = $iv('invScreen'); return !!s && !s.classList.contains('hidden'); };

function build(){
  if(built) return;
  document.body.insertAdjacentHTML('beforeend', `
<div id="invScreen" class="hidden">
  <div class="iv-frame" id="ivFrame">
    <span class="iv-corner tl"></span><span class="iv-corner tr"></span><span class="iv-corner bl"></span><span class="iv-corner br"></span>
    <header class="iv-header">
      <div class="iv-title-wrap"><h1 class="iv-h1">INVENTORY</h1><span class="iv-crumb">CAVES OF <b>QLUD</b> · equipment</span></div>
      <div class="iv-hud">
        <div class="iv-chip"><canvas data-spr="gold" data-scale="3"></canvas><div><div class="iv-k">Gold</div><div class="iv-v" id="ivGold">0</div></div></div>
        <div class="iv-chip"><canvas data-spr="potion" data-scale="3"></canvas><div><div class="iv-k">Potions</div><div class="iv-v" id="ivPotions">0</div></div></div>
        <div class="iv-chip"><div><div class="iv-k">Depth</div><div class="iv-v" id="ivDepth">1</div></div></div>
        <div class="iv-chip lvl"><div><div class="iv-k">Level</div><div class="iv-v" id="ivLevel">1</div></div></div>
        <button class="iv-close" id="ivClose">✕</button>
      </div>
    </header>
    <div class="iv-body">
      <section class="iv-panel iv-z1">
        <h2 class="iv-h2">Statistics</h2>
        <div class="iv-who"><div class="iv-portrait"><canvas id="ivPortrait"></canvas></div>
          <div><div class="iv-name">HERO</div><div class="iv-cls"><span id="ivClsName">Delver</span> <span class="lv" id="ivClsLv">· Lv 1</span></div></div></div>
        <div class="iv-bar-row"><div class="iv-bar-lbl"><span class="l">Health</span><span class="r" id="ivHpTxt">30 / 30</span></div><div class="iv-bar hp"><i id="ivHpFill" style="width:100%"></i></div></div>
        <div class="iv-bar-row"><div class="iv-bar-lbl"><span class="l">Experience</span><span class="r" id="ivXpTxt">Lv 1 · 0%</span></div><div class="iv-bar xp"><i id="ivXpFill" style="width:0%"></i></div></div>
        <div class="iv-stat-grid" id="ivStats"></div>
        <div class="iv-eff-head">Active Perks &amp; Effects</div><div id="ivEffects"></div>
      </section>
      <section class="iv-panel iv-z2">
        <h2 class="iv-h2">The Champion <span class="iv-sub" id="ivEquipCount">0 / 6 equipped</span></h2>
        <div class="iv-doll">
          <div class="iv-slot-col left" id="ivSlotsLeft"></div>
          <div class="iv-hero"><div class="iv-hero-stage"><div class="iv-hero-base"></div><canvas id="ivHero"></canvas></div>
            <div class="iv-hero-plate" id="ivHeroPlate">Delver</div><div class="iv-hero-rot">click pack gear to equip</div></div>
          <div class="iv-slot-col right" id="ivSlotsRight"></div>
        </div>
      </section>
      <section class="iv-panel iv-z3">
        <h2 class="iv-h2">Pack <div class="iv-packbar"><div class="iv-filters" id="ivFilters">
          <span class="iv-chipf on" data-f="all">All</span><span class="iv-chipf" data-f="weapon">Weapons</span><span class="iv-chipf" data-f="armor">Armor</span><span class="iv-chipf" data-f="charm">Charms</span></div></div></h2>
        <div class="iv-packwrap"><div class="iv-grid" id="ivGrid"></div>
          <div class="iv-cap"><div><div class="iv-cline">In Pack</div><div class="iv-cbig"><b id="ivPackCount">0</b> items</div></div>
            <div class="iv-legendk">
              <div class="lk"><span class="sw" style="border-color:#5a5247;background:#2a2722"></span> Common</div>
              <div class="lk"><span class="sw" style="border-color:#6fd3ff;background:rgba(111,211,255,.2)"></span> Enchanted</div>
              <div class="lk"><span class="sw" style="border-color:#c77dff;background:rgba(199,125,255,.2)"></span> Charm</div>
              <div class="lk"><span class="sw" style="border-color:#ffd866;background:rgba(255,216,102,.25)"></span> Legendary</div></div></div></div>
      </section>
    </div>
    <footer class="iv-footer">
      <div class="iv-acts"><button class="iv-abtn back" id="ivBack"><span class="key">Esc</span><span>Back to game</span></button></div>
      <span class="iv-hintkeys">click a pack item to equip · <kbd>I</kbd> or <kbd>Esc</kbd> to close</span>
    </footer>
  </div>
</div>`);

  // close controls
  $iv('ivClose').addEventListener('click', closeInventory);
  $iv('ivBack').addEventListener('click', closeInventory);
  $iv('invScreen').addEventListener('click', e => { if(e.target.id === 'invScreen') closeInventory(); });
  // pack filters
  $iv('ivFilters').addEventListener('click', e => {
    const chip = e.target.closest('[data-f]'); if(!chip) return;
    filter = chip.dataset.f;
    for(const c of $iv('ivFilters').children) c.classList.toggle('on', c === chip);
    renderPack();
  });
  // equip from the pack
  $iv('ivGrid').addEventListener('click', e => {
    const cell = e.target.closest('.iv-cell.has[data-i]'); if(!cell) return;
    equipFromPack(parseInt(cell.dataset.i, 10));
  });
  // re-fit the scaled stage on resize
  window.addEventListener('resize', fit);
  built = true;
}

// scale the fixed 1600x900 stage down to fit (desktop); CSS handles phones
function fit(){
  const f = $iv('ivFrame'); if(!f) return;
  if(window.matchMedia('(max-width:860px)').matches){ f.style.transform = 'none'; return; }
  const s = Math.min((window.innerWidth - 28) / 1600, (window.innerHeight - 28) / 900, 1);
  f.style.transform = `scale(${s})`;
}

export function openInventory(){
  build();
  refreshInventory();
  $iv('invScreen').classList.remove('hidden');
  fit();
}
export function closeInventory(){
  const s = $iv('invScreen'); if(s) s.classList.add('hidden');
}

// ---------- equipping ----------
// Mirrors equipIndex() in game.js: set the slot, reconcile charm HP, and turn
// auto-equip off on the first manual choice so it stops overriding the player.
function equipFromPack(i){
  const it = G.inv[i];
  if(!it || !isEquippable(it)) return;
  G.equipped[it.kind] = it;
  reconcileCharmHp();
  log(`You equip the ${gearName(it)}.`, 'good');
  if(G.autoEquipOn){
    G.autoEquipOn = false;
    if(!G.autoEquipWarned){
      log('⚠ Manual equip — auto-equip is now OFF so it won\'t override you.', 'bad');
      log('Toggle it back on with the [auto] button by the Pack.', 'bad');
      G.autoEquipWarned = true;
    } else log('Auto-equip disabled.', 'bad');
  }
  refreshInventory();
  updateUI();   // keep the side HUD in sync
  render();     // redraw the map (player art can change with gear in Act II)
}

// ---------- populate from live state ----------
export function refreshInventory(){
  if(!built || !$iv('invScreen')) return;   // nothing to paint until the overlay exists
  const p = G.player; if(!p) return;

  // HUD chips
  $iv('ivGold').textContent    = G.gold;
  $iv('ivPotions').textContent = G.potions;
  $iv('ivDepth').textContent   = G.ngPlus > 0 ? `${G.ngPlus}-${G.depth}` : G.depth;
  $iv('ivLevel').textContent   = p.level;
  $iv('ivClsLv').textContent   = `· Lv ${p.level}`;

  // bars
  const hpPct = Math.max(0, 100 * p.hp / p.maxhp);
  $iv('ivHpFill').style.width = hpPct + '%';
  $iv('ivHpTxt').textContent  = `${Math.max(0, p.hp)} / ${p.maxhp}`;
  const xpPct = Math.round(100 * p.xp / p.xpNext);
  $iv('ivXpFill').style.width = xpPct + '%';
  $iv('ivXpTxt').textContent  = `Lv ${p.level} · ${xpPct}%`;

  renderStats();
  renderEffects();
  renderSlots();
  renderPack();
  renderHero();
}

function renderStats(){
  const p = G.player, w = G.equipped.weapon;
  const crit = Math.min(0.50, p.critBonus + totalCrit() + (w && w.crit ? w.crit : 0));
  const accB = p.accBonus + totalAcc() + (w && w.acc ? w.acc : 0);
  const eva  = p.evasion + gearEvade();
  const hitLeech = Math.min(4, (w && w.lifesteal ? w.lifesteal : 0) + p.hitLeech + totalHitLeech());
  const rows = [
    ['Attack',   effAtk()],
    ['Defense',  effDef()],
    ['Crit',     Math.round(crit * 100) + '%', 'gr'],
    ['Accuracy', (accB >= 0 ? '+' : '') + Math.round(accB * 100) + '%', 'cy'],
    ['Evasion',  Math.round(eva * 100) + '%', 'cy'],
    ['Lifesteal', hitLeech],
  ];
  if(p.armorPen > 0)          rows.push(['Armor Pen', p.armorPen]);
  if(gearThorns() + p.thornsSelf > 0) rows.push(['Thorns', gearThorns() + p.thornsSelf]);
  const regen = p.regenAmt + gearRegen();
  if(regen > 0)               rows.push(['Regen', '+' + regen]);
  if(p.lifesteal > 0)         rows.push(['On Kill', '+' + p.lifesteal]);
  $iv('ivStats').innerHTML = rows.map(([l, v, c]) =>
    `<div class="iv-stat"><span class="l">${l}</span><span class="v ${c || ''}">${v}</span></div>`).join('');
}

function renderEffects(){
  const p = G.player;
  const eff = [];   // {icon, name, bonus, perk}
  // boolean Act II perks — these are the ones the old HUD never showed
  for(const [flag, name] of FLAG_PERKS){
    if(p[flag]) eff.push({ icon: null, name, bonus: perkDesc(name), perk: true });
  }
  // numeric perks that don't already read off the stat grid
  if(p.sight > 6)        eff.push({ icon: null, name: 'Keen Eyes', bonus: `sight ${p.sight}`, perk: true });
  if(p.potionBonus > 0)  eff.push({ icon: null, name: 'Alchemy', bonus: `potions +${p.potionBonus} heal`, perk: true });
  // equipped charm
  const cd = G.equipped.charm && charmDef(G.equipped.charm);
  if(cd) eff.push({ icon: iconId(G.equipped.charm), name: G.equipped.charm.name, bonus: cd.desc });
  // legendary weapon / armor affixes
  const w = G.equipped.weapon;
  if(w && w.affixTxt) eff.push({ icon: iconId(w), name: gearName(w), bonus: w.affixTxt });
  for(const slot of ['armor', 'helmet', 'shield', 'boots']){
    const it = G.equipped[slot];
    if(it && it.legendary && it.affixTxt) eff.push({ icon: iconId(it), name: gearName(it), bonus: it.affixTxt });
  }
  if(!eff.length){ $iv('ivEffects').innerHTML = '<div class="iv-eff"><div class="nm" style="color:#5f5849;font-style:italic">no perks yet — level up to choose boons</div></div>'; return; }
  $iv('ivEffects').innerHTML = eff.map(r => {
    const ic = r.icon ? `<canvas data-spr="${r.icon}" data-scale="3"></canvas>` : '<span class="dot"></span>';
    return `<div class="iv-eff${r.perk ? ' perk' : ''}"><div class="ic">${ic}</div><div><div class="nm">${esc(r.name)} <b>${esc(r.bonus)}</b></div></div></div>`;
  }).join('');
  QL().paintAllSprites();
}

function slotMarkup(slot){
  const it = G.equipped[slot];
  if(!it){
    return `<div class="iv-eslot empty">
      <div class="frameicon"><canvas data-spr="${slot === 'charm' ? 'charm_focus' : iconId({ kind: slot, tier: 0 })}" data-scale="4"></canvas></div>
      <div class="meta"><div class="role">${ROLE[slot]}</div><div class="iname">${EMPTY_LABEL[slot]}</div><div class="ibonus">—</div></div></div>`;
  }
  return `<div class="iv-eslot r-${rarityOf(it)}">
    <div class="frameicon"><canvas data-spr="${iconId(it)}" data-scale="4"></canvas></div>
    <div class="meta"><div class="role">${ROLE[slot]}</div><div class="iname">${esc(gearName(it))}</div><div class="ibonus">${esc(bonusText(it))}</div></div></div>`;
}
function renderSlots(){
  $iv('ivSlotsLeft').innerHTML  = LEFT.map(slotMarkup).join('');
  $iv('ivSlotsRight').innerHTML = RIGHT.map(slotMarkup).join('');
  const n = ['weapon', 'armor', 'helmet', 'shield', 'boots', 'charm'].filter(s => G.equipped[s]).length;
  $iv('ivEquipCount').textContent = `${n} / 6 equipped`;
  QL().paintAllSprites();
}

const FILTER_FN = {
  all:    () => true,
  weapon: it => it.kind === 'weapon',
  armor:  it => it.kind === 'armor' || it.kind === 'helmet' || it.kind === 'shield' || it.kind === 'boots',
  charm:  it => it.kind === 'charm',
};
function renderPack(){
  const grid = $iv('ivGrid');
  const isEq = it => ['weapon', 'armor', 'helmet', 'shield', 'boots', 'charm'].some(s => G.equipped[s] === it);
  const pass = FILTER_FN[filter] || FILTER_FN.all;
  let html = '';
  let shown = 0;
  G.inv.forEach((it, i) => {
    if(!pass(it)) return;
    shown++;
    html += `<div class="iv-cell has r-${rarityOf(it)}${isEq(it) ? ' eq' : ''}" data-i="${i}" title="${esc(gearName(it))} — ${esc(bonusText(it))}">
      <span class="cn">${esc(gearName(it))}</span><canvas data-spr="${iconId(it)}" data-scale="4"></canvas></div>`;
  });
  // pad to a tidy grid (multiples of 9, at least ~3 rows)
  const target = Math.max(27, Math.ceil((shown + 1) / 9) * 9);
  for(let k = shown; k < target; k++) html += '<div class="iv-cell empty"><span class="x"></span></div>';
  grid.innerHTML = html;
  $iv('ivPackCount').textContent = G.inv.length;
  QL().paintAllSprites();
}

function renderHero(){
  const eq = {};
  for(const slot of ['weapon', 'armor', 'helmet', 'shield', 'boots']){
    const k = pdId(G.equipped[slot]); if(k) eq[slot] = k;
  }
  const cid = G.player && G.player.classId;
  const baseKey = cid === 'knight' ? 'pd_base_knight' : cid === 'rogue' ? 'pd_base_rogue' : 'pd_base';
  QL().drawLayeredHero($iv('ivHero'), eq, 12, baseKey);
  QL().drawLayeredHero($iv('ivPortrait'), eq, 3, baseKey);
  // reflect the chosen class on the sheet (defaults to "Delver" for the Wanderer)
  const cname = (G.player && G.player.className && G.player.className !== 'Wanderer') ? G.player.className : 'Delver';
  const plate = $iv('ivHeroPlate'); if(plate) plate.textContent = cname;
  const clsn = $iv('ivClsName'); if(clsn) clsn.textContent = cname;
}
