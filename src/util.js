"use strict";
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const ri = (lo,hi)=>Math.floor(Math.random()*(hi-lo+1))+lo;
