#!/usr/bin/env node
// ============================================================
//  Caves of Qlaude — INVENTORY layout guide generator
//  Black/white chessboard PNG labelling which icon goes in each
//  cell of the inventory sheet. Same 16-col grid; guide cell
//  (col,row) == sheet cell (col,row). Reads sprites.js via VM.
//
//  Usage:  node tools/make-inv-guide.mjs [out.png] [cellPx]
//  Writes: assets/inventory-guide.png
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = process.argv[2] || join(ROOT, 'assets', 'inventory-guide.png');
const CELL = parseInt(process.argv[3] || '120', 10);

const code = readFileSync(join(ROOT, 'sprites.js'), 'utf8');
const sandbox = { window: {}, document: { querySelectorAll: () => [], createElement: () => ({ getContext: () => ({}) }) }, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const { buildInvPlan } = sandbox.window.QLUD;

// ---- 5x7 pixel font ----
const F = {
'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],
'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],
'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['11111','00100','00100','00100','00100','00100','11111'],'J':['00111','00010','00010','00010','10010','10010','01100'],
'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],
'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],
'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11111','00010','00100','00010','00001','10001','01110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','11110','00001','00001','10001','01110'],
'6':['00110','01000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00010','01100'],
'_':['00000','00000','00000','00000','00000','00000','11111'],' ':['00000','00000','00000','00000','00000','00000','00000'],
};
const GW=5, GH=7, ADV=6;

const plan = buildInvPlan();
const cols = plan.cols, rows = plan.height / plan.cell;
const W = cols*CELL, H = rows*CELL;
const buf = Buffer.alloc(W*H*4);
const px=(x,y,r,g,b)=>{ if(x<0||y<0||x>=W||y>=H) return; const o=(y*W+x)*4; buf[o]=r;buf[o+1]=g;buf[o+2]=b;buf[o+3]=255; };
const fillRect=(x0,y0,w,h,r,g,b)=>{ for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)px(x,y,r,g,b); };
const drawChar=(ch,x,y,s,col)=>{ const g=F[ch]||F[' ']; for(let r=0;r<GH;r++)for(let c=0;c<GW;c++) if(g[r][c]==='1') fillRect(x+c*s,y+r*s,s,s,col,col,col); };
const lineWidth=(str,s)=>(str.length*ADV-1)*s;
const drawLine=(str,cx,y,s,col)=>{ let x=Math.round(cx-lineWidth(str,s)/2); for(const ch of str){ drawChar(ch,x,y,s,col); x+=ADV*s; } };

const occupied = new Map();
for(const c of plan.cells) occupied.set(c.col+','+c.row, c);

for(let row=0; row<rows; row++) for(let col=0; col<cols; col++){
  const dark = ((col+row)&1)===1;
  const bg = dark?18:240, fg = dark?235:20;
  fillRect(col*CELL, row*CELL, CELL, CELL, bg,bg,bg);
  fillRect(col*CELL, row*CELL, CELL, 1, 128,128,128);
  fillRect(col*CELL, row*CELL, 1, CELL, 128,128,128);
  const c = occupied.get(col+','+row); if(!c) continue;
  const cx = col*CELL+CELL/2, cy = row*CELL+CELL/2;
  const lines = c.id.toUpperCase().split('_');
  const longest = Math.max(...lines.map(l=>l.length));
  let s = Math.min(Math.floor((CELL-10)/(longest*ADV)), Math.floor((CELL-10)/(lines.length*(GH+2))));
  s = Math.max(1, Math.min(s, 4));
  let yy = Math.round(cy - (lines.length*(GH+2)*s - 2*s)/2);
  for(const ln of lines){ drawLine(ln, cx, yy, s, fg); yy += (GH+2)*s; }
}

const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const body=Buffer.concat([Buffer.from(ty,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(body),0);return Buffer.concat([l,body,cr]);};
const sig=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
const stride=W*4,raw=Buffer.alloc((stride+1)*H);
for(let y=0;y<H;y++){raw[y*(stride+1)]=0;buf.copy(raw,y*(stride+1)+1,y*stride,y*stride+stride);}
mkdirSync(dirname(OUT),{recursive:true});
writeFileSync(OUT,Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]));
console.log(`inventory guide -> ${OUT}  ${W}×${H}px  (${cols}×${rows} cells)`);
for(const g of plan.groups) console.log(`  rows ${g.row}-${g.row+g.rows-1}  ${g.label}`);
