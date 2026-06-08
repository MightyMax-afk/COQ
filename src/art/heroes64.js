"use strict";
/* ============================================================
   Caves of Qlud — 64x64 playable-character sprites
   Same PAL as src/palette.js / sprites.js, same S()-style
   string-grid output, so these drop into the SPRITES atlas
   exactly like the existing 16x24 paper-doll hero.

   Three classes (match src/player.js CLASSES):
     hero64_wanderer  — hooded traveler, simple sword
     hero64_knight    — plate + great helm + cyan visor, greatsword
     hero64_rogue     — green hood, twin daggers, dark cloak
   ============================================================ */

const PAL64 = {
  '.': null,
  'K': '#070509', 'k': '#1a1410',
  's': '#1f1c18', 'S': '#3c352e', 't': '#5a5048', 'T': '#7a6f60',
  'd': '#1c1208', 'n': '#3a2618', 'B': '#704a26', 'b': '#a8784a', 'e': '#d4a878',
  '6': '#4a2e18', '7': '#8a5a2e',
  'g': '#1a3010', 'G': '#3a6b22', 'H': '#7bc96f', 'j': '#b4e090',
  'o': '#5a2810', 'O': '#a04818', 'q': '#d97a3a', 'Q': '#f4a85a',
  'r': '#4a0e0a', 'R': '#a0302a', 'x': '#e0524a', 'X': '#ff8a7a',
  'y': '#3a2410', 'Y': '#8a6020', 'W': '#e8b75c', 'L': '#ffd866', '9': '#fff0c0',
  'c': '#1a3a52', 'C': '#3a7a9a', 'i': '#6fd3ff', 'I': '#a8e8ff',
  'p': '#1c0e2c', 'P': '#5a2a7a', 'u': '#c77dff', 'U': '#e8c0ff',
  '2': '#1c2230', '3': '#525e6e', '4': '#9aa6b4', '5': '#d4dce6',
  'w': '#e9e0cf', 'Z': '#ffffff', 'z': '#d6c6a8', '1': '#ff5a3a',
};

/* ---------- low-level draw helpers (operate on a 64x64 char-grid) ---------- */
const SIZE = 64;
function mkGrid(){
  const g = new Array(SIZE);
  for(let y=0; y<SIZE; y++){ g[y] = new Array(SIZE).fill('.'); }
  return g;
}
function px(g, x, y, c){ if(x>=0 && x<SIZE && y>=0 && y<SIZE) g[y][x] = c; }
function rect(g, x, y, w, h, c){
  for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) px(g, xx, yy, c);
}
function outline(g, x, y, w, h, c){
  for(let xx=x; xx<x+w; xx++){ px(g, xx, y, c); px(g, xx, y+h-1, c); }
  for(let yy=y; yy<y+h; yy++){ px(g, x, yy, c); px(g, x+w-1, yy, c); }
}
function hline(g, x1, x2, y, c){
  if(x1 > x2){ const t=x1; x1=x2; x2=t; }
  for(let x=x1; x<=x2; x++) px(g, x, y, c);
}
function vline(g, x, y1, y2, c){
  if(y1 > y2){ const t=y1; y1=y2; y2=t; }
  for(let y=y1; y<=y2; y++) px(g, x, y, c);
}
/* fill a row band: list of [x1,x2,c] segments; left/right symmetric helpers */
function row(g, y, segs){
  for(const [x1, x2, c] of segs){
    for(let x=x1; x<=x2; x++) px(g, x, y, c);
  }
}
/* mirror grid LEFT half onto RIGHT half about an axis (axis col is unchanged) */
function mirror(g, axis){
  for(let y=0; y<SIZE; y++){
    for(let dx=1; axis-dx>=0 && axis+dx<SIZE; dx++){
      g[y][axis+dx] = g[y][axis-dx];
    }
  }
}
/* outline-style trapezoid hood: pairs of (row, leftCol, rightCol, edgeChar, fillChar) */
function trapezoid(g, top, bot, topL, topR, botL, botR, fill, edge){
  const h = bot - top;
  for(let i=0; i<=h; i++){
    const t = h === 0 ? 0 : i / h;
    const l = Math.round(topL + (botL - topL) * t);
    const r = Math.round(topR + (botR - topR) * t);
    for(let x=l; x<=r; x++) px(g, x, top+i, fill);
    px(g, l, top+i, edge);
    px(g, r, top+i, edge);
  }
}
function gridToS(g){ return g.map(r => r.join('')); }

/* ============================================================
   1) WANDERER — BLUE hooded robe, cyan glowing eyes,
      brown staff held horizontally across the waist.
      Matches the user's 32x32 'HEROES · Wanderer' reference.
   ============================================================ */
function buildWanderer(){
  const g = mkGrid();

  // ground shadow
  row(g, 62, [[18, 45, 'k']]);
  row(g, 63, [[22, 41, 's']]);

  // === HOOD silhouette (blue robe, hood pulled up) ===
  // outer hood outline (dark) + filled blue
  // top peak
  row(g, 4,  [[28, 35, 'K']]);
  row(g, 5,  [[26, 37, 'K'], [28, 35, 'c']]);
  row(g, 6,  [[24, 39, 'K'], [26, 37, 'C'], [28, 35, 'c']]);
  row(g, 7,  [[23, 40, 'K'], [24, 39, 'C'], [27, 36, 'c']]);
  row(g, 8,  [[22, 41, 'K'], [23, 40, 'C'], [26, 37, 'c'], [28, 35, '2']]);
  row(g, 9,  [[22, 41, 'K'], [23, 40, 'C'], [25, 38, 'c']]);
  row(g, 10, [[21, 42, 'K'], [22, 41, 'C'], [24, 39, 'c'], [26, 37, 'C']]);
  row(g, 11, [[20, 43, 'K'], [21, 42, 'C'], [23, 40, 'c']]);
  row(g, 12, [[19, 44, 'K'], [20, 43, 'C'], [22, 41, 'c'], [24, 39, 'C']]);
  row(g, 13, [[19, 19, 'K'], [44, 44, 'K'], [20, 43, 'C'], [22, 41, 'c']]);

  // hood interior shadow over face (dark)
  row(g, 14, [[19, 19, 'K'], [44, 44, 'K'], [20, 43, 'C'], [22, 22, 'K'], [41, 41, 'K'], [23, 40, '2']]);
  row(g, 15, [[19, 19, 'K'], [44, 44, 'K'], [20, 43, 'C'], [22, 22, 'K'], [41, 41, 'K'], [23, 40, '2']]);

  // === FACE inside hood (in shadow) ===
  // skin tone visible, slightly dim
  for(let y=16; y<=22; y++){
    px(g, 19, y, 'K'); px(g, 44, y, 'K');
    px(g, 20, y, 'C'); px(g, 43, y, 'C');
    px(g, 21, y, 'c'); px(g, 42, y, 'c');
    px(g, 22, y, 'K'); px(g, 41, y, 'K');
    for(let x=23; x<=40; x++) px(g, x, y, 'e');
  }
  // brow shadow
  row(g, 16, [[23, 40, 'B']]);
  // CYAN GLOWING EYES — bright cyan with brighter highlight
  row(g, 17, [[26, 29, 'K'], [34, 37, 'K']]);
  row(g, 18, [[26, 27, 'C'], [28, 29, 'i'], [34, 35, 'i'], [36, 37, 'C']]);
  row(g, 19, [[26, 29, 'I'], [27, 28, 'Z'], [34, 37, 'I'], [35, 36, 'Z']]);
  // nose
  row(g, 20, [[30, 33, 'b'], [31, 32, 'B']]);
  // mouth
  row(g, 21, [[29, 34, 'n']]);
  // jaw narrowing
  row(g, 22, [[23, 23, 'K'], [40, 40, 'K'], [24, 39, 'e'], [27, 36, 'b']]);

  // === SHOULDERS + ROBE BODY (rows 23-45) ===
  // shoulders flare out
  row(g, 23, [[18, 18, 'K'], [45, 45, 'K'], [19, 44, 'C'], [22, 41, 'c']]);
  row(g, 24, [[16, 16, 'K'], [47, 47, 'K'], [17, 46, 'C'], [19, 44, 'c']]);
  row(g, 25, [[15, 15, 'K'], [48, 48, 'K'], [16, 47, 'C'], [18, 45, 'c']]);
  row(g, 26, [[14, 14, 'K'], [49, 49, 'K'], [15, 48, 'C'], [17, 46, 'c'], [19, 44, '2']]);
  row(g, 27, [[14, 14, 'K'], [49, 49, 'K'], [15, 48, 'C'], [17, 46, 'c']]);
  // robe body — wide blue with darker shadow on right side
  for(let y=28; y<=44; y++){
    px(g, 14, y, 'K'); px(g, 49, y, 'K');
    px(g, 15, y, 'C'); px(g, 48, y, 'C');
    for(let x=16; x<=47; x++) px(g, x, y, 'c');
    // right side shadow
    for(let x=36; x<=47; x++) px(g, x, y, '2');
    // center fold highlight
    px(g, 31, y, 'C');
    px(g, 32, y, 'C');
  }
  // robe folds (vertical streaks)
  vline(g, 20, 28, 44, 'C');
  vline(g, 25, 28, 44, '2');
  vline(g, 39, 28, 44, 'K');
  vline(g, 43, 28, 44, '2');

  // === ARMS — sleeves holding a horizontal staff ===
  // left arm comes forward and across; right arm grips other end of staff
  // upper-left sleeve
  for(let y=30; y<=37; y++){
    px(g, 13, y, 'K');
    px(g, 14, y, 'C');
    px(g, 15, y, 'c');
  }
  // upper-right sleeve
  for(let y=30; y<=37; y++){
    px(g, 50, y, 'K');
    px(g, 49, y, 'C');
    px(g, 48, y, 'c');
  }

  // forearms come in to hold staff at waist level
  // left forearm (cols 14-22, row 36-39)
  rect(g, 14, 36, 9, 4, 'c');
  outline(g, 14, 36, 9, 4, 'K');
  row(g, 37, [[15, 21, 'C']]);
  // right forearm (cols 41-49, row 36-39)
  rect(g, 41, 36, 9, 4, 'c');
  outline(g, 41, 36, 9, 4, 'K');
  row(g, 37, [[42, 48, '2']]);

  // hands (skin)
  rect(g, 20, 37, 4, 4, 'e');
  outline(g, 20, 37, 4, 4, 'K');
  rect(g, 40, 37, 4, 4, 'e');
  outline(g, 40, 37, 4, 4, 'K');

  // === STAFF — horizontal brown wooden staff across the waist ===
  // long horizontal bar at row 38-40
  row(g, 38, [[18, 45, 'K']]);
  row(g, 39, [[18, 45, 'B'], [20, 43, '7'], [22, 41, 'b']]);
  row(g, 40, [[18, 45, 'K']]);
  // small staff caps/grips at each end
  row(g, 37, [[18, 19, 'K'], [44, 45, 'K']]);
  row(g, 41, [[18, 19, 'K'], [44, 45, 'K']]);
  // tiny gold ring at center
  row(g, 39, [[31, 32, 'L']]);

  // === ROBE skirt below waist (rows 42-55) ===
  // widens slightly to floor
  for(let y=42; y<=55; y++){
    const flare = Math.floor((y-42) * 0.2);
    const l = 16 - flare, r = 47 + flare;
    px(g, l-1, y, 'K');
    px(g, r+1, y, 'K');
    for(let x=l; x<=r; x++) px(g, x, y, 'c');
    // shadow on right
    for(let x=Math.floor((l+r)/2)+2; x<=r; x++) px(g, x, y, '2');
    // center fold light
    px(g, 31, y, 'C');
    px(g, 32, y, 'C');
  }
  // vertical fold creases on the skirt
  vline(g, 22, 42, 55, 'C');
  vline(g, 27, 42, 55, '2');
  vline(g, 38, 42, 55, 'K');
  vline(g, 42, 42, 55, '2');

  // robe hem detail at bottom
  row(g, 55, [[14, 49, 'K']]);
  row(g, 56, [[14, 14, 'K'], [49, 49, 'K'], [15, 48, '2']]);

  // === BOOTS — dark, peeking out from under the robe ===
  row(g, 57, [[22, 30, 'K'], [33, 41, 'K']]);
  row(g, 58, [[22, 22, 'K'], [30, 30, 'K'], [23, 29, 'n'], [33, 33, 'K'], [41, 41, 'K'], [34, 40, 'n']]);
  row(g, 59, [[22, 22, 'K'], [30, 30, 'K'], [23, 29, 'k'], [33, 33, 'K'], [41, 41, 'K'], [34, 40, 'k']]);
  row(g, 60, [[21, 31, 'K'], [22, 30, 'n'], [32, 42, 'K'], [33, 41, 'n']]);
  row(g, 61, [[20, 32, 'K'], [21, 31, 'k'], [31, 43, 'K'], [32, 42, 'k']]);

  return gridToS(g);
}

/* ============================================================
   2) KNIGHT — plate armor, great helm w/ cyan visor slit,
      planted greatsword. Cool steel + gold + cyan accents.
   ============================================================ */
function buildKnight(){
  const g = mkGrid();

  // ground
  row(g, 62, [[16, 47, 'k']]);
  row(g, 63, [[18, 45, 's']]);

  // --- great helm (cylinder + bevel top) ---
  // top dome
  row(g, 4, [[27, 36, 'K']]);
  row(g, 5, [[25, 38, 'K']]);
  row(g, 6, [[23, 40, 'K'], [25, 38, '3']]);
  row(g, 7, [[22, 41, 'K'], [24, 39, '4'], [27, 36, '5']]);
  // helm body (rows 8-21)
  for(let y=8; y<=21; y++){
    px(g, 22, y, 'K');
    px(g, 41, y, 'K');
    for(let x=23; x<=40; x++) px(g, x, y, '4');
    // inner highlight column
    px(g, 25, y, '5');
    px(g, 26, y, '5');
    // shadow column
    px(g, 38, y, '3');
    px(g, 39, y, '3');
  }
  // crown band (gold rim)
  row(g, 8, [[23, 40, 'L'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 9, [[23, 40, 'W'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 10, [[23, 40, 'Y'], [22, 22, 'K'], [41, 41, 'K']]);

  // visor slit (rows 14-16) — cyan glow
  row(g, 14, [[24, 39, 'K']]);
  row(g, 15, [[25, 38, 'i'], [24, 24, 'K'], [39, 39, 'K'], [31, 32, 'I']]);
  row(g, 16, [[24, 39, 'K']]);

  // breath holes (rows 18-19, small dots)
  for(let x=25; x<=39; x+=3){ px(g, x, 18, 'K'); px(g, x+1, 19, 'K'); }

  // horn studs at top
  row(g, 5, [[22, 22, 'K'], [41, 41, 'K']]);
  row(g, 4, [[22, 23, 'L'], [40, 41, 'L']]);
  row(g, 3, [[22, 22, 'W'], [41, 41, 'W']]);

  // --- pauldrons (big rounded shoulder caps) ---
  // left pauldron
  for(let y=22; y<=29; y++){
    const r = Math.min(7, 7 - Math.abs(y - 25));
    rect(g, 11, y, 6+r, 1, '4');
  }
  outline(g, 11, 22, 13, 8, 'K');
  // shading + gold trim
  row(g, 22, [[12, 22, '5']]);
  row(g, 23, [[12, 22, '4']]);
  row(g, 28, [[12, 22, '3']]);
  row(g, 29, [[12, 22, 'L']]);
  // right pauldron (mirror)
  for(let y=22; y<=29; y++){
    const r = Math.min(7, 7 - Math.abs(y - 25));
    rect(g, 64-11-(6+r), y, 6+r, 1, '4');
  }
  outline(g, 40, 22, 13, 8, 'K');
  row(g, 22, [[41, 51, '5']]);
  row(g, 23, [[41, 51, '4']]);
  row(g, 28, [[41, 51, '3']]);
  row(g, 29, [[41, 51, 'L']]);

  // --- chest plate (rows 22-44) ---
  // base
  rect(g, 24, 22, 16, 23, '4');
  outline(g, 24, 22, 16, 23, 'K');
  // central vertical seam
  vline(g, 31, 22, 44, '3');
  vline(g, 32, 22, 44, '5');
  // chest contour shading
  for(let y=24; y<=32; y++){
    px(g, 25, y, '5');
    px(g, 26, y, '5');
    px(g, 37, y, '3');
    px(g, 38, y, '3');
  }
  // upper neck/gorget
  row(g, 22, [[28, 35, 'K']]);
  row(g, 23, [[28, 35, '3'], [29, 34, '4']]);

  // golden chest emblem (sun cross)
  row(g, 28, [[30, 33, 'L']]);
  row(g, 29, [[29, 34, 'L'], [30, 33, 'W']]);
  row(g, 30, [[28, 35, 'L'], [30, 33, 'W'], [31, 32, '9']]);
  row(g, 31, [[28, 35, 'L'], [30, 33, 'W']]);
  row(g, 32, [[29, 34, 'L'], [30, 33, 'W']]);
  row(g, 33, [[30, 33, 'L']]);

  // abdominal plate ribs
  for(let y=36; y<=42; y+=2){
    row(g, y, [[25, 38, '3'], [31, 31, '3'], [32, 32, '5']]);
    row(g, y+1, [[25, 38, '4']]);
  }

  // gold belt
  row(g, 43, [[24, 39, 'L']]);
  row(g, 44, [[24, 39, 'W'], [30, 33, 'K']]);
  row(g, 45, [[24, 39, 'K'], [30, 33, 'L']]);

  // --- arms (vambraces gripping greatsword in front) ---
  // left arm hanging slightly forward — but actually both hands on pommel
  // upper-left arm
  rect(g, 14, 30, 6, 10, '4');
  outline(g, 14, 30, 6, 10, 'K');
  vline(g, 15, 31, 39, '5');
  // left forearm angled toward center grip
  rect(g, 18, 38, 8, 5, '4');
  outline(g, 18, 38, 8, 5, 'K');
  // upper-right arm
  rect(g, 44, 30, 6, 10, '4');
  outline(g, 44, 30, 6, 10, 'K');
  vline(g, 48, 31, 39, '3');
  rect(g, 38, 38, 8, 5, '4');
  outline(g, 38, 38, 8, 5, 'K');

  // gauntlets (hands on sword)
  rect(g, 24, 40, 7, 6, '3');
  rect(g, 33, 40, 7, 6, '3');
  outline(g, 24, 40, 7, 6, 'K');
  outline(g, 33, 40, 7, 6, 'K');
  // gauntlet knuckle highlights
  for(let x=25; x<=29; x+=2){ px(g, x, 41, '5'); }
  for(let x=34; x<=38; x+=2){ px(g, x, 41, '5'); }

  // --- greatsword: pommel above hands, crossguard at hands, long blade down ---
  // pommel
  row(g, 36, [[31, 32, 'L']]);
  row(g, 37, [[30, 33, 'W'], [31, 32, 'L']]);
  row(g, 38, [[30, 33, 'L'], [31, 32, '9']]);
  row(g, 39, [[30, 33, 'W']]);
  // grip
  row(g, 40, [[31, 32, '7']]);
  row(g, 41, [[31, 32, 'n']]);
  row(g, 42, [[31, 32, '7']]);
  row(g, 43, [[31, 32, 'n']]);
  // crossguard (wide gold)
  row(g, 46, [[22, 41, 'K']]);
  row(g, 47, [[22, 41, 'W'], [30, 33, 'L'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 48, [[22, 41, 'L']]);
  row(g, 49, [[22, 41, 'K']]);
  // blade (long, tapered)
  for(let y=50; y<=60; y++){
    const taper = Math.floor((y-50) * 0.2);
    const l = 28 + taper, r = 35 - taper;
    px(g, l-1, y, 'K');
    px(g, r+1, y, 'K');
    for(let x=l; x<=r; x++) px(g, x, y, '4');
    px(g, 31, y, '5');
    px(g, 32, y, '5');
  }
  // blade tip
  row(g, 61, [[30, 33, 'K']]);

  // --- skirt / fauld / cuisses (hidden behind sword, sides visible) ---
  rect(g, 24, 46, 7, 10, '3');
  rect(g, 33, 46, 7, 10, '3');
  outline(g, 24, 46, 7, 10, 'K');
  outline(g, 33, 46, 7, 10, 'K');
  vline(g, 25, 47, 55, '4');
  vline(g, 39, 47, 55, '4');

  // --- greaves + sabatons ---
  rect(g, 23, 56, 8, 5, '3');
  rect(g, 33, 56, 8, 5, '3');
  outline(g, 23, 56, 8, 5, 'K');
  outline(g, 33, 56, 8, 5, 'K');
  // sabaton plates
  row(g, 60, [[22, 31, 'K'], [33, 42, 'K']]);
  row(g, 61, [[21, 32, 'K'], [33, 43, 'K']]);
  row(g, 60, [[23, 30, '4'], [34, 41, '4']]);
  // sabaton highlight
  row(g, 61, [[23, 27, '5'], [37, 41, '5']]);

  // pauldron rivets (small black dots)
  for(let x=14; x<=22; x+=3){ px(g, x, 26, 'K'); }
  for(let x=41; x<=49; x+=3){ px(g, x, 26, 'K'); }

  return gridToS(g);
}

/* ============================================================
   3) ROGUE — green hood pulled low, twin daggers crossed,
      dark leather. Cold green palette w/ poison accents.
   ============================================================ */
function buildRogue(){
  const g = mkGrid();

  // ground
  row(g, 62, [[20, 43, 'k']]);
  row(g, 63, [[22, 41, 's']]);

  // --- hood (deeply forward, casting shadow over upper face) ---
  trapezoid(g, 5, 23, 26, 37, 16, 47, 'G', 'K');
  // lining
  trapezoid(g, 6, 22, 27, 36, 18, 45, 'g', 'G');
  // hood front shadow ridge
  row(g, 13, [[21, 42, 'K']]);
  row(g, 14, [[22, 41, 'g']]);

  // mask shadow over face area
  row(g, 15, [[24, 39, 'k']]);
  row(g, 16, [[24, 39, 'k']]);
  row(g, 17, [[24, 39, 'k']]);
  row(g, 18, [[25, 38, 'k']]);

  // eyes — pure poison green glint
  row(g, 16, [[27, 28, 'H'], [35, 36, 'H']]);
  row(g, 17, [[27, 28, 'j'], [35, 36, 'j']]);

  // jaw / lower face (hint of skin)
  row(g, 19, [[27, 36, 'n']]);
  row(g, 20, [[28, 35, 'n'], [30, 33, 'B']]);
  row(g, 21, [[29, 34, 'n']]);

  // chin scarf
  row(g, 22, [[26, 37, 'G']]);
  row(g, 23, [[24, 39, 'G']]);

  // --- shoulders / cloak shoulders ---
  trapezoid(g, 24, 31, 18, 45, 14, 49, 'g', 'K');
  // shoulder buckle gold
  px(g, 16, 27, 'L'); px(g, 47, 27, 'L');

  // --- chest (dark leather harness) ---
  rect(g, 22, 30, 20, 14, 'n');
  outline(g, 22, 30, 20, 14, 'K');
  // diagonal harness straps
  for(let i=0; i<14; i++){
    px(g, 24+i, 30+i, 'k');
    px(g, 24+i, 31+i, 'B');
    px(g, 41-i, 30+i, 'k');
    px(g, 41-i, 31+i, 'B');
  }
  // central buckle
  rect(g, 30, 35, 4, 4, '7');
  outline(g, 30, 35, 4, 4, 'K');
  px(g, 31, 36, 'L'); px(g, 32, 36, 'L');

  // poison vial on belt (small)
  rect(g, 15, 40, 4, 6, 'H');
  outline(g, 15, 40, 4, 6, 'K');
  row(g, 40, [[16, 17, '7']]);
  px(g, 16, 42, 'j');

  // --- arms crossed over chest, gripping twin daggers ---
  // left arm crossing right
  // upper arm angled
  for(let i=0; i<10; i++){
    rect(g, 14+i, 32+i, 4, 1, 'n');
    px(g, 14+i, 32+i, 'K');
    px(g, 17+i, 32+i, 'K');
  }
  // right arm crossing left
  for(let i=0; i<10; i++){
    rect(g, 46-i-3, 32+i, 4, 1, 'n');
    px(g, 46-i-3, 32+i, 'K');
    px(g, 46-i, 32+i, 'K');
  }
  // hands meet in center near chest at row ~41
  rect(g, 24, 41, 6, 4, 'n');
  rect(g, 34, 41, 6, 4, 'n');
  outline(g, 24, 41, 6, 4, 'K');
  outline(g, 34, 41, 6, 4, 'K');

  // --- twin daggers crossed in front of chest (X) ---
  // dagger 1: top-left grip -> bottom-right blade
  // grip near left hand
  for(let i=0; i<6; i++){ px(g, 25+i, 41-i, '6'); px(g, 26+i, 41-i, 'n'); }
  // crossguard
  row(g, 35, [[29, 33, 'H']]);
  // blade extending toward lower right
  for(let i=0; i<14; i++){
    px(g, 32+i, 36+i, 'K');
    px(g, 33+i, 36+i, '4');
    px(g, 34+i, 36+i, '5');
    px(g, 35+i, 36+i, 'K');
    // poison drip green
    if(i > 6) px(g, 33+i, 36+i, 'H');
  }
  // dagger 2: top-right grip -> bottom-left blade
  for(let i=0; i<6; i++){ px(g, 38-i, 41-i, '6'); px(g, 37-i, 41-i, 'n'); }
  row(g, 35, [[30, 34, 'H']]);
  for(let i=0; i<14; i++){
    px(g, 31-i, 36+i, 'K');
    px(g, 30-i, 36+i, '5');
    px(g, 29-i, 36+i, '4');
    px(g, 28-i, 36+i, 'K');
    if(i > 6) px(g, 30-i, 36+i, 'H');
  }
  // central X cross highlight
  row(g, 42, [[30, 33, 'L']]);
  row(g, 43, [[30, 33, 'W']]);

  // --- cloak (drapes back, visible left + right) ---
  // left cloak panel
  for(let y=30; y<=58; y++){
    const x = 12 + Math.floor((y-30) * 0.15);
    rect(g, x, y, 5 - Math.floor((y-30)*0.1), 1, 'g');
    px(g, x, y, 'K');
  }
  // right cloak panel
  for(let y=30; y<=58; y++){
    const w = 5 - Math.floor((y-30)*0.1);
    const x = 64 - 12 - w - Math.floor((y-30) * 0.15);
    rect(g, x, y, w, 1, 'g');
    px(g, x + w - 1, y, 'K');
  }

  // --- belt ---
  row(g, 44, [[22, 41, 'K']]);
  row(g, 45, [[22, 41, 'n'], [30, 33, 'L']]);
  row(g, 46, [[22, 41, 'K']]);

  // --- legs (tight pants) ---
  rect(g, 24, 47, 7, 11, 's');
  rect(g, 33, 47, 7, 11, 's');
  vline(g, 24, 47, 57, 'K');
  vline(g, 30, 47, 57, 'K');
  vline(g, 33, 47, 57, 'K');
  vline(g, 39, 47, 57, 'K');
  vline(g, 25, 48, 56, 'S');
  vline(g, 34, 48, 56, 'S');

  // knee straps
  row(g, 51, [[24, 30, '6']]);
  row(g, 51, [[33, 39, '6']]);

  // --- boots (soft leather, knife sheath on right boot) ---
  rect(g, 22, 56, 11, 5, 'n');
  rect(g, 31, 56, 11, 5, 'n');
  outline(g, 22, 56, 11, 5, 'K');
  outline(g, 31, 56, 11, 5, 'K');
  // boot cuffs darker
  row(g, 56, [[23, 31, 'k'], [32, 40, 'k']]);
  // boot toe highlights
  row(g, 60, [[24, 26, 'B'], [37, 39, 'B']]);
  // small sheath on right boot
  rect(g, 38, 56, 2, 5, 'B');
  outline(g, 38, 56, 2, 5, 'K');

  return gridToS(g);
}

/* ============================================================
   KNIGHT V1 — FOOTMAN, less gear (Act I starting kit)
      Chainmail coif (not great helm), face visible, simple
      gambeson + chainmail tunic with a red-cross cloth tabard,
      brown belt, arming sword at the side, leather boots.
      Same character as Knight V2 but before the plate upgrade.
   ============================================================ */
function buildKnightV1(){
  const g = mkGrid();

  // ground
  row(g, 62, [[18, 45, 'k']]);
  row(g, 63, [[22, 41, 's']]);

  // === CHAINMAIL COIF (rows 4-12) ===
  // top dome
  row(g, 4,  [[27, 36, 'K']]);
  row(g, 5,  [[25, 38, 'K'], [27, 36, '3']]);
  row(g, 6,  [[23, 40, 'K'], [25, 38, '3'], [27, 36, '4']]);
  row(g, 7,  [[22, 41, 'K'], [23, 40, '3'], [25, 38, '4']]);
  for(let y=8; y<=12; y++){
    px(g, 22, y, 'K'); px(g, 41, y, 'K');
    for(let x=23; x<=40; x++) px(g, x, y, '3');
    // chainmail texture — alternating lighter dots
    for(let x=23 + (y%2); x<=40; x+=2) px(g, x, y, '4');
  }

  // === FACE (rows 13-21) — visible inside coif ===
  // forehead
  row(g, 13, [[22, 22, 'K'], [41, 41, 'K'], [23, 40, '3'],
              [25, 38, 'e']]);
  // skin face
  for(let y=14; y<=20; y++){
    px(g, 22, y, 'K'); px(g, 41, y, 'K');
    // coif sides
    px(g, 23, y, '3'); px(g, 40, y, '3');
    px(g, 24, y, '3'); px(g, 39, y, '3');
    // skin
    for(let x=25; x<=38; x++) px(g, x, y, 'e');
  }
  // eyes
  row(g, 15, [[27, 28, 'K'], [35, 36, 'K']]);
  row(g, 16, [[27, 28, 'c'], [35, 36, 'c']]);
  // nose
  row(g, 17, [[31, 32, 'b']]);
  // mouth
  row(g, 19, [[29, 34, 'B']]);
  // chin/jaw — coif curves under
  row(g, 21, [[24, 24, 'K'], [39, 39, 'K'], [25, 38, '3'], [28, 35, 'e']]);
  row(g, 22, [[25, 25, 'K'], [38, 38, 'K'], [26, 37, '3'], [29, 34, 'e']]);

  // === SHOULDERS + chainmail tunic (rows 23-30) ===
  row(g, 23, [[18, 18, 'K'], [45, 45, 'K'], [19, 44, '3']]);
  row(g, 24, [[16, 16, 'K'], [47, 47, 'K'], [17, 46, '3']]);
  row(g, 25, [[15, 15, 'K'], [48, 48, 'K'], [16, 47, '3']]);
  // chainmail dot-pattern over the shoulders
  for(let y=23; y<=30; y++){
    for(let x=17 + (y%2); x<=46; x+=2){
      if(g[y][x] === '3') g[y][x] = '4';
    }
  }
  // body chainmail rows 26-30
  for(let y=26; y<=30; y++){
    px(g, 15, y, 'K'); px(g, 48, y, 'K');
    for(let x=16; x<=47; x++) px(g, x, y, '3');
    for(let x=16 + (y%2); x<=47; x+=2) px(g, x, y, '4');
  }

  // === RED-CROSS TABARD (cloth surcoat over chainmail) ===
  // tabard rectangle, centered
  for(let y=27; y<=46; y++){
    for(let x=24; x<=39; x++) px(g, x, y, 'w');  // cream cloth
    px(g, 24, y, 'K'); px(g, 39, y, 'K');
    // light shading on right edge
    px(g, 38, y, 'z');
  }
  // red cross — vertical bar
  for(let y=29; y<=42; y++){
    for(let x=30; x<=33; x++) px(g, x, y, 'R');
    px(g, 30, y, 'r'); // edge shadow
    px(g, 33, y, 'r');
  }
  // red cross — horizontal bar
  for(let y=32; y<=35; y++){
    for(let x=26; x<=37; x++) px(g, x, y, 'R');
    px(g, 26, y, 'r'); px(g, 37, y, 'r');
  }
  // cross highlights
  row(g, 30, [[31, 32, 'x']]);
  row(g, 33, [[27, 36, 'x']]);

  // === BROWN LEATHER BELT ===
  row(g, 47, [[15, 15, 'K'], [48, 48, 'K'], [16, 47, 'K']]);
  row(g, 48, [[15, 15, 'K'], [48, 48, 'K'], [16, 47, '6'],
              [29, 34, 'L'], [30, 33, 'W']]);
  row(g, 49, [[15, 15, 'K'], [48, 48, 'K'], [16, 47, 'n']]);

  // === ARMS hanging at sides, holding sword on right ===
  // left arm sleeve (chainmail)
  rect(g, 14, 31, 4, 14, '3');
  outline(g, 14, 31, 4, 14, 'K');
  for(let y=31; y<=44; y+=2) px(g, 16, y, '4');
  // left hand (skin)
  rect(g, 14, 45, 4, 4, 'e');
  outline(g, 14, 45, 4, 4, 'K');

  // right arm sleeve (chainmail) — holds sword grip
  rect(g, 46, 31, 4, 14, '3');
  outline(g, 46, 31, 4, 14, 'K');
  for(let y=31; y<=44; y+=2) px(g, 48, y, '4');
  // right hand grips pommel
  rect(g, 46, 45, 4, 4, 'n');
  outline(g, 46, 45, 4, 4, 'K');

  // === ARMING SWORD (smaller than greatsword), at right side ===
  // pommel
  row(g, 41, [[48, 49, 'K']]);
  row(g, 42, [[47, 47, 'K'], [50, 50, 'K'], [48, 49, 'W']]);
  row(g, 43, [[47, 47, 'K'], [50, 50, 'K'], [48, 49, 'L']]);
  // grip
  row(g, 44, [[48, 49, '6']]);
  row(g, 45, [[48, 49, 'n']]);
  // crossguard
  row(g, 46, [[45, 52, 'K']]);
  row(g, 47, [[45, 52, 'L'], [45, 45, 'K'], [52, 52, 'K']]);
  row(g, 48, [[45, 52, 'K']]);
  // blade (short arming sword)
  for(let y=49; y<=59; y++){
    px(g, 47, y, 'K');
    px(g, 48, y, '4');
    px(g, 49, y, '5');
    px(g, 50, y, 'K');
  }
  // blade tip
  row(g, 60, [[48, 49, '4']]);
  row(g, 61, [[48, 49, 'K']]);

  // === LEGS — brown gambeson trousers ===
  for(let y=50; y<=57; y++){
    px(g, 22, y, 'K'); px(g, 31, y, 'K');
    for(let x=23; x<=30; x++) px(g, x, y, '6');
    px(g, 24, y, '7');
    px(g, 33, y, 'K'); px(g, 42, y, 'K');
    for(let x=34; x<=41; x++) px(g, x, y, '6');
    px(g, 35, y, '7');
  }

  // === BROWN LEATHER BOOTS ===
  row(g, 58, [[21, 31, 'K'], [22, 30, 'n']]);
  row(g, 59, [[21, 21, 'K'], [31, 31, 'K'], [22, 30, 'B']]);
  row(g, 60, [[20, 32, 'K'], [21, 31, 'B'], [22, 30, 'n']]);
  row(g, 61, [[19, 33, 'K']]);

  row(g, 58, [[32, 42, 'K'], [33, 41, 'n']]);
  row(g, 59, [[32, 32, 'K'], [42, 42, 'K'], [33, 41, 'B']]);
  row(g, 60, [[31, 43, 'K'], [32, 42, 'B'], [33, 41, 'n']]);
  row(g, 61, [[30, 44, 'K']]);

  return gridToS(g);
}

/* ============================================================
   WANDERER V2 — ARCANE KNIGHT (Act II upgrade)
      Same Wanderer palette (blue + gold + cyan + purple) but
      now armored like the Knight: blue plate helm with cyan
      visor slit, large pauldrons, blue breastplate with a
      purple-gem sun emblem, gauntlets gripping a cyan-glowing
      magic sword, blue plate greaves. Floating arcane sparkles.
   ============================================================ */
function buildWandererV2(){
  const g = mkGrid();

  // ground
  row(g, 62, [[16, 47, 'k']]);
  row(g, 63, [[18, 45, 's']]);

  // === ORNATE BLUE HELM with gold trim and cyan visor ===
  // top spike / crest
  row(g, 2, [[31, 32, 'L']]);
  row(g, 3, [[30, 33, 'L'], [31, 32, 'W']]);
  row(g, 4, [[29, 34, 'K'], [30, 33, 'L']]);
  // dome
  row(g, 5, [[26, 37, 'K'], [27, 36, 'C'], [29, 34, 'c']]);
  row(g, 6, [[24, 39, 'K'], [25, 38, 'C'], [27, 36, 'c']]);
  row(g, 7, [[22, 41, 'K'], [23, 40, 'C'], [25, 38, 'c'], [28, 35, '2']]);

  // helm body (rows 8-21)
  for(let y=8; y<=21; y++){
    px(g, 22, y, 'K');
    px(g, 41, y, 'K');
    for(let x=23; x<=40; x++) px(g, x, y, 'C');
    // inner highlight column
    px(g, 25, y, 'I');
    px(g, 26, y, 'i');
    // shadow column
    px(g, 38, y, '2');
    px(g, 39, y, '2');
  }
  // gold crown band
  row(g, 8, [[23, 40, 'L'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 9, [[23, 40, 'W'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 10, [[23, 40, 'L'], [22, 22, 'K'], [41, 41, 'K']]);

  // === CYAN VISOR SLIT — wider + glowing brighter than Knight ===
  row(g, 14, [[24, 39, 'K']]);
  row(g, 15, [[24, 24, 'K'], [39, 39, 'K'],
              [25, 38, 'i'],
              [27, 30, 'Z'], [33, 36, 'Z']]);   // brighter glints where eyes are
  row(g, 16, [[24, 39, 'K']]);

  // little gold side-wings on helm
  row(g, 11, [[20, 21, 'L'], [42, 43, 'L']]);
  row(g, 12, [[20, 21, 'W'], [42, 43, 'W']]);
  row(g, 13, [[20, 21, 'L'], [42, 43, 'L']]);

  // breath holes (small dots below visor)
  for(let x=25; x<=39; x+=3){ px(g, x, 19, 'K'); }

  // === BLUE PAULDRONS with gold rivets ===
  for(let y=22; y<=29; y++){
    const r = Math.min(7, 7 - Math.abs(y - 25));
    rect(g, 11, y, 6+r, 1, 'C');
  }
  outline(g, 11, 22, 13, 8, 'K');
  // shading + gold trim
  row(g, 22, [[12, 22, 'I']]);
  row(g, 23, [[12, 22, 'C']]);
  row(g, 28, [[12, 22, '2']]);
  row(g, 29, [[12, 22, 'L']]);
  // right pauldron (mirror)
  for(let y=22; y<=29; y++){
    const r = Math.min(7, 7 - Math.abs(y - 25));
    rect(g, 64-11-(6+r), y, 6+r, 1, 'C');
  }
  outline(g, 40, 22, 13, 8, 'K');
  row(g, 22, [[41, 51, 'I']]);
  row(g, 23, [[41, 51, 'C']]);
  row(g, 28, [[41, 51, '2']]);
  row(g, 29, [[41, 51, 'L']]);

  // pauldron rivets
  for(let x=14; x<=22; x+=3){ px(g, x, 26, 'L'); }
  for(let x=41; x<=49; x+=3){ px(g, x, 26, 'L'); }

  // === BLUE CHEST PLATE (rows 22-44) ===
  rect(g, 24, 22, 16, 23, 'C');
  outline(g, 24, 22, 16, 23, 'K');
  // central vertical seam (gold)
  vline(g, 31, 22, 44, 'L');
  vline(g, 32, 22, 44, 'L');
  // chest contour shading
  for(let y=24; y<=32; y++){
    px(g, 25, y, 'I');
    px(g, 26, y, 'I');
    px(g, 37, y, '2');
    px(g, 38, y, '2');
  }
  // upper neck/gorget
  row(g, 22, [[28, 35, 'K']]);
  row(g, 23, [[28, 35, '2'], [29, 34, 'c']]);

  // === ARCANE SUN EMBLEM with PURPLE GEM in center ===
  // sun rays (gold)
  row(g, 27, [[30, 33, 'L']]);
  row(g, 28, [[29, 34, 'L']]);
  row(g, 29, [[28, 35, 'L']]);
  row(g, 30, [[28, 35, 'L'], [30, 33, 'W']]);
  row(g, 31, [[27, 36, 'L'], [29, 34, 'W']]);
  row(g, 32, [[28, 35, 'L'], [30, 33, 'W']]);
  row(g, 33, [[28, 35, 'L']]);
  row(g, 34, [[29, 34, 'L']]);
  row(g, 35, [[30, 33, 'L']]);
  // PURPLE GEM core
  row(g, 30, [[30, 33, 'K']]);
  row(g, 31, [[30, 33, 'P'], [31, 32, 'u']]);
  row(g, 32, [[30, 33, 'p'], [31, 32, 'U']]);
  row(g, 33, [[30, 33, 'K']]);

  // === abdominal plate ribs ===
  for(let y=37; y<=42; y+=2){
    row(g, y, [[25, 38, '2'], [31, 31, '2'], [32, 32, 'I']]);
    row(g, y+1, [[25, 38, 'C']]);
  }

  // === GOLD BELT ===
  row(g, 43, [[24, 39, 'L']]);
  row(g, 44, [[24, 39, 'W'], [30, 33, 'K']]);
  row(g, 45, [[24, 39, 'K'], [30, 33, 'L']]);

  // === ARMS — blue vambraces, gauntlets gripping sword ===
  // upper-left arm
  rect(g, 14, 30, 6, 10, 'C');
  outline(g, 14, 30, 6, 10, 'K');
  vline(g, 15, 31, 39, 'I');
  // left forearm angled toward center grip
  rect(g, 18, 38, 8, 5, 'C');
  outline(g, 18, 38, 8, 5, 'K');
  // upper-right arm
  rect(g, 44, 30, 6, 10, 'C');
  outline(g, 44, 30, 6, 10, 'K');
  vline(g, 48, 31, 39, '2');
  rect(g, 38, 38, 8, 5, 'C');
  outline(g, 38, 38, 8, 5, 'K');
  // gold elbow trim
  row(g, 40, [[14, 19, 'L'], [44, 49, 'L']]);

  // gauntlets (steel-blue) gripping the sword
  rect(g, 24, 40, 7, 6, 'I');
  rect(g, 33, 40, 7, 6, 'I');
  outline(g, 24, 40, 7, 6, 'K');
  outline(g, 33, 40, 7, 6, 'K');
  // gauntlet knuckle highlights
  for(let x=25; x<=29; x+=2){ px(g, x, 41, 'Z'); }
  for(let x=34; x<=38; x+=2){ px(g, x, 41, 'Z'); }

  // === MAGIC GREATSWORD: pommel above hands, cyan-glowing blade ===
  // pommel — PURPLE GEM
  row(g, 36, [[31, 32, 'K']]);
  row(g, 37, [[30, 33, 'K'], [31, 32, 'U']]);
  row(g, 38, [[30, 33, 'P'], [31, 32, 'u']]);
  row(g, 39, [[30, 33, 'K']]);
  // grip — gold-wrapped
  row(g, 40, [[31, 32, 'L']]);
  row(g, 41, [[31, 32, 'W']]);
  row(g, 42, [[31, 32, 'L']]);
  row(g, 43, [[31, 32, 'W']]);
  // crossguard (wide gold)
  row(g, 46, [[22, 41, 'K']]);
  row(g, 47, [[22, 41, 'W'], [30, 33, 'L'], [22, 22, 'K'], [41, 41, 'K']]);
  row(g, 48, [[22, 41, 'L']]);
  row(g, 49, [[22, 41, 'K']]);

  // CYAN-GLOWING magic blade — wide center, glowing edges
  for(let y=50; y<=60; y++){
    const taper = Math.floor((y-50) * 0.2);
    const l = 28 + taper, r = 35 - taper;
    px(g, l-1, y, 'K');
    px(g, r+1, y, 'K');
    for(let x=l; x<=r; x++) px(g, x, y, 'i');     // cyan glow body
    px(g, 31, y, 'Z');                            // bright Z core
    px(g, 32, y, 'Z');
    // outer halo glow
    px(g, l-2, y, 'C');
    px(g, r+2, y, 'C');
  }
  // blade tip
  row(g, 61, [[30, 33, 'K']]);

  // === BLUE FAULD / CUISSES (rows 46-55) ===
  rect(g, 24, 46, 7, 10, 'C');
  rect(g, 33, 46, 7, 10, 'C');
  outline(g, 24, 46, 7, 10, 'K');
  outline(g, 33, 46, 7, 10, 'K');
  vline(g, 25, 47, 55, 'I');
  vline(g, 39, 47, 55, 'I');
  // gold trim at knee
  row(g, 55, [[24, 30, 'L'], [33, 39, 'L']]);

  // === BLUE PLATE GREAVES + sabatons ===
  rect(g, 23, 56, 8, 5, 'C');
  rect(g, 33, 56, 8, 5, 'C');
  outline(g, 23, 56, 8, 5, 'K');
  outline(g, 33, 56, 8, 5, 'K');
  vline(g, 24, 57, 60, 'I');
  vline(g, 34, 57, 60, 'I');
  // sabaton plates
  row(g, 60, [[22, 31, 'K'], [33, 42, 'K']]);
  row(g, 61, [[21, 32, 'K'], [33, 43, 'K']]);
  row(g, 60, [[23, 30, 'C'], [34, 41, 'C']]);
  row(g, 61, [[23, 27, 'I'], [37, 41, 'I']]);

  // === FLOATING ARCANE SPARKLES around the figure ===
  px(g, 12, 8, 'i');  px(g, 12, 9, 'I');
  px(g, 53, 12, 'i'); px(g, 54, 13, 'I');
  px(g, 9, 28, 'i');  px(g, 8, 27, 'I');
  px(g, 55, 30, 'i'); px(g, 56, 29, 'I');
  px(g, 10, 50, 'i'); px(g, 53, 52, 'i');

  return gridToS(g);
}

/* ============================================================
   ROGUE V2 — MASTER ASSASSIN (Act II upgrade)
      Hood + scarf mask covering nose/mouth, only poison-green
      eyes visible. Spiked pauldrons, bandolier of throwing
      knives across chest, twin CURVED daggers (kukri) with
      glowing poison drip. Black + dark green palette w/ gold.
   ============================================================ */
function buildRogueV2(){
  const g = mkGrid();

  // ground
  row(g, 62, [[20, 43, 'k']]);
  row(g, 63, [[22, 41, 's']]);

  // === HOOD (deep, low over face) — darker than V1 ===
  trapezoid(g, 4, 22, 27, 36, 14, 49, 'g', 'K');
  trapezoid(g, 5, 21, 28, 35, 16, 47, 'G', 'g');
  // hood front shadow
  row(g, 12, [[20, 43, 'K']]);
  row(g, 13, [[22, 41, 'g']]);

  // === FACE — completely shadowed except eyes ===
  row(g, 14, [[24, 39, 'k']]);
  row(g, 15, [[23, 40, 'k']]);
  // POISON-GREEN GLOWING EYES — bigger, with halo
  row(g, 16, [[25, 29, 'K'], [34, 38, 'K']]);
  row(g, 17, [[25, 29, 'H'], [26, 28, 'j'], [27, 27, 'Z'],
              [34, 38, 'H'], [35, 37, 'j'], [36, 36, 'Z']]);
  row(g, 18, [[25, 29, 'G'], [26, 28, 'H'],
              [34, 38, 'G'], [35, 37, 'H']]);

  // === SCARF MASK (covers nose/mouth, dark cloth) ===
  row(g, 19, [[21, 42, 'k']]);
  row(g, 20, [[20, 43, 'K'], [21, 42, 'k'], [22, 41, 's']]);
  row(g, 21, [[19, 44, 'K'], [20, 43, 's'], [22, 41, 'S']]);
  row(g, 22, [[19, 44, 'K'], [20, 43, 'k']]);

  // === SHOULDERS with SPIKED PAULDRONS ===
  // base shoulders (dark armor)
  row(g, 23, [[16, 16, 'K'], [47, 47, 'K'], [17, 46, 's'], [22, 41, 'k']]);
  row(g, 24, [[14, 14, 'K'], [49, 49, 'K'], [15, 48, 's']]);
  row(g, 25, [[13, 13, 'K'], [50, 50, 'K'], [14, 49, 's']]);
  row(g, 26, [[12, 12, 'K'], [51, 51, 'K'], [13, 50, 'k']]);
  row(g, 27, [[12, 12, 'K'], [51, 51, 'K'], [13, 50, 's']]);
  row(g, 28, [[12, 12, 'K'], [51, 51, 'K'], [13, 50, 'k']]);
  // SPIKES jutting up from each pauldron
  row(g, 22, [[14, 14, 'K'], [49, 49, 'K']]);
  row(g, 21, [[14, 14, 'K'], [49, 49, 'K']]);
  row(g, 20, [[14, 14, 'K'], [49, 49, 'K']]);
  px(g, 15, 23, 'K'); px(g, 13, 23, 'K');
  px(g, 48, 23, 'K'); px(g, 50, 23, 'K');
  // outer spike
  row(g, 24, [[11, 11, 'K'], [52, 52, 'K']]);
  row(g, 23, [[11, 11, 'K'], [52, 52, 'K']]);
  row(g, 22, [[11, 11, 'K'], [52, 52, 'K']]);
  // gold rivets
  px(g, 16, 25, 'L'); px(g, 47, 25, 'L');
  px(g, 13, 27, 'L'); px(g, 50, 27, 'L');

  // === CHEST — dark leather harness ===
  rect(g, 18, 28, 28, 16, 'n');
  outline(g, 18, 28, 28, 16, 'K');
  // shading
  for(let y=29; y<=42; y++){
    for(let x=35; x<=44; x++) px(g, x, y, 'k');
    for(let x=19; x<=24; x++) px(g, x, y, '6');
  }

  // === BANDOLIER of throwing knives across the chest ===
  // diagonal strap from left shoulder to right hip
  for(let i=0; i<22; i++){
    px(g, 17+i, 28+i, '6');
    px(g, 18+i, 28+i, '7');
    px(g, 17+i, 29+i, 'K');
  }
  // knife handles sticking out at intervals
  for(let i=2; i<20; i+=4){
    const x = 17+i, y = 28+i;
    // tiny knife handle
    px(g, x-1, y-2, 'K');
    px(g, x, y-2, '4');
    px(g, x+1, y-2, 'K');
    px(g, x, y-1, 'K');
  }

  // === TWIN CURVED DAGGERS (kukri-style) crossed at chest ===
  // central crossing point at row 38
  // dagger A: from lower-left to upper-right (handle bottom-left, blade up-right)
  // handle (wrapped grip)
  for(let i=0; i<5; i++){
    px(g, 20+i, 44+i, 'K');
    px(g, 21+i, 44+i, '6');
    px(g, 22+i, 44+i, '7');
    px(g, 23+i, 44+i, 'K');
  }
  // crossguard
  row(g, 43, [[24, 28, 'L']]);
  // curved blade going up-right (with poison-green edge)
  const curveA = [
    [26, 42], [27, 41], [28, 40], [29, 39],
    [30, 38], [31, 37], [32, 36], [33, 35],
    [34, 34], [35, 33], [36, 33], [37, 32],
    [38, 32], [39, 32]
  ];
  for(const [cx, cy] of curveA){
    px(g, cx-1, cy, 'K');
    px(g, cx, cy, '5');
    px(g, cx+1, cy, '4');
    px(g, cx+2, cy, 'K');
    px(g, cx, cy-1, 'H'); // poison edge above
  }
  // dagger B: from lower-right to upper-left (mirror)
  for(let i=0; i<5; i++){
    px(g, 43-i, 44+i, 'K');
    px(g, 42-i, 44+i, '6');
    px(g, 41-i, 44+i, '7');
    px(g, 40-i, 44+i, 'K');
  }
  row(g, 43, [[35, 39, 'L']]);
  const curveB = [
    [37, 42], [36, 41], [35, 40], [34, 39],
    [33, 38], [32, 37], [31, 36], [30, 35],
    [29, 34], [28, 33], [27, 33], [26, 32],
    [25, 32], [24, 32]
  ];
  for(const [cx, cy] of curveB){
    px(g, cx-2, cy, 'K');
    px(g, cx-1, cy, '4');
    px(g, cx, cy, '5');
    px(g, cx+1, cy, 'K');
    px(g, cx, cy-1, 'H'); // poison edge
  }

  // === DARK LEATHER BELT with gold buckle ===
  row(g, 45, [[17, 46, 'K']]);
  row(g, 46, [[17, 17, 'K'], [46, 46, 'K'], [18, 45, '6'],
              [29, 34, 'L'], [30, 33, '9']]);
  row(g, 47, [[17, 46, 'K']]);

  // === LEGS — tight dark pants with thigh sheaths ===
  for(let y=48; y<=57; y++){
    px(g, 22, y, 'K'); px(g, 31, y, 'K');
    for(let x=23; x<=30; x++) px(g, x, y, 's');
    px(g, 24, y, 'S');
    px(g, 33, y, 'K'); px(g, 42, y, 'K');
    for(let x=34; x<=41; x++) px(g, x, y, 's');
    px(g, 35, y, 'S');
  }
  // thigh dagger sheaths
  rect(g, 25, 49, 3, 6, 'n');
  outline(g, 25, 49, 3, 6, 'K');
  rect(g, 36, 49, 3, 6, 'n');
  outline(g, 36, 49, 3, 6, 'K');

  // knee armor (small gold plates)
  row(g, 52, [[22, 31, 'K']]);
  row(g, 53, [[22, 22, 'K'], [31, 31, 'K'], [23, 30, '6'], [25, 28, 'L']]);
  row(g, 52, [[33, 42, 'K']]);
  row(g, 53, [[33, 33, 'K'], [42, 42, 'K'], [34, 41, '6'], [36, 39, 'L']]);

  // === BOOTS — dark, with green poison drip detail ===
  row(g, 58, [[21, 31, 'K'], [22, 30, 'k']]);
  row(g, 59, [[20, 32, 'K'], [21, 31, 'k'], [22, 30, 'n']]);
  row(g, 60, [[19, 33, 'K'], [20, 32, 'k']]);
  row(g, 61, [[18, 34, 'K']]);

  row(g, 58, [[32, 42, 'K'], [33, 41, 'k']]);
  row(g, 59, [[31, 43, 'K'], [32, 42, 'k'], [33, 41, 'n']]);
  row(g, 60, [[30, 44, 'K'], [31, 43, 'k']]);
  row(g, 61, [[29, 45, 'K']]);
  // green poison drip on boot toes
  px(g, 24, 61, 'H'); px(g, 38, 61, 'H');

  // === BACKLIT CAPE silhouette behind shoulders (thin strip) ===
  for(let y=24; y<=55; y++){
    px(g, 10, y, 'g');
    px(g, 9, y, 'K');
    px(g, 53, y, 'g');
    px(g, 54, y, 'K');
  }

  return gridToS(g);
}

/* ---------- build the sprites ---------- */
const HERO_WANDERER_V1 = buildWanderer();
const HERO_WANDERER_V2 = buildWandererV2();
const HERO_KNIGHT_V1   = buildKnightV1();
const HERO_KNIGHT_V2   = buildKnight();
const HERO_ROGUE_V1    = buildRogue();
const HERO_ROGUE_V2    = buildRogueV2();

export const SPRITES64 = {
  hero64_wanderer_v1: HERO_WANDERER_V1,
  hero64_wanderer_v2: HERO_WANDERER_V2,
  hero64_knight_v1:   HERO_KNIGHT_V1,
  hero64_knight_v2:   HERO_KNIGHT_V2,
  hero64_rogue_v1:    HERO_ROGUE_V1,
  hero64_rogue_v2:    HERO_ROGUE_V2,
};

/* ---------- renderer with idle animation ---------------------
   Animation comes from two things:
   1. BOB — whole sprite shifted vertically by 0..ampPx pixels on
      a sine cycle (gentle "breathing").
   2. SHIMMER — certain palette keys are dynamically remapped on
      a separate cycle so glowing accents (cyan eyes, purple
      gems, poison edges, gold crests) pulse without authoring
      a second frame.
   Each class has its own profile so the Knight feels heavy and
   the Rogue feels fast/agitated.
   ------------------------------------------------------------ */

// per-sprite idle profiles
const IDLE = {
  hero64_wanderer_v1: { bobMs: 2200, ampPx: 1, shimmerMs: 900,  glowKeys: ['i','I'] },
  hero64_wanderer_v2: { bobMs: 2400, ampPx: 1, shimmerMs: 700,  glowKeys: ['i','I','Z','u','U','P'] },
  hero64_knight_v1:   { bobMs: 3000, ampPx: 1, shimmerMs: 1400, glowKeys: ['R','x'] },
  hero64_knight_v2:   { bobMs: 3200, ampPx: 1, shimmerMs: 1100, glowKeys: ['i','I','L','W'] },
  hero64_rogue_v1:    { bobMs: 1600, ampPx: 1, shimmerMs: 550,  glowKeys: ['H','j'] },
  hero64_rogue_v2:    { bobMs: 1500, ampPx: 1, shimmerMs: 500,  glowKeys: ['H','j','Z'] },
};

// palette remap table: when shimmer is "on", these keys swap to brighter neighbours
const SHIMMER_BRIGHT = {
  'i': 'Z', 'I': 'Z',          // cyan -> white-hot
  'H': 'j', 'j': 'Z',          // poison green -> brighter -> white-hot tip
  'u': 'U', 'U': 'Z', 'P': 'u',// purple chain
  'L': 'W', 'W': '9',          // gold -> bright gold -> cream-gold
  'R': 'x', 'x': 'X',          // red -> brighter red
  'Z': 'Z',
};

function drawSprite64(canvas, name, scale, opts){
  const lines = SPRITES64[name];
  if(!lines) return;
  opts = opts || {};
  const bobOffset = opts.bobOffset|0;          // 0..ampPx integer px shift up
  const shimmer = opts.shimmer || 0;           // 0..1 strength
  const profile = IDLE[name];
  const glowSet = profile ? new Set(profile.glowKeys) : null;

  const H = lines.length, W = lines[0].length;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const px = scale * dpr;
  if(canvas.width !== W*px || canvas.height !== H*px){
    canvas.width = W * px;
    canvas.height = H * px;
    canvas.style.width = (W * scale) + 'px';
    canvas.style.height = (H * scale) + 'px';
  }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for(let y = 0; y < H; y++){
    const row = lines[y];
    const drawY = y - bobOffset;             // shift sprite up
    if(drawY < 0 || drawY >= H) continue;
    for(let x = 0; x < W; x++){
      let key = row[x];
      // shimmer remap: swap glow keys to their brighter twin
      if(shimmer > 0.5 && glowSet && glowSet.has(key)){
        key = SHIMMER_BRIGHT[key] || key;
      }
      const c = PAL64[key];
      if(c){ ctx.fillStyle = c; ctx.fillRect(x * px, drawY * px, px, px); }
    }
  }
}

function paintAll64(){
  document.querySelectorAll('canvas[data-spr64]').forEach(cv => {
    const name = cv.getAttribute('data-spr64');
    const scale = parseInt(cv.getAttribute('data-scale') || '4', 10);
    drawSprite64(cv, name, scale);
  });
}

/* ---------- requestAnimationFrame loop driving all idle states ---------- */
let _animStart = 0;
function _animTick(t){
  if(!_animStart) _animStart = t;
  const ms = t - _animStart;
  document.querySelectorAll('canvas[data-spr64]').forEach(cv => {
    const name = cv.getAttribute('data-spr64');
    const scale = parseInt(cv.getAttribute('data-scale') || '4', 10);
    const profile = IDLE[name];
    if(!profile){ drawSprite64(cv, name, scale); return; }
    // bob: half-sine [0..ampPx]
    const bobPhase = (ms % profile.bobMs) / profile.bobMs;          // 0..1
    const bobOffset = Math.round(Math.abs(Math.sin(bobPhase * Math.PI * 2)) * profile.ampPx);
    // shimmer: 0..1 on triangle wave, hold above 0.5 about 30% of the cycle
    const shimPhase = (ms % profile.shimmerMs) / profile.shimmerMs; // 0..1
    const shimmer = (Math.sin(shimPhase * Math.PI * 2) + 1) / 2;    // 0..1
    drawSprite64(cv, name, scale, { bobOffset, shimmer });
  });
  requestAnimationFrame(_animTick);
}
function startIdleAnimation(){
  requestAnimationFrame(_animTick);
}

// SPRITES64 (above) is the only export the game needs — each hero is a 64-row
// string-grid (gridToS output) using the shared palette in src/palette.js, so it
// drops straight into render.js's SPRITE_LINES atlas. The browser-preview helpers
// (drawSprite64/paintAll64/startIdleAnimation/window.QLUD64) from the original
// standalone file are intentionally dropped; the in-game renderer animates these
// via its own idle bob.
