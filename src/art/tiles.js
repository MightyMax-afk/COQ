import { S } from '../palette.js';

// ===== DUNGEON TILES (4 biomes, by Claude Design) =====
export const TILE_D_WALL = S(`
TTTTTTTTTTTTTTTT
TSSSSSSSSSSSSSST
TSSSStSSSStSSSST
TSSSSSSSSSSSSSST
TTTTTTTTTTTTTTTT
TStSSSStSSSStSSt
TSSSSSSSSSSSSSST
TSSSSSSSSSSSSSST
TTTTTTTTTTTTTTTT
TSSSSSSSSSSSSSST
TSSSStSSSStSSSST
TSSSSSSSSSSSSSST
TTTTTTTTTTTTTTTT
TStSSSStSSSStSSt
TSSSSSSSSSSSSSST
TTTTTTTTTTTTTTTT
`);

export const TILE_D_FLOOR = S(`
ndnnndnnnnnndnnn
nnndnnnnnnndnnnd
dnnnnndnnnnnnnnd
nndnnnnnnnndnnnn
nnnnndnnnnnnnnnd
ndnnnnnnnnnndnnn
nnnnnnndnnnnnnnd
nnndnnnnnnndnnnn
dnnnnnnnnnnnnndn
nnnnnnnnnndnnnnn
nndnnnnnnnnnndnn
nnnnnnnndnnnnnnn
nnnnndnnnnnnnnnd
nnnnnnnnnnnnndnn
dnnnnndnnnnnnnnn
nnndnnnnnnnnnnnd
`);

// stairs down — bright rim around recessed dark pit (top-down)
export const TILE_D_STAIRS_DOWN = S(`
nnnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
nnLLLLLLLLLLLLnn
nnLWWWWWWWWWWLnn
nnLWyyyyyyyyWLnn
nnLWyKKKKKKyWLnn
nnLWyKkkkkKyWLnn
nnLWyKkKKkKyWLnn
nnLWyKkKKkKyWLnn
nnLWyKkkkkKyWLnn
nnLWyKKKKKKyWLnn
nnLWyyyyyyyyWLnn
nnLWWWWWWWWWWLnn
nnLLLLLLLLLLLLnn
nnnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
`);

// stairs up — green-tinted rim around bright glowing center (light from above)
export const TILE_D_STAIRS_UP = S(`
nnnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
nnggggggggggggnn
nngGGGGGGGGGGgnn
nngGHHHHHHHHGgnn
nngGHjjjjjjHGgnn
nngGHjwwwwjHGgnn
nngGHjwZZwjHGgnn
nngGHjwZZwjHGgnn
nngGHjwwwwjHGgnn
nngGHjjjjjjHGgnn
nngGHHHHHHHHGgnn
nngGGGGGGGGGGgnn
nnggggggggggggnn
nnnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
`);

// ════════════════════════════════════════════════════════════
//  2.  THE BONE CRYPT
// ════════════════════════════════════════════════════════════
export const TILE_C_WALL = S(`
TT55T55TT55T55TT
T54444454444445T
T54zzz454zzz545T
T54zzz454zzz545T
T54zzz454zzz545T
T54444454444445T
TT55T55TT55T55TT
T44T54444454T44T
T4zT5zzz45z5T45T
T4zT5zzz45z5T45T
T4zT5zzz45z5T45T
T44T54444454T44T
TT55T55TT55T55TT
T54444454444445T
T54zzz454zzz545T
TTT5T55TT55T5TTT
`);

export const TILE_C_FLOOR = S(`
33S33S33333S333S
3333Z33333S33333
33S3333333333333
33333S33333S3333
333333S3Z3333333
3S3333333333333S
3333Z33333S33333
333333333333S333
333S3333333Z3333
3333S33333333333
33333Z3333S3333Z
3S3333333333333S
33333S33333S3333
S3333333Z3333333
33333333333S3333
3333S33333333333
`);

// feature — bone pile / skull on tile
export const TILE_C_BONES = S(`
33S33S33333S333S
3333Z33333S33333
33S3333333333333
333333333zzz3333
33333333zZz5z533
3333333zZzzz5333
3333333zKzzKz333
333333zz55zz4333
333333Z444444333
3333S33Z44Z33333
33333Z33Z44Z333Z
3S33ZzZ33Z4Z333S
333zZzz333Z333Z3
33zzzzzz333333Z3
3zZzzzzzZ3333Z33
3zzZzzzzz3333333
`);

// ════════════════════════════════════════════════════════════
//  3.  DAMP CAVERNS
// ════════════════════════════════════════════════════════════
export const TILE_K_WALL = S(`
nKKKnnKKnKnnnKKn
KnBBnKnBKnnKBnnK
KBBnBKBnBnBnBnnK
KBnBKBBKBnnBnBKK
KBnBKBKKBKBnBBnK
nBnBKBnnKBnnBBnK
nKnBnBBBKnnBnBnK
KBnnKBnBKnBKBBnK
KBnBKnnBKBnBnBnK
KBKnBnBKBnnnBnnK
KBnKBKnnBBnBnBKK
KBnBKBKBnnnBnnnK
KBnnBnnnBKBnBBKn
KnnBKnBKnBnnnnBK
KKBnnBKBKnBKBnBK
nKKKnnKKnKnnnKKn
`);

export const TILE_K_FLOOR = S(`
ddnnnnddnnnnnnnn
nnddnnnnnnddnnnn
ndnnndnnnnnnndnn
nnnnnnnnnnnnnnnn
nKnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
nnnnndnndnnnnnnn
nnnnnnnnnnnnnKnn
nndnnnnnnnnnnnnn
nnnnnnnnnnnnnndn
nnnKnnnnnnnnnnnn
nnnnnnnnndnnnnnn
nndnnnnnnnnnnnnn
nnnnnnnnnnnKnnnn
nnnnnnnnnnnnnnnn
nnnnnnnnnnnnnnnn
`);

// feature — glowing mushroom cluster
export const TILE_K_SHROOM = S(`
ddnnnnddnnnnnnnn
nnddnnnnnnddnnnn
ndnnndnnnKKKnnnn
nnnnnnnnKuUUuKnn
nKnnnnnKuUZZUuKn
nnnnnnnKuUUUUuKn
nnnnnKKKKuUUuKKK
nnnKKuPPnnKKKnKn
nnKKuPpKKuPKnnKn
nKuuPpKuUPPuKnnn
KuuPpKuUUUuPKnnn
KupPKKuPPPpKKnnn
KKKpKKKKKKKKnnnn
nnKpKnnnnKnKnnnn
nnKKKnnnnKnKnnnn
nnKnKnnnnKnKnnnn
`);

// feature — boulder / rock cluster (new!)
export const TILE_K_ROCKS = S(`
ddnnnnddnnnnnnnn
nnddnnnnnnddnnnn
ndnnndnnnnnnndnn
nnnnnnnKKKKnnnnn
nKnnnnKTTTtKnnnn
nnnnnKTtTTTtKnnn
nKKKKKTTTTTTKKnn
KTTTTTSTTTTTSTKn
KStttTSStttSSTKn
KSSStSSSSStSSTKn
KSSSSSSSSSSSSTKn
KKSSSSSSSSSSKKnn
nKKKKKSSSSKKKnnn
nnnnKKKKKKKnnnnn
nnnnnnKKKnnnnnnn
nnnnnnnnnnnnnnnn
`);

// ════════════════════════════════════════════════════════════
//  4.  INFERNAL DEPTHS
// ════════════════════════════════════════════════════════════
export const TILE_H_WALL = S(`
KKKKKKKKKKKKKKKK
K22kkkkk2222kkkK
K22k1Kk2222k1KkK
K22kKKk2222kKKkK
K22kkkk2222kkkkK
K22222222222222K
KKKKKKKKKKKKKKKK
K2222kkkk2222kkK
K2222k1Kk2222k1K
K2222kKKk2222kKK
K2222kkkk2222kkK
K22222222222222K
KKKKKKKKKKKKKKKK
K22kkkk2222kkkkK
K22k1Kk2222k1KkK
KKKKKKKKKKKKKKKK
`);

export const TILE_H_FLOOR = S(`
2222222222222222
2222O22222222222
22222o22222O2222
2222oo2222oo2222
2222Oo22222o2222
222222222222O222
2222222222222222
22222222222222O2
22O22222O2222oo2
2oo222222oo22O22
22o22222o2222222
2222222222222222
2222O2222O222222
22oo22222o222222
22222222222O2222
2222222222222222
`);

// feature — brazier with flame
export const TILE_H_BRAZIER = S(`
2222222222222222
2222O2222O222222
2222oo222o222222
2222222O22222222
2222221q22222222
222222qQLQq22222
22222qQLLLQq2222
2222qQL999LQq222
2222qQLZZZLQq222
22222qQ111Qq2222
222222qqQqq22222
222222YWWWY22222
22222YyyyyyY2222
22222YYyyyYY2222
22222YnYYnYY2222
2222KKn22nKK2222
`);

// ============================================================
//  ACT II TILES
// ============================================================

// Act II biome 5: The Sunken Reliquary (teal marble + flooded floor)
export const TILE_R_WALL = S(`
TT55T55TT55T55TT
T54LL445L44LL45T
T54LWWL45LWWL45T
T54L44L45L44L45T
T54LL44L45LL445T
T54444445444445T
TT55T55TT55T55TT
T54444445444445T
T54LL44L45LL445T
T54LWWL45LWWL45T
T54L44L45L44L45T
T54LL44L45LL445T
T54444445444445T
TT55T55TT55T55TT
T54444445444445T
TTT5T55TT55T5TTT
`);

export const TILE_R_FLOOR = S(`
ccCcCccccCcCcccc
ccccccCccccccccc
CccCcCccccCCccCC
ccCcccCccccccccc
cccCcCccccCccccc
ccccccccccccCccc
cccCcccccCcccccc
ccCccccccccccccc
CccCcccccccCcccC
cccCcccCcccccccc
ccccccccccCccCcc
cCccccccCcccCccc
ccccccccccccCccc
CccccCccccccccCc
cCcccCcCcccccccc
ccccccccccCccccc
`);

export const TILE_R_SHRINE = S(`
cccCccccccccCccc
cccccCcccccccccc
CccCccccccCccccc
ccccccKKKKcccccc
cccccKLZZLKccccc
ccccKLWLLWLKcccc
ccccKLLLLLLKcccc
ccccKLWLLWLKcccc
cccccKLLLLKccccc
cccccKLLLLKccccc
ccccKLLWWLLKcccc
cccKL55LL55LKccc
cccK4444444444Kc
ccK5555555555Kcc
cccccccccccccccc
cccCcccccCcccccc
`);

export const TILE_R_COINS = S(`
cccCccccccCccccc
ccccccCccccccccc
CcccccCcccccCccc
ccccccccccccccCc
ccccccccccccCccc
cCcccccCcccccccc
ccccccccccccccLL
ccccccccCKKKKKLW
cccCccccKLWLLLLW
ccccccKKLLWLLWLK
ccccccKLW9LLWLKc
cccccccKLLLLKKcc
cccccccccKKKKccc
cccccccccccccccc
cCcccccccccccccc
ccccccccCccccccc
`);

// Act II biome 6: The Ashen Wastes (burnt stone + soot floor)
export const TILE_A_WALL = S(`
KKKKKKKKKKKKKKKK
KsssSssSsSssSssK
KsSStsSStsSStSsK
KsSttSsSStsSSttK
KssSStttSStttSsK
KKKsssSssSssKKKK
KsSStSSstSSstSsK
KsstSSstSSstSSsK
KKsssSssSssSssKK
KsSStsSStsSStSsK
KsSttSsSStsSSttK
KssSStsSStsSStsK
KKKKKKKKKKKKKKKK
KsssSssSssSssSsK
KsSStsSStsSStSsK
KKKKKKKKKKKKKKKK
`);

export const TILE_A_FLOOR = S(`
kkkkksksskkkkkkk
kkkSkkkkkkkkkSkk
kkkkkkkkkkkSkkkk
kkSkkkkkkkkkkkkk
kkkkkkkkSkkkkkkk
kkkkSkkkkkkkkSkk
kSkkkkkkkkkkkkkk
kkkkkkSkkkkkkkkk
kkkSkkkkkkkSkkkk
kkkkkkkkkkkkkkkk
kkkkkkkSkkkkkSkk
kkSkkkkkkkkkkkkk
kkkkkkkkkkkkkkkk
kkkkkkkkkSkkkkkk
kkkSkkkkkkkkkkkk
kkkkkkkkkkkkkkkk
`);

export const TILE_A_EMBERS = S(`
kkkSkkkkkkkkkkkk
kkkkkkSkkkkkSkkk
kkkkkkkkkkkkkkkk
kkkkkkkKKKkkkkkk
kkkkkKKsSKKkkkkk
kkkkKsSsoSsKkkkk
kkkKssSoOoSskKkk
kkKkSso1Q1osSkKk
kkKsSoQ1QoSsskKk
kkKKssoOOoSsKKkk
kkkKKssooSsKKkkk
kkkkkKKsSsKKkkkk
kkkkkkkKKKkkkkkk
kkkkSkkkkkkkSkkk
kkkkkkkkSkkkkkkk
kkkkkkkkkkkkkkkk
`);

export const TILE_A_SKULL = S(`
kkkSkkkkkSkkkkkk
kkkkkkkkkkkkkkkk
kkkSkkkkkkkkkkkk
kkkkkkkkkSkkkkkk
kkkkkkKKKKKkkkkk
kkkkKKsSSsKKkkkk
kkkKsSKsKsSskKkk
kkKsSSKsKSSsskKk
kkKsSSsSsSSsskkK
kkKsSKSSSKSsKkkk
kkKKsSSSSSsKKkkk
kkkKKsSsSsKKkkkk
kkkkKKsSsKKkkkkk
kkkkkkKKKkkkkkkk
kkkkkkkkkkSkkkkk
kkkkkkkkkkkkkkkk
`);

// Act II biome 7: The Verdant Rot (vine walls + mossy earth)
export const TILE_V_WALL = S(`
KGgGgGgKGgGgGgGK
GgKGgKGgKGgKGgKG
GgGgnGgnGgGgnGgG
KgGGnnnGgGGnnGgK
GgGGgGgGGgGGgGgG
GgKGgKGgKGgKGgKG
KGGgGgGGGgGgGGgK
KgGgGgnGgGgGgnGK
GgKGgKGgKGgKGgKG
GgGgnGgnGgGgnGgG
KgGGnnnGgGGnnGgK
GgGGgGgGGgGGgGgG
GgKGgKGgKGgKGgKG
KGGgGgGGGgGgGGgK
KgGgGgnGgGgGgnGK
KGgGgGgKGgGgGgGK
`);

export const TILE_V_FLOOR = S(`
nGnnnGnnnGnnnnng
nnHGnnnnnHnnnnnn
nnnnnHnnnnHnGnnn
nGnnnnnnnnnnnnnH
HnnnnnnHnnnnGnnn
nnnnGnnnnnnnnHnn
nGnnnnnnnHnnnnnn
nnnHnnGnnnnnnnnn
nnnnnnnnHnnnGnnn
nnHnnnnnnnnnnHnn
nnnGnnnnnnHnnnnn
nGnnnnnnnnnHnnnG
nnnnnnHnnnnnnnnn
nnnnnnnnnGnnHnnn
nGnnHnnnnnnnnnnn
nnnnnnnnnnnnnnGn
`);

export const TILE_V_CORPSE = S(`
nnnGnnnnnGnnnnng
nnnnGnnnnnnnnHnn
nnnnnnnGnnnHnnnn
nnnnHGnzzznnnnnn
nnnnGzZzZzGGnnnn
nnnGzzzzzGgGnnnn
nnnGgzzzzzGnnHnn
nnnnzKzKzzGnnnnn
nnnnzzKKzzznnnnn
nnnnGzKKzzGnnnnn
nnnGgGzzzGgGnnnn
nnnnGGGgggGnnnnn
nnnGgKKKKKgGnnnn
nnnnGKzzzKGnnnnn
nGnnnKzzzKnnnGnn
nnnHnKKKKKnnnnnn
`);

export const TILE_V_FUNGUS = S(`
nGnnnnnnnnnGnnng
nnnHnnnnHnnnnnnn
nnnnnnGnnnnnHnnn
nnnnnGgGnHnGnnnn
nnnnKGHjHGKnnHnn
nnnKjjHjjHjjKnnn
nnKHjjjHHjjjHKnn
nnKHHHHjjjHHHKnn
nnnKKjjjjjjjKnnn
nnnnnKjGjGKnGnnn
nnHnnnnGjGnnnHnn
nGnnnKGjjGKnnGnn
nnnnKjjjjjjKnnnn
nnnnKHHGGjHKnnnn
nnnGnKKjjKKnHnnn
nnnnnnnGGnnnnnnn
`);

// Act II biome 8: The Citadel of Stars (obsidian + onyx). 'cit_' prefix to avoid the crypt's 'c_wall'.
export const TILE_CIT_WALL = S(`
KKKKKKKKKKKKKKKK
KppPPpPpPpPPpPpK
KpPuuPpPpPuuPpPK
KpPuPPpPpPPuPpPK
KpPPpPpPpPpPPpPK
KKKpPpPpPpPpPKKK
KpPPpPpPpPpPPpPK
KpPuPPpPpPPuPpPK
KpPuuPpPpPuuPpPK
KppPPpPpPpPPpPpK
KppPPpPpPpPPpPpK
KpPuuPpPpPuuPpPK
KpPuPPpPpPPuPpPK
KKKpPpPpPpPpPKKK
KpPPpPpPpPpPPpPK
KKKKKKKKKKKKKKKK
`);

export const TILE_CIT_FLOOR = S(`
ppPpppppPppppppp
ppppppPppppPpppp
pPpppppPppppPppp
ppppPppppppppppp
ppppppppPpppPppp
pPppppppppppPppp
ppppPppppPpppppp
ppppppppppppppPp
pPppppPppPpppppp
pppppppppppPpppp
ppPppppppppppppp
pppppppPppppPppP
pPppppppppppPppp
ppppPppppppppppp
ppPpppppppPppppp
pppppppppppppppp
`);

export const TILE_CIT_CRYSTAL = S(`
pppPppppppPppppp
ppppppPppppppppp
ppppppKKpKKppppp
pppppKuPpPuKpppp
ppppKuPpPpPuKppp
pPppKuPpPpPuKppp
pppKuPpPpPpPuKpp
pppKuPpUUpPpuKpp
pppKuPpUZUpPuKpp
pppKuPpUUpPpuKpp
pppKuPpPpPpPuKpp
pPppKuPpPpPuKppp
ppppKuPpPpPuKppp
pppppKuPpPuKpppp
ppppppKuuuKppppp
pppppppKKKppppPp
`);

export const TILE_CIT_STARFIELD = S(`
pppPppppppPpppZp
ppppZppppppppppp
ppPpppppPppppppp
pppppppppppZpppp
ppppppppppppppPp
pPppZppppppppppp
ppppppppppZppppp
ppppppppppppppZp
pZppppPpppppppPp
ppppppppppppZppp
ppPpppppppppppPp
pppZppppZppppppp
ppppppppppppPppp
pppppZpppppppZpp
ppppppppppZppppp
ppZpppppppppppPp
`);
