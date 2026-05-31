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
};

// helper: a sprite is just a 16-line array, all rows must be 16 chars.
export function S(lines){
  const arr = lines.trim().split('\n').map(s => s.replace(/^\s+/, ''));
  // hard-validate so a typo can't break the renderer silently
  if(arr.length !== 16) console.warn('sprite row count !=16', arr.length);
  for(let i=0;i<arr.length;i++) if(arr[i].length !== 16)
    console.warn('sprite col count !=16 row', i, JSON.stringify(arr[i]));
  return arr;
}
