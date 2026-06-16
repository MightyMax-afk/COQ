#!/usr/bin/env node
// ============================================================
//  Caves of Qlud — spritesheet LAYOUT GUIDE generator
//  Renders the canonical atlas layout as a black/white chessboard
//  PNG with each sprite's id written in its cell. Use it as a
//  reference (or an overlay layer) so every sprite is painted in
//  the cell the game expects. Same 16-column grid as the sheet:
//  guide cell (col,row) == sheet cell (col,row).
//
//  Usage: node tools/make-guide.mjs [out.png] [cellPx]
//  Writes: assets/spritesheet-guide.png
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { buildSheetPlan } from '../src/atlas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || join(__dirname, '..', 'assets', 'spritesheet-guide.png');
const CELL = parseInt(process.argv[3] || '64', 10);    // guide px per cell (64 = 1:1 overlay on the 1024² sheet; pass a bigger value for larger labels)

// ---- tiny 5x7 pixel font (A-Z 0-9 _ space) ----
const F = {
'A':['01110','10001','10001','11111','10001','10001','10001'],
'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01111'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['11111','00100','00100','00100','00100','00100','11111'],
'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','11011','10001'],
'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'3':['11111','00010','00100','00010','00001','10001','01110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],
'5':['11111','10000','11110','00001','00001','10001','01110'],
'6':['00110','01000','10000','11110','10001','10001','01110'],
'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],
'9':['01110','10001','10001','01111','00001','00010','01100'],
'_':['00000','00000','00000','00000','00000','00000','11111'],
' ':['00000','00000','00000','00000','00000','00000','00000'],
};
const GW=5, GH=7, ADV=6;   // glyph w/h + advance (1px gap)

const plan = buildSheetPlan();
const cols = plan.cols, rows = plan.height / plan.cell;     // 16 x 16
const W = cols*CELL, H = rows*CELL;
const buf = Buffer.alloc(W*H*4);

function px(x,y,r,g,b){ if(x<0||y<0||x>=W||y>=H) return; const o=(y*W+x)*4; buf[o]=r;buf[o+1]=g;buf[o+2]=b;buf[o+3]=255; }
function fillRect(x0,y0,w,h,r,g,b){ for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)px(x,y,r,g,b); }
function drawChar(ch,x,y,s,col){ const g=F[ch]||F[' ']; for(let r=0;r<GH;r++)for(let c=0;c<GW;c++) if(g[r][c]==='1') fillRect(x+c*s,y+r*s,s,s,col,col,col); }
function lineWidth(str,s){ return (str.length*ADV-1)*s; }
function drawLine(str,cx,y,s,col){ let x=Math.round(cx-lineWidth(str,s)/2); for(const ch of str){ drawChar(ch,x,y,s,col); x+=ADV*s; } }

// label = sprite id, split on '_' into stacked lines; auto-fit scale to the cell
function drawLabel(id, frame, frames, cx, cy){
  const onWhite = true;                          // set per cell below
  const lines = id.toUpperCase().split('_');
  if(frames>1) lines.push('F'+(frame+1));        // mark which animation frame
  const longest = Math.max(...lines.map(l=>l.length));
  const pad = 10;
  let s = Math.floor((CELL-pad) / (longest*ADV));
  s = Math.min(s, Math.floor((CELL-pad) / (lines.length*(GH+2))));
  s = Math.max(1, Math.min(s, 4));
  const blockH = lines.length*(GH+2)*s - 2*s;
  let y = Math.round(cy - blockH/2);
  return { lines, s, y };
}

const pad=10;
const occupied = new Map();
for(const c of plan.cells) occupied.set(c.col+','+c.row, c);

for(let row=0; row<rows; row++){
  for(let col=0; col<cols; col++){
    const dark = ((col+row)&1)===1;
    const bg = dark ? 18 : 240;                  // chessboard
    const fg = dark ? 235 : 20;                  // contrasting text
    fillRect(col*CELL, row*CELL, CELL, CELL, bg, bg, bg);
    // 1px cell border (mid grey) for crisp grid
    fillRect(col*CELL, row*CELL, CELL, 1, 128,128,128);
    fillRect(col*CELL, row*CELL, 1, CELL, 128,128,128);
    const c = occupied.get(col+','+row);
    if(!c) continue;
    const cx = col*CELL + CELL/2, cy = row*CELL + CELL/2;
    const { lines, s, y } = drawLabel(c.id, c.frame, plan.sprites[c.id].frames.length, cx, cy);
    let yy = y;
    for(const ln of lines){ drawLine(ln, cx, yy, s, fg); yy += (GH+2)*s; }
  }
}

// ---- encode RGBA PNG ----
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const body=Buffer.concat([Buffer.from(ty,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(body),0);return Buffer.concat([l,body,cr]);};
const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
const stride=W*4,raw=Buffer.alloc((stride+1)*H);
for(let y=0;y<H;y++){raw[y*(stride+1)]=0;buf.copy(raw,y*(stride+1)+1,y*stride,y*stride+stride);}
mkdirSync(dirname(OUT),{recursive:true});
writeFileSync(OUT,Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]));
console.log(`guide -> ${OUT}  ${W}×${H}px  (${cols}×${rows} cells @ ${CELL}px)`);
for(const g of plan.groups) console.log(`  rows ${g.row}-${g.row+g.rows-1}  ${g.label}`);
