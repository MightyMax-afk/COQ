// PNG decode helper (8-bit RGB/RGBA, filters 0-4) — used to inspect & clean
// the uploaded spritesheet. Zero deps (node:zlib only).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function decodePNG(path){
  const b = readFileSync(path);
  if(b.readUInt32BE(0) !== 0x89504E47) throw new Error('not a PNG');
  let off = 8, w=0, h=0, bitDepth=0, colorType=0;
  const idat = [];
  while(off < b.length){
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off+4, off+8);
    const data = b.subarray(off+8, off+8+len);
    if(type==='IHDR'){ w=data.readUInt32BE(0); h=data.readUInt32BE(4); bitDepth=data[8]; colorType=data[9]; }
    else if(type==='IDAT') idat.push(data);
    else if(type==='IEND') break;
    off += 12 + len;
  }
  if(bitDepth!==8) throw new Error('only 8-bit supported, got '+bitDepth);
  const channels = colorType===6 ? 4 : colorType===2 ? 3 : colorType===0 ? 1 : (()=>{throw new Error('colorType '+colorType+' unsupported')})();
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w*channels;
  const out = Buffer.alloc(stride*h);     // unfiltered, same channel count
  const px = (x)=> x<0 ? 0 : out[x];
  for(let y=0;y<h;y++){
    const filter = raw[y*(stride+1)];
    const ri = y*(stride+1)+1, oi = y*stride;
    for(let i=0;i<stride;i++){
      const rawByte = raw[ri+i];
      const a = i>=channels ? out[oi+i-channels] : 0;       // left
      const bb = y>0 ? out[oi+i-stride] : 0;                 // up
      const c = (y>0 && i>=channels) ? out[oi+i-stride-channels] : 0; // up-left
      let v;
      switch(filter){
        case 0: v=rawByte; break;
        case 1: v=rawByte+a; break;
        case 2: v=rawByte+bb; break;
        case 3: v=rawByte+((a+bb)>>1); break;
        case 4: { const p=a+bb-c, pa=Math.abs(p-a),pb=Math.abs(p-bb),pc=Math.abs(p-c);
                  const pr = (pa<=pb&&pa<=pc)?a:(pb<=pc)?bb:c; v=rawByte+pr; break; }
        default: throw new Error('bad filter '+filter);
      }
      out[oi+i]=v&0xFF;
    }
  }
  // normalize to RGBA
  const rgba = Buffer.alloc(w*h*4);
  for(let p=0;p<w*h;p++){
    if(channels===4){ rgba[p*4]=out[p*4]; rgba[p*4+1]=out[p*4+1]; rgba[p*4+2]=out[p*4+2]; rgba[p*4+3]=out[p*4+3]; }
    else if(channels===3){ rgba[p*4]=out[p*3]; rgba[p*4+1]=out[p*3+1]; rgba[p*4+2]=out[p*3+2]; rgba[p*4+3]=255; }
    else { rgba[p*4]=rgba[p*4+1]=rgba[p*4+2]=out[p]; rgba[p*4+3]=255; }
  }
  return { w, h, channels, rgba };
}
