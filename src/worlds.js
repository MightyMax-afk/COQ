"use strict";
import { G } from './state.js';
import { ri, log } from './util.js';
import { MAP_W, MAP_H, FOV_R, FINAL_DEPTH, MERCHANT_EVERY, T_WALL, T_FLOOR, T_STAIRS, T_STAIRS_UP } from './config.js';
import { makeMonster, makeElite } from './monsters.js';
import { placeBoss } from './bosses.js';
import { rollLoot } from './items.js';
import { biomeFor, scaledDepth } from './game.js';

// ---------- merchant ----------
const MERCH_COL="#ffd866";

// ---------- map generation ----------
export function carve(r){ for(let y=r.y1;y<=r.y2;y++) for(let x=r.x1;x<=r.x2;x++) G.map[y][x]=T_FLOOR; }
export function hTun(x1,x2,y){ for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++) G.map[y][x]=T_FLOOR; }
export function vTun(y1,y2,x){ for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++) G.map[y][x]=T_FLOOR; }
const intersects=(a,b)=>a.x1<=b.x2&&a.x2>=b.x1&&a.y1<=b.y2&&a.y2>=b.y1;

// snapshot the current level so we can return to it exactly as we left it
export function saveLevel(){
  if(G.depth==null) return;
  G.levels[G.depth]={
    map:G.map, explored:G.explored, feats:G.feats, upX:G.upX, upY:G.upY,
    stairX:G.player.stairX, stairY:G.player.stairY,
    ents: G.ents.filter(e=>!e.isPlayer),
    items:G.items, bossEnt:G.bossEnt, merchant:G.merchant, chests:G.chests,
  };
}

// generate or restore a level. dir: 'down' | 'up' | 'new'
export function genLevel(dir){
  if(dir==="down"||dir==="up"){ /* current level already saved by caller */ }

  const cached=G.levels[G.depth];
  if(cached){
    G.map=cached.map; G.explored=cached.explored; G.feats=cached.feats;
    G.visible=Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
    G.ents=[G.player]; for(const e of cached.ents) G.ents.push(e);
    G.items=cached.items; G.bossEnt=cached.bossEnt; G.merchant=cached.merchant; G.chests=cached.chests||[];
    G.player.stairX=cached.stairX; G.player.stairY=cached.stairY;
    G.upX=cached.upX; G.upY=cached.upY;
    // drop the player onto the stairway they arrived through
    if(dir==="up"){ G.player.x=G.player.stairX; G.player.y=G.player.stairY; }       // came from below → land on down-stairs
    else if(dir==="down"){ G.player.x=G.upX; G.player.y=G.upY; }                    // came from above → land on up-stairs
    return;
  }

  G.map      = Array.from({length:MAP_H},()=>Array(MAP_W).fill(T_WALL));
  G.visible  = Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
  G.explored = Array.from({length:MAP_H},()=>Array(MAP_W).fill(false));
  G.feats    = Array.from({length:MAP_H},()=>Array(MAP_W).fill(null));
  G.items=[]; G.ents=[]; G.merchant=null; G.bossEnt=null; G.chests=[];

  const rooms=[]; let tries=80;
  while(tries-->0 && rooms.length<15){
    const w=ri(5,11), h=ri(3,6);
    const x=ri(1,MAP_W-w-2), y=ri(1,MAP_H-h-2);
    const r={x1:x,y1:y,x2:x+w,y2:y+h, cx:()=>((x)+(x+w))>>1, cy:()=>((y)+(y+h))>>1};
    if(rooms.some(o=>intersects(r,o))) continue;
    carve(r);
    if(rooms.length){
      const p=rooms[rooms.length-1];
      if(ri(0,1)){ hTun(p.cx(),r.cx(),p.cy()); vTun(p.cy(),r.cy(),r.cx()); }
      else       { vTun(p.cy(),r.cy(),p.cx()); hTun(p.cx(),r.cx(),r.cy()); }
    }
    rooms.push(r);
  }

  G.ents.push(G.player);   // index 0

  const first=rooms[0], last=rooms[rooms.length-1];

  // up-stairs only on the *first 10 floors of each act*: depths 2..10 (Act I) and 22..30 (Act II).
  // The bottom half of each act is one-way down; same rule applied symmetrically across both acts.
  const upAllowed = (G.depth>1 && G.depth<=10) || (G.depth>=22 && G.depth<=30);
  if(upAllowed){
    G.upX=first.cx(); G.upY=first.cy(); G.map[G.upY][G.upX]=T_STAIRS_UP;
  } else { G.upX=-1; G.upY=-1; }

  // down-stairs in the last room (none on the absolute final depth — Zarakhel's floor).
  // Varmathrax's floor (Act I end, depth 20) now spawns stairs: descent continues into Act II.
  if(G.depth<FINAL_DEPTH){
    G.player.stairX=last.cx(); G.player.stairY=last.cy(); G.map[G.player.stairY][G.player.stairX]=T_STAIRS;
  } else { G.player.stairX=-1; G.player.stairY=-1; }

  // where the player stands on arrival
  if(dir==="up"){ G.player.x=G.player.stairX; G.player.y=G.player.stairY; }   // arriving from below
  else { G.player.x=first.cx(); G.player.y=first.cy(); }                 // fresh start / arriving from above

  const isMerchantFloor = G.depth%MERCHANT_EVERY===0 && G.depth<FINAL_DEPTH;

  // monsters — orcs are rare in the first few floors, common deeper.
  // Per-room count rises with depth but is capped so deep floors aren't swarms.
  for(let i=1;i<rooms.length;i++){
    if(isMerchantFloor && i===rooms.length-1) continue;   // keep the shop room safe
    const n=ri(0, Math.min(5, 2+(G.depth/6|0)));
    for(let k=0;k<n;k++){
      const x=ri(rooms[i].x1,rooms[i].x2), y=ri(rooms[i].y1,rooms[i].y2);
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if(x===G.upX&&y===G.upY) continue;
      G.ents.push(makeMonster(scaledDepth(), x, y));
    }
  }

  // ~15% chance for one Elite monster on the floor (not on the merchant floor)
  if(!isMerchantFloor && rooms.length>1 && ri(1,100)<=15){
    for(let attempt=0; attempt<20; attempt++){
      const room=rooms[ri(1,rooms.length-1)];
      const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
      if(G.map[y][x]!==T_FLOOR) continue;
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if((x===G.upX&&y===G.upY)||(x===G.player.stairX&&y===G.player.stairY)||(x===G.player.x&&y===G.player.y)) continue;
      G.ents.push(makeElite(scaledDepth(), x, y));
      break;
    }
  }

  // stage boss guards the down-stairs room (not on the safe merchant floor's final room edge case—still spawns, just away from shop)
  placeBoss(G.depth, last);

  // a merchant in a guaranteed-safe room every few floors
  if(isMerchantFloor){
    const room = rooms.length>2 ? rooms[rooms.length-2] : last;
    placeMerchant(room);
  }

  // floor loot — many rooms have nothing; at most one item each
  for(let i=1;i<rooms.length;i++){
    if(ri(1,100)>55) continue;        // 45% of rooms have a drop
    const x=ri(rooms[i].x1,rooms[i].x2), y=ri(rooms[i].y1,rooms[i].y2);
    if(x===G.upX&&y===G.upY) continue;
    G.items.push(rollLoot(x,y,G.depth));
  }

  // chests: 0-1 per floor (occasionally 2 deep), ~12% are mimics.
  const nChests = ri(0,1) + (G.depth>8 && ri(0,1) ? 1 : 0);
  for(let c=0;c<nChests;c++){
    const room=rooms[ri(1,rooms.length-1)];
    const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
    if((x===G.upX&&y===G.upY)||(x===G.player.stairX&&y===G.player.stairY)) continue;
    if(x===G.player.x&&y===G.player.y) continue;
    if(G.chests.some(ch=>ch.x===x&&ch.y===y)) continue;
    G.chests.push({x,y,mimic: ri(1,100)<=12, opened:false});
  }

  // scatter blocking decorations for this biome (bones / boulders / braziers)
  const biome=biomeFor(G.depth);
  if(biome.features.length){
    const want=ri(6,14);
    for(let n=0;n<want;n++){
      const room=rooms[ri(0,rooms.length-1)];
      const x=ri(room.x1,room.x2), y=ri(room.y1,room.y2);
      if(G.map[y][x]!==T_FLOOR) continue;
      if(G.feats[y][x]) continue;
      if(x===G.player.x&&y===G.player.y) continue;
      if(x===G.player.stairX&&y===G.player.stairY) continue;
      if(x===G.upX&&y===G.upY) continue;
      if((G.merchant&&x===G.merchant.x&&y===G.merchant.y)) continue;
      if(G.ents.some(e=>e.x===x&&e.y===y)) continue;
      if(G.chests.some(c=>c.x===x&&c.y===y)) continue;
      if(G.items.some(it=>it.x===x&&it.y===y)) continue;
      G.feats[y][x]=biome.features[ri(0,biome.features.length-1)];
    }
  }
}

export function placeMerchant(room){
  G.merchant={x:room.cx(), y:room.cy(), glyph:"M", col:MERCH_COL};
  // make sure no monster shares the merchant's tile
  G.ents=G.ents.filter(e=>e.isPlayer || !(e.x===G.merchant.x&&e.y===G.merchant.y));
  log("A merchant has set up a stall on this floor (M). Step beside them to trade.","gold");
}

// ---------- FOV (Bresenham line of sight) ----------
export const inB=(x,y)=>x>=0&&x<MAP_W&&y>=0&&y<MAP_H;
export function los(x1,y1,x2,y2){
  let dx=Math.abs(x2-x1),dy=Math.abs(y2-y1),sx=x1<x2?1:-1,sy=y1<y2?1:-1,err=dx-dy,x=x1,y=y1;
  while(true){
    if(x===x2&&y===y2) return true;
    if(!(x===x1&&y===y1)&&G.map[y][x]===T_WALL) return false;
    const e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
}
export function computeFOV(){
  for(let y=0;y<MAP_H;y++) G.visible[y].fill(false);
  const px=G.player.x,py=G.player.y, R=G.player.sight||FOV_R;
  for(let y=Math.max(0,py-R);y<=Math.min(MAP_H-1,py+R);y++)
    for(let x=Math.max(0,px-R);x<=Math.min(MAP_W-1,px+R);x++){
      const dx=x-px,dy=y-py; if(dx*dx+dy*dy>R*R) continue;
      if(los(px,py,x,y)){ G.visible[y][x]=true; G.explored[y][x]=true; }
    }
}
