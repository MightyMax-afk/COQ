"use strict";
export const PAL = {
  '.': null,
  // outline & shadow
  'K': '#070509',
  'k': '#1a1410',
  // stone (tiles)
  's': '#1f1c18',
  'S': '#3c352e',
  't': '#5a5048',
  'T': '#7a6f60',
  // brown (rat, leather, wood)
  'd': '#1c1208',
  'n': '#3a2618',
  'B': '#704a26',
  'b': '#a8784a',
  'e': '#d4a878',
  // wood (chest, staff)
  '6': '#4a2e18',
  '7': '#8a5a2e',
  // green (goblin/archer/poison)
  'g': '#1a3010',
  'G': '#3a6b22',
  'H': '#7bc96f',
  'j': '#b4e090',
  // orange (orc, fire, flame)
  'o': '#5a2810',
  'O': '#a04818',
  'q': '#d97a3a',
  'Q': '#f4a85a',
  // red (blood, troll, dragon)
  'r': '#4a0e0a',
  'R': '#a0302a',
  'x': '#e0524a',
  'X': '#ff8a7a',
  // amber / gold
  'y': '#3a2410',
  'Y': '#8a6020',
  'W': '#e8b75c',
  'L': '#ffd866',
  '9': '#fff0c0',
  // cyan (player)
  'c': '#1a3a52',
  'C': '#3a7a9a',
  'i': '#6fd3ff',
  'I': '#a8e8ff',
  // purple (mage, charm)
  'p': '#1c0e2c',
  'P': '#5a2a7a',
  'u': '#c77dff',
  'U': '#e8c0ff',
  // steel (armor, sword)
  '2': '#1c2230',
  '3': '#525e6e',
  '4': '#9aa6b4',
  '5': '#d4dce6',
  // misc
  'w': '#e9e0cf',
  'Z': '#ffffff',
  'z': '#d6c6a8',
  '1': '#ff5a3a',
  // ---- expanded ramps (additive; 16x16 art still valid) ----
  '0': '#0d0a0c',   // deep occlusion (warm black)
  '8': '#281a0d',   // deep brown shadow
  'a': '#6e4630',   // skin shadow
  'f': '#b07a52',   // skin mid
  'h': '#e0a87a',   // skin light
  'l': '#f3d0a4',   // skin highlight
  'm': '#343d4d',   // steel dark-mid
  'v': '#7e8a9a',   // steel mid
  'V': '#eaf2fb',   // cool near-white
  'A': '#13260c',   // deep green
  'D': '#2e0a08',   // deep crimson
  'M': '#7a241f',   // muscle deep red
  'N': '#c4574e',   // muscle mid red
  'E': '#cdec78',   // toxic highlight
  'F': '#ffd27a',   // warm ember mid
  'J': '#8a4ca8',   // purple mid
};

export const COL = {
  wall:"#5a5048", wallDim:"#262320", floor:"#3a352e", floorDim:"#1c1a17",
  stairs:"#f0e6c0", stairsUp:"#8fd6a0", merchant:"#ffd866", player:"#6fd3ff",
  rat:"#d98a5a", goblin:"#7bc96f", orc:"#d97a3a", troll:"#e0524a",
  archer:"#b6d36f", mage:"#c77dff", shot:"#ffe08a", mimic:"#e09a4a", chest:"#caa45a",
  potion:"#c77dff", gold:"#ffd866", weapon:"#9ad0ff", armor:"#c0a060",
};

// helper: a sprite is a square grid of single-char palette codes. Size is
// inferred from the row count, so both 16x16 (legacy) and 32x32 (hi-detail)
// art are valid — the renderer scales to whatever N it finds.
export function S(lines){
  const arr = lines.trim().split('\n').map(s => s.replace(/^\s+/, ''));
  const n = arr.length;
  // hard-validate squareness so a typo can't break the renderer silently
  for(let i=0;i<arr.length;i++) if(arr[i].length !== n)
    console.warn(`sprite not square (${n} rows): row ${i} has ${arr[i].length} cols`, JSON.stringify(arr[i]));
  return arr;
}
