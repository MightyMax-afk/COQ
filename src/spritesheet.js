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
// sprite isn't overridden. Cached per (id,frame,px). Nearest-neighbor scaled.
export function spriteOverride(id, frame, px){
  const frames = _sheetFrames[id];
  if(!frames || !frames.length) return null;
  const f = ((frame|0) % frames.length + frames.length) % frames.length;
  const key = id+'|'+f+'|'+px;
  let c = _drawCache[key];
  if(c) return c;
  const src = frames[f];
  if(px === src.width){ _drawCache[key] = src; return src; }
  c = document.createElement('canvas');
  c.width = px; c.height = px;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, px, px);
  _drawCache[key] = c;
  return c;
}

// Slice a loaded sheet <img>/<canvas> into per-id frame canvases per `manifest`.
//   manifest = { cell, sprites: { id: { frames:[{x,y}], ... } } }
export function registerSheet(image, manifest){
  const cell = manifest.cell || 64;
  for(const [id, info] of Object.entries(manifest.sprites || {})){
    const out = [];
    for(const { x, y } of info.frames){
      const c = document.createElement('canvas');
      c.width = cell; c.height = cell;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, x, y, cell, cell, 0, 0, cell, cell);
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
