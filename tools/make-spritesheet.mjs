#!/usr/bin/env node
// ============================================================
//  Caves of Qlud — spritesheet baker (Node, zero dependencies)
//
//  Bakes every sprite in the atlas into a single 64×64-cell PNG
//  + a JSON manifest mapping each sprite id (and animation frame)
//  to its pixel rectangle in the sheet. This is the SAME art the
//  game renders procedurally — so the output is a pixel-perfect
//  template you can open in any editor, repaint, and re-inject.
//
//  Usage:
//    node tools/make-spritesheet.mjs
//  Writes:
//    assets/spritesheet.png
//    assets/atlas-manifest.json
//
//  It imports src/atlas.js directly (DOM-free), so the sheet can
//  never drift from the in-game atlas.
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { PAL, frameLines, buildSheetPlan } from '../src/atlas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'assets');

// ---- hex '#rrggbb' -> [r,g,b]; null/'.' -> transparent ----
const _rgbCache = {};
function rgb(hex){
  if(!hex) return null;
  if(_rgbCache[hex]) return _rgbCache[hex];
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (_rgbCache[hex] = [r,g,b]);
}

// ---- minimal PNG (RGBA, 8-bit) encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[n]=c>>>0; }
  return t;
})();
function crc32(buf){
  let c = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba){
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;   // 8-bit, RGBA, no interlace
  // raw scanlines, filter type 0 per row
  const stride = width*4;
  const raw = Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++){
    raw[y*(stride+1)] = 0;
    rgba.copy(raw, y*(stride+1)+1, y*stride, y*stride+stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- bake ----
const plan = buildSheetPlan();              // { cell, cols, width, height, sprites, cells, groups }
const { cell, width, height } = plan;
const rgba = Buffer.alloc(width*height*4);  // zero = transparent black

function putCell(lines, ox, oy){
  const n = lines.length;                   // 32 or 64
  const scale = Math.max(1, Math.round(cell / n));
  for(let sy=0; sy<n; sy++){
    const row = lines[sy];
    for(let sx=0; sx<n; sx++){
      const col = rgb(PAL[row[sx]]);
      if(!col) continue;
      for(let dy=0; dy<scale; dy++) for(let dx=0; dx<scale; dx++){
        const px = ox + sx*scale + dx, py = oy + sy*scale + dy;
        if(px>=width || py>=height) continue;
        const o = (py*width + px)*4;
        rgba[o]=col[0]; rgba[o+1]=col[1]; rgba[o+2]=col[2]; rgba[o+3]=255;
      }
    }
  }
}

for(const c of plan.cells){
  const lines = frameLines(c.id, c.frame);
  if(lines) putCell(lines, c.x, c.y);
}

// ---- write ----
mkdirSync(OUT_DIR, { recursive: true });
const png = encodePNG(width, height, rgba);
writeFileSync(join(OUT_DIR, 'spritesheet.png'), png);

// short content hash of the PNG — the loader appends it to the image URL as a
// cache-buster so a redeployed sheet is picked up without a hard refresh.
const pngVersion = createHash('sha1').update(png).digest('hex').slice(0,12);

// manifest: keep it small + editor-friendly
const manifest = {
  cell,
  cols: plan.cols,
  width, height,
  pngVersion,
  generated: new Date().toISOString().slice(0,10),
  note: 'Each cell is 64x64. frames[] lists the top-left pixel of each animation frame. anim=1 means the in-game renderer idle-bobs single-frame procedural art (PNG frames animate directly).',
  groups: plan.groups,
  sprites: Object.fromEntries(Object.entries(plan.sprites).map(([id, s]) => [id, { frames: s.frames, anim: s.anim }])),
};
writeFileSync(join(OUT_DIR, 'atlas-manifest.json'), JSON.stringify(manifest, null, 2));

const frameTotal = plan.cells.length;
console.log(`spritesheet.png   ${width}×${height}px  (${plan.cols} cols, ${height/cell} rows)`);
console.log(`atlas-manifest.json  ${Object.keys(plan.sprites).length} sprites, ${frameTotal} frames`);
for(const g of plan.groups) console.log(`  ${g.label.padEnd(18)} rows ${g.row}–${g.row+g.rows-1}`);
