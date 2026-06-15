"use strict";
// ============================================================
//  Caves of Qlud — PNG SPRITESHEET runtime (browser)
//  Optional override layer: if a 64×64 PNG spritesheet + manifest
//  is loaded, the renderer draws those pixels instead of baking
//  the procedural string-art. Any sprite NOT present in the sheet
//  transparently falls back to the procedural art, so you can
//  inject a single repainted creature without redrawing the game.
//
//  Pipeline:
//    1. tools/make-spritesheet.mjs (or export-spritesheet.html)
//       bakes the current art into assets/spritesheet.png +
//       assets/atlas-manifest.json.
//    2. Repaint cells in your editor (each cell is 64×64).
//    3. loadSpritesheet() slices the sheet per the manifest and
//       registers each id's frames as overrides.
// ============================================================

// id -> [frameCanvas, ...]  (each frameCanvas is a 64×64 offscreen canvas)
const _sheetFrames = {};
// scaled+cached draw targets: key `id|frame|px` -> canvas
const _drawCache = {};
let _loaded = false;

export function hasOverrides(){ return _loaded; }
export function hasOverride(id){ return !!_sheetFrames[id]; }
export function clearOverrides(){
  for(const k in _sheetFrames) delete _sheetFrames[k];
  for(const k in _drawCache) delete _drawCache[k];
  _loaded = false;
}

// Return a px×px canvas for id/frame from the loaded sheet, or null if this
// sprite isn't overridden. `bob` (optional) shifts the art up by that many
// 64px-cell pixels for the idle wobble. Cached per (id,frame,px,bob).
export function spriteOverride(id, frame, px, bob){
  const frames = _sheetFrames[id];
  if(!frames || !frames.length) return null;
  const f = ((frame|0) % frames.length + frames.length) % frames.length;
  bob = bob|0;
  const key = id+'|'+f+'|'+px+'|b'+bob;
  let c = _drawCache[key];
  if(c) return c;
  const src = frames[f];                       // cell×cell (64) offscreen canvas
  if(px === src.width && !bob){ _drawCache[key] = src; return src; }
  c = document.createElement('canvas');
  c.width = px; c.height = px;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const dy = bob ? -Math.round(bob * px / src.width) : 0;
  ctx.drawImage(src, 0, dy, px, px);
  _drawCache[key] = c;
  return c;
}

// Slice a loaded sheet <img>/<canvas> into per-id 64×64 frame canvases per
// `manifest`. Resolution-independent: if the supplied image is a uniformly
// scaled version of the manifest grid (e.g. a 2048² sheet for a 1024² manifest),
// the cells are sampled proportionally and downscaled to the native 64px, so any
// clean re-export of the template drops in without editing the manifest.
//   manifest = { cell, width, cols, sprites: { id: { frames:[{x,y}] } } }
export function registerSheet(image, manifest){
  const cell = manifest.cell || 64;
  const sheetW = image.naturalWidth || image.width;
  const manifestW = manifest.width || ((manifest.cols||16) * cell);
  const ratio = sheetW && manifestW ? sheetW / manifestW : 1;   // 1 = exact size
  for(const [id, info] of Object.entries(manifest.sprites || {})){
    const out = [];
    for(const { x, y } of info.frames){
      const c = document.createElement('canvas');
      c.width = cell; c.height = cell;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // source rect scaled by `ratio`, blitted down into a native 64px cell
      ctx.drawImage(image, x*ratio, y*ratio, cell*ratio, cell*ratio, 0, 0, cell, cell);
      out.push(c);
    }
    if(out.length) _sheetFrames[id] = out;
  }
  _loaded = true;
}

function _loadImage(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('spritesheet image failed to load: ' + url));
    img.src = url;
  });
}

// Fetch the manifest JSON + PNG and register overrides. Resolves to the count of
// overridden sprite ids, or 0 if the files are absent (never throws on 404 so the
// game boots fine without a sheet — injection is purely opt-in).
export async function loadSpritesheet(pngUrl, manifestUrl){
  try {
    const res = await fetch(manifestUrl, { cache:'no-cache' });
    if(!res.ok) return 0;
    const manifest = await res.json();
    const img = await _loadImage(pngUrl);
    registerSheet(img, manifest);
    return Object.keys(manifest.sprites || {}).length;
  } catch(e){
    console.warn('[spritesheet] not loaded (using procedural art):', e.message);
    return 0;
  }
}
