"use strict";
import { G } from './state.js';
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const ri = (lo,hi)=>Math.floor(Math.random()*(hi-lo+1))+lo;
export function log(text,cls){ G.logLines.push({text,cls}); while(G.logLines.length>200) G.logLines.shift(); }
