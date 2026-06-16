#!/usr/bin/env node
// ============================================================
//  Resample a spritesheet to the atlas's native pixel grid.
//
//  An uploaded/AI-generated sheet often comes back at an odd size
//  (e.g. 1254×1254) instead of the manifest grid (16 cols × 64px =
//  1024×1024). At runtime spritesheet.js then samples every cell at
//  a fractional ratio (1254/1024 = 1.2246), and that non-integer
//  scaling smears and clips sprite edges — arms/heads get cut.
//
//  This resamples the whole sheet down to the manifest's exact
//  width/height with alpha-weighted area averaging, so each cell
//  lands on a crisp 64×64 boundary and the loader's ratio becomes
//  1:1. Transparency is preserved.
//
//  Usage:
//    node tools/resize-spritesheet.mjs [in.png] [out.png]
//  Defaults to assets/spritesheet.png -> assets/spritesheet.png and
//  restamps assets/atlas-manifest.json's pngVersion cache-buster.
// ============================================================
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodePNG } from './png-decode.mjs';

const IN  = process.argv[2] || 'assets/spritesheet.png';
const OUT = process.argv[3] || 'assets/spritesheet.png';

const MANIFEST = join(dirname(OUT), 'atlas-manifest.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST,'utf8')) : {};
const cols = manifest.cols || 16, cell = manifest.cell || 64;
const TW = manifest.width  || cols*cell;
const TH = manifest.height || cols*cell;

const { w:sw, h:sh, rgba:src } = decodePNG(IN);
if(sw===TW && sh===TH){
  console.log(`${IN} is already ${TW}×${TH}; nothing to do.`);
  process.exit(0);
}

// alpha-weighted area average: for each dest pixel, average the src
// region it covers, weighting RGB by alpha so transparent pixels don't
// bleed dark/garbage color into sprite edges.
const out = Buffer.alloc(TW*TH*4);
const fx = sw/TW, fy = sh/TH;
for(let dy=0; dy<TH; dy++){
  const sy0 = dy*fy, sy1 = (dy+1)*fy;
  const iy0 = Math.floor(sy0), iy1 = Math.min(sh, Math.ceil(sy1));
  for(let dx=0; dx<TW; dx++){
    const sx0 = dx*fx, sx1 = (dx+1)*fx;
    const ix0 = Math.floor(sx0), ix1 = Math.min(sw, Math.ceil(sx1));
    let r=0,g=0,b=0,a=0,aw=0,cover=0;
    for(let y=iy0; y<iy1; y++){
      const wy = Math.min(sy1,y+1)-Math.max(sy0,y);
      for(let x=ix0; x<ix1; x++){
        const wx = Math.min(sx1,x+1)-Math.max(sx0,x);
        const wgt = wx*wy; if(wgt<=0) continue;
        const o=(y*sw+x)*4, sa=src[o+3];
        const awgt = wgt*sa;
        r += src[o]*awgt; g += src[o+1]*awgt; b += src[o+2]*awgt;
        a += sa*wgt; aw += awgt; cover += wgt;
      }
    }
    const o=(dy*TW+dx)*4;
    if(aw>0){ out[o]=Math.round(r/aw); out[o+1]=Math.round(g/aw); out[o+2]=Math.round(b/aw); }
    out[o+3] = cover>0 ? Math.round(a/cover) : 0;
  }
}

// ---- encode RGBA PNG ----
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xFFFFFFFF;for(let i=0;i<buf.length;i++)c=CRC[(c^buf[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const body=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(body),0);return Buffer.concat([len,body,cr]);}
const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(TW,0);ihdr.writeUInt32BE(TH,4);ihdr[8]=8;ihdr[9]=6;
const stride=TW*4,rb=Buffer.alloc((stride+1)*TH);
for(let y=0;y<TH;y++){rb[y*(stride+1)]=0;out.copy(rb,y*(stride+1)+1,y*stride,y*stride+stride);}
const png=Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rb,{level:9})),chunk('IEND',Buffer.alloc(0))]);
writeFileSync(OUT,png);

const pngVersion=createHash('sha1').update(png).digest('hex').slice(0,12);
if(existsSync(MANIFEST)){ manifest.pngVersion=pngVersion; writeFileSync(MANIFEST,JSON.stringify(manifest,null,2)); }
console.log(`resized ${IN} (${sw}×${sh}) -> ${OUT} (${TW}×${TH}), pngVersion ${pngVersion}`);
