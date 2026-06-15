#!/usr/bin/env node
// ============================================================
//  Caves of Qlud — INVENTORY spritesheet baker (zero deps)
//  Bakes the inventory icon set (sprites.js) into a 64×64-cell
//  PNG + manifest. sprites.js is a classic browser script, so we
//  run it in a Node VM with a minimal window/document shim and
//  read window.QLUD.{PAL,SPRITES,buildInvPlan}. This keeps the
//  sheet locked to the exact icons the inventory renders.
//
//  Usage:  node tools/make-inv-spritesheet.mjs
//  Writes: assets/inventory-spritesheet.png
//          assets/inventory-manifest.json
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'assets');

// ---- load sprites.js data via a sandbox ----
const code = readFileSync(join(ROOT, 'sprites.js'), 'utf8');
const sandbox = { window: {}, document: { querySelectorAll: () => [], createElement: () => ({ getContext: () => ({}) }) }, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const { PAL, SPRITES, buildInvPlan } = sandbox.window.QLUD;

// ---- hex -> rgb ----
const _c = {};
function rgb(hex){ if(!hex) return null; if(_c[hex]) return _c[hex];
  return (_c[hex] = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]); }

// ---- minimal RGBA PNG encoder ----
const CRC = (() => { const t = new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
const crc32 = b => { let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
const chunk = (ty,d) => { const l=Buffer.alloc(4); l.writeUInt32BE(d.length,0); const body=Buffer.concat([Buffer.from(ty,'ascii'),d]); const cr=Buffer.alloc(4); cr.writeUInt32BE(crc32(body),0); return Buffer.concat([l,body,cr]); };
function encodePNG(w,h,rgba){
  const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6;
  const stride=w*4, raw=Buffer.alloc((stride+1)*h);
  for(let y=0;y<h;y++){ raw[y*(stride+1)]=0; rgba.copy(raw,y*(stride+1)+1,y*stride,y*stride+stride); }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))]);
}

// ---- bake ----
const plan = buildInvPlan();
const { cell, width, height } = plan;
const rgba = Buffer.alloc(width*height*4);
function putCell(lines, ox, oy){
  const n = lines.length, scale = Math.max(1, Math.round(cell/n));
  for(let sy=0;sy<n;sy++){ const row=lines[sy];
    for(let sx=0;sx<n;sx++){ const col=rgb(PAL[row[sx]]); if(!col) continue;
      for(let dy=0;dy<scale;dy++) for(let dx=0;dx<scale;dx++){
        const px=ox+sx*scale+dx, py=oy+sy*scale+dy; if(px>=width||py>=height) continue;
        const o=(py*width+px)*4; rgba[o]=col[0]; rgba[o+1]=col[1]; rgba[o+2]=col[2]; rgba[o+3]=255;
      } } }
}
for(const c of plan.cells){ const lines = SPRITES[c.id]; if(lines) putCell(lines, c.x, c.y); }

mkdirSync(OUT_DIR, { recursive: true });
const png = encodePNG(width, height, rgba);
writeFileSync(join(OUT_DIR, 'inventory-spritesheet.png'), png);
const pngVersion = createHash('sha1').update(png).digest('hex').slice(0,12);
const manifest = {
  cell, cols: plan.cols, width, height, pngVersion,
  generated: new Date().toISOString().slice(0,10),
  note: 'Inventory icon sheet. Each cell is 64x64; frames[] is the top-left pixel of each frame (icons are single-frame). Paper-doll hero stays procedural.',
  groups: plan.groups,
  sprites: Object.fromEntries(Object.entries(plan.sprites).map(([id,s]) => [id, { frames: s.frames }])),
};
writeFileSync(join(OUT_DIR, 'inventory-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`inventory-spritesheet.png  ${width}×${height}px  (${plan.cols} cols, ${height/cell} rows, ${plan.cells.length} icons)  pngVersion ${pngVersion}`);
for(const g of plan.groups) console.log(`  ${g.label.padEnd(9)} rows ${g.row}-${g.row+g.rows-1}`);
