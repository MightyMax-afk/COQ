#!/usr/bin/env node
// ============================================================
//  Clean an uploaded RGB spritesheet -> transparent RGBA.
//  The uploaded sheet was flattened onto a black background; in
//  game that black would occlude the floor behind every sprite.
//
//  Grid-aware so dark pixels INSIDE tiles/sprites are preserved:
//    • tile cells      -> left fully opaque (tiles fill the cell)
//    • empty cells      -> fully transparent
//    • other sprites    -> flood-fill the near-black margin inward
//                          from the cell's own borders (bounded to
//                          the cell, so enclosed outlines survive)
//
//  Usage: node tools/clean-spritesheet.mjs [in.png] [out.png] [threshold]
// ============================================================
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodePNG } from './png-decode.mjs';
import { buildSheetPlan, categoryOf } from '../src/atlas.js';

const IN  = process.argv[2] || 'assets/spritesheet.png';
const OUT = process.argv[3] || 'assets/spritesheet.png';
const THRESH = parseInt(process.argv[4] || '24', 10);   // max channel <= THRESH is "background-dark"

const { w, h, rgba } = decodePNG(IN);
const plan = buildSheetPlan();
const cols = plan.cols, rows = plan.height / plan.cell;   // 16 x 16
// category per grid cell (col,row)
const catAt = new Map();
for(const c of plan.cells) catAt.set(c.col + ',' + c.row, categoryOf(c.id));

const isDark = (p) => Math.max(rgba[p*4], rgba[p*4+1], rgba[p*4+2]) <= THRESH;
const setClear = (p) => { rgba[p*4+3] = 0; };

let cleared = 0, tileCells = 0, emptyCells = 0, spriteCells = 0;

// flood-fill the near-black margin of one cell rect, starting from its border
function trimCell(x0, y0, x1, y1){
  const visited = new Set();
  const stack = [];
  const seed = (x,y) => {
    if(x<x0||x>=x1||y<y0||y>=y1) return;
    const p = y*w + x;
    if(visited.has(p)) return;
    if(!isDark(p)) return;
    visited.add(p); stack.push(p);
  };
  for(let x=x0;x<x1;x++){ seed(x,y0); seed(x,y1-1); }
  for(let y=y0;y<y1;y++){ seed(x0,y); seed(x1-1,y); }
  while(stack.length){
    const p = stack.pop();
    setClear(p); cleared++;
    const x = p % w, y = (p / w) | 0;
    seed(x-1,y); seed(x+1,y); seed(x,y-1); seed(x,y+1);
  }
}

for(let row=0; row<rows; row++){
  for(let col=0; col<cols; col++){
    // cell pixel rect in the (possibly scaled) sheet
    const x0 = Math.round(col*w/cols),     y0 = Math.round(row*h/rows);
    const x1 = Math.round((col+1)*w/cols), y1 = Math.round((row+1)*h/rows);
    const cat = catAt.get(col + ',' + row);
    if(cat === 'tiles'){ tileCells++; continue; }            // tiles stay opaque
    if(cat === undefined){                                    // empty cell -> clear all
      emptyCells++;
      for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ setClear(y*w+x); cleared++; }
      continue;
    }
    spriteCells++;                                           // sprite -> trim margin only
    trimCell(x0, y0, x1, y1);
  }
}

// ---- re-encode RGBA PNG ----
const CRC = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;} return t; })();
function crc32(buf){ let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c=CRC[(c^buf[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0); const body=Buffer.concat([Buffer.from(type,'ascii'),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(body),0); return Buffer.concat([len,body,crc]); }
const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6;
const stride=w*4, rawBuf=Buffer.alloc((stride+1)*h);
for(let y=0;y<h;y++){ rawBuf[y*(stride+1)]=0; rgba.copy(rawBuf,y*(stride+1)+1,y*stride,y*stride+stride); }
const png=Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rawBuf,{level:9})),chunk('IEND',Buffer.alloc(0))]);
writeFileSync(OUT,png);

// stamp the manifest with a content hash of the cleaned PNG so the loader's
// cache-buster picks up the new sheet without a hard refresh.
const pngVersion = createHash('sha1').update(png).digest('hex').slice(0,12);
const MANIFEST = join(dirname(OUT), 'atlas-manifest.json');
if(existsSync(MANIFEST)){
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  m.pngVersion = pngVersion;
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
}

console.log(`cleaned ${IN} -> ${OUT}  (${w}x${h}, pngVersion ${pngVersion})`);
console.log(`  cells: ${tileCells} tile(opaque) · ${spriteCells} sprite(trimmed) · ${emptyCells} empty(cleared)`);
console.log(`  ${cleared} px → transparent (${(100*cleared/(w*h)).toFixed(1)}%)`);
