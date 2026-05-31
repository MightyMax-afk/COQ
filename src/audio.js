"use strict";
import { biomeFor } from './game.js';
import { G } from './state.js';

export const MUSIC = (function(){
  let actx=null, masterGain=null;
  let currentTrack=null, currentNodes=[];
  let currentScheduler=null;
  let isOn=true;            // user toggle; default ON
  let volume=0.45;          // 0..1, master
  let pendingTrackId=null;  // queued track to play once audio is unlocked
  let unlocked=false;

  function ensureCtx(){
    if(actx) return actx;
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      actx = new Ctx();
      masterGain = actx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(actx.destination);
    }catch(e){ return null; }
    return actx;
  }

  // Note name -> frequency. n is like "C4","D#5","A3","Eb4".
  // Pre-built table for fast lookup; covers C0..B8.
  const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;
  const SEMI = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function freq(note){
    if(typeof note === 'number') return note;
    const m = NOTE_RE.exec(note);
    if(!m) return 440;
    let s = SEMI[m[1]];
    if(m[2]==='#') s+=1; else if(m[2]==='b') s-=1;
    const oct = parseInt(m[3],10);
    const midi = 12*(oct+1)+s;          // standard MIDI
    return 440 * Math.pow(2,(midi-69)/12);
  }

  // Tiny instrument primitives. Each schedules sound starting at time t (seconds, in actx time)
  // and returns nothing — they self-clean via 'onended' on the source.

  // Plucky lead / chime: short attack, exponential decay, choosable osc type
  function pluck(t, note, dur, type='triangle', vol=0.18, dest){
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq(note);
    // ADSR-ish: 5ms attack, exp decay over dur
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(dest||masterGain);
    o.start(t); o.stop(t+dur+0.05);
  }

  // Pad: slow attack and release, long sustain — for ambient atmospheres
  function pad(t, note, dur, type='sawtooth', vol=0.10, dest){
    const o = actx.createOscillator();
    const o2 = actx.createOscillator();
    const g = actx.createGain();
    o.type = type; o2.type = type;
    o.frequency.value = freq(note);
    o2.frequency.value = freq(note)*1.005;   // gentle detune for thickness
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+Math.min(0.4, dur*0.3));
    g.gain.setValueAtTime(vol, t+dur*0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); o2.connect(g); g.connect(dest||masterGain);
    o.start(t); o2.start(t);
    o.stop(t+dur+0.1); o2.stop(t+dur+0.1);
  }

  // Bass: square wave, soft attack, decaying
  function bass(t, note, dur, vol=0.16, dest){
    const o = actx.createOscillator();
    const g = actx.createGain();
    const lp = actx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=600;
    o.type='square';
    o.frequency.value = freq(note);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(lp); lp.connect(g); g.connect(dest||masterGain);
    o.start(t); o.stop(t+dur+0.05);
  }

  // Noise hit (drum-ish). Short white noise burst.
  function noise(t, dur, freqHz, vol, dest){
    const buf = actx.createBuffer(1, Math.max(1, Math.floor(actx.sampleRate*dur)), actx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    const bp = actx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value=freqHz||1200; bp.Q.value=0.7;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    src.connect(bp); bp.connect(g); g.connect(dest||masterGain);
    src.start(t); src.stop(t+dur+0.02);
  }

  // ── Track scheduler ──────────────────────────────────────────
  // A track is a function (ctxTime, trackGain, beat0, beatsPerSec) => void
  // It schedules ONE loop's worth of notes. We re-invoke it every loop with a
  // fresh start time for sample-accurate looping.

  function startTrack(id){
    if(!ensureCtx()){ pendingTrackId=id; return; }
    if(currentTrack===id) return;
    stopTrack();   // crossfades out the previous one
    currentTrack=id;
    const def = TRACKS[id];
    if(!def){ return; }

    // Per-track sub-gain (allows independent fades during crossfade).
    const tg = actx.createGain();
    tg.gain.setValueAtTime(0.0001, actx.currentTime);
    tg.gain.exponentialRampToValueAtTime(1.0, actx.currentTime+0.8);
    tg.connect(masterGain);
    currentNodes.push(tg);

    const bpm = def.bpm || 100;
    const beatsPerSec = bpm/60;
    const loopBeats = def.loopBeats || 48;
    const loopDur = loopBeats / beatsPerSec;

    let loopStart = actx.currentTime + 0.05;
    const scheduleOne = () => {
      try { def.compose(loopStart, tg, beatsPerSec); } catch(e){ console.warn('track err',e); }
    };
    scheduleOne();
    // schedule the next loop just before this one ends
    const scheduler = setInterval(()=>{
      if(currentTrack!==id){ clearInterval(scheduler); return; }
      // when we're within 200 ms of the end, schedule the next loop
      const ahead = loopStart + loopDur - actx.currentTime;
      if(ahead < 0.5){
        loopStart += loopDur;
        scheduleOne();
      }
    }, 100);
    currentScheduler = scheduler;
  }

  function stopTrack(){
    if(currentScheduler){ clearInterval(currentScheduler); currentScheduler=null; }
    // fade out all per-track gains then disconnect after the fade
    const t = actx ? actx.currentTime : 0;
    for(const n of currentNodes){
      try{
        n.gain.cancelScheduledValues(t);
        const v = Math.max(0.0001, n.gain.value);
        n.gain.setValueAtTime(v, t);
        n.gain.exponentialRampToValueAtTime(0.0001, t+0.8);
        setTimeout(()=>{ try{ n.disconnect(); }catch(e){} }, 1100);
      }catch(e){}
    }
    currentNodes = [];
    currentTrack = null;
  }

  // ── Public API ────────────────────────────────────────────────
  function unlock(){
    // Browsers require a user gesture before audio plays. Call this from a click/keydown.
    if(unlocked) return;
    ensureCtx();
    if(!actx) return;
    if(actx.state==='suspended'){ actx.resume().catch(()=>{}); }
    unlocked = true;
    if(isOn && pendingTrackId){ startTrack(pendingTrackId); pendingTrackId=null; }
  }
  function setOn(on){
    isOn = !!on;
    if(!isOn){ stopTrack(); }
    else { if(pendingTrackId){ startTrack(pendingTrackId); pendingTrackId=null; } }
  }
  function setVolume(v){
    volume = Math.max(0, Math.min(1, v));
    if(masterGain) masterGain.gain.setTargetAtTime(volume, actx.currentTime, 0.05);
  }
  function play(id){
    // request a track. If audio isn't unlocked yet, remember the request.
    if(!isOn){ pendingTrackId=null; return; }
    if(!unlocked){ pendingTrackId=id; return; }
    startTrack(id);
  }
  function stop(){ stopTrack(); }
  function isMusicOn(){ return isOn; }
  function getVolume(){ return volume; }
  function current(){ return currentTrack; }

  // ── TRACKS — 10 hand-composed 30s loops ──────────────────────
  // Helper for the composers: schedule a note at beat b (1 beat = 1 quarter)
  // using one of pluck/pad/bass/noise.
  const TRACKS = {};

  // Title — slow, somber dungeon march. Minor key. Piano-ish pluck + low bass.
  TRACKS.title = {
    bpm: 78, loopBeats: 40,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Two-bar bass cycle: A2  E2  F2  C3  ×N
      const bassPat = ['A2','A2','E2','E2','F2','F2','C3','C3'];
      for(let i=0;i<5;i++){
        for(let j=0;j<bassPat.length;j++){
          bass(start+(i*8+j)*Q, bassPat[j], Q*1.2, 0.14, dest);
        }
      }
      // Sustained pad on chord roots
      const padPat = ['A3','E4','F3','C4'];
      for(let i=0;i<10;i++){
        pad(start+i*4*Q, padPat[i%4], 4*Q, 'triangle', 0.07, dest);
      }
      // Sparse melody — drifts in for the second half of the loop
      const mel = [
        [16,'A4',2],[18,'C5',2],[20,'B4',1],[21,'A4',3],
        [24,'G4',2],[26,'A4',6],
        [32,'E5',1],[33,'D5',1],[34,'C5',2],[36,'A4',4],
      ];
      for(const [b,n,d] of mel){
        pluck(start+b*Q, n, d*Q, 'triangle', 0.16, dest);
      }
    }
  };

  // Halls (1–5) — cautious, exploratory, mid-tempo minor
  TRACKS.halls = {
    bpm: 96, loopBeats: 48,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Walking bass: A E F G  A E F G ...
      const bassPat = ['A2','E3','F2','G2'];
      for(let i=0;i<12;i++){
        bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.13, dest);
        // light pulse on the 3
        bass(start+(i*4+2)*Q, bassPat[i%4], Q*1, 0.08, dest);
      }
      // Pad chords (one per bar)
      const pads = ['A3','E4','F3','G3'];
      for(let i=0;i<12;i++) pad(start+i*4*Q, pads[i%4], 4*Q, 'sawtooth', 0.05, dest);
      // Melody — call-and-response across the loop
      const mel = [
        [0,'A4',1],[1,'C5',1],[2,'E5',2],[5,'D5',1],[6,'C5',1],[7,'A4',1],
        [8,'B4',1],[9,'C5',1],[10,'E5',2],[12,'A5',2],[14,'G5',2],
        [16,'E5',1],[17,'D5',1],[18,'C5',2],[20,'B4',2],[22,'A4',2],
        // second half — variation
        [24,'A4',1],[25,'C5',1],[26,'E5',2],[28,'F5',1],[29,'E5',1],[30,'D5',2],
        [32,'C5',2],[34,'B4',1],[35,'A4',1],[36,'E4',4],
        [40,'A4',1],[41,'B4',1],[42,'C5',2],[44,'A4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.95, 'triangle', 0.14, dest);
      // soft kick on the 1 of each bar
      for(let i=0;i<12;i++) noise(start+i*4*Q, 0.08, 120, 0.12, dest);
    }
  };

  // Crypt (6–10) — funereal, low pulsing, choir-like pads
  TRACKS.crypt = {
    bpm: 64, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Heavy slow bass drone alternating D/A
      const bassPat = ['D2','D2','A2','A2'];
      for(let i=0;i<8;i++){
        bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.18, dest);
      }
      // Choir-like pads (sine for purity)
      const padPat = [['D3','F3','A3'],['D3','F3','A3'],['C3','E3','G3'],['C3','E3','G3']];
      for(let i=0;i<8;i++){
        for(const n of padPat[i%4]) pad(start+i*4*Q, n, 4*Q, 'sine', 0.06, dest);
      }
      // Funeral bell every 8 beats (high pluck + low octave)
      for(let i=0;i<4;i++){
        pluck(start+i*8*Q, 'F5', 3*Q, 'sine', 0.12, dest);
        pluck(start+i*8*Q, 'F3', 3*Q, 'sine', 0.10, dest);
      }
      // Sparse low melody in the 2nd half
      const mel = [[16,'D4',2],[18,'F4',2],[20,'E4',4],[24,'D4',2],[26,'C4',2],[28,'D4',4]];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q, 'triangle', 0.13, dest);
    }
  };

  // Caverns (11–15) — eerie ambient, scattered drops, dissonant pad
  TRACKS.cavern = {
    bpm: 80, loopBeats: 40,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Drone bass on E
      for(let i=0;i<5;i++) bass(start+i*8*Q, 'E2', 8*Q, 0.12, dest);
      // Wandering pad — minor 2nds for unease
      const padPat = ['E3','F3','A3','B3','G3'];
      for(let i=0;i<10;i++) pad(start+i*4*Q, padPat[i%padPat.length], 4*Q, 'sine', 0.06, dest);
      // Random water-drip plucks (deterministic; same every loop)
      const drips = [[1,'B5'],[3,'A5'],[6,'C6'],[9,'G5'],[12,'B5'],[15,'D6'],
                     [19,'A5'],[22,'F5'],[25,'B5'],[28,'C6'],[31,'G5'],[34,'A5'],[37,'B5']];
      for(const [b,n] of drips) pluck(start+b*Q, n, 0.4, 'sine', 0.10, dest);
      // Occasional low rumble
      for(let i=0;i<5;i++) noise(start+i*8*Q+Q*2, 0.3, 80, 0.10, dest);
    }
  };

  // Infernal (16–20) — driving, dark, building toward Varmathrax
  TRACKS.infernal = {
    bpm: 116, loopBeats: 64,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Driving 8th-note bass
      const bp = ['D2','D2','D2','F2','C2','C2','C2','D2'];
      for(let i=0;i<8;i++){
        for(let j=0;j<8;j++) bass(start+(i*8+j)*Q, bp[j], Q*0.9, 0.13, dest);
      }
      // Power-chord stabs every 2 beats
      const stabs = ['D3','D3','F3','C3'];
      for(let i=0;i<32;i++) pad(start+i*2*Q, stabs[i%4], Q*1.5, 'sawtooth', 0.08, dest);
      // Lead — minor-key descent
      const mel = [
        [0,'A4',2],[2,'F4',2],[4,'D4',2],[6,'C4',2],
        [8,'A4',2],[10,'F4',2],[12,'E4',4],
        [16,'D5',1],[17,'C5',1],[18,'A4',2],[20,'F4',2],[22,'D4',2],
        [24,'A4',2],[26,'F4',2],[28,'D4',4],
        // 2nd half — climb
        [32,'D4',1],[33,'E4',1],[34,'F4',2],[36,'A4',2],[38,'D5',2],
        [40,'F5',2],[42,'E5',2],[44,'D5',4],
        [48,'A4',2],[50,'C5',2],[52,'D5',2],[54,'F5',2],
        [56,'A5',4],[60,'D5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.95, 'sawtooth', 0.13, dest);
      // Kick on every beat 1 and 3
      for(let i=0;i<32;i++) noise(start+i*2*Q, 0.06, 100, 0.14, dest);
    }
  };

  // Reliquary (21–25) — submerged temple, slow swells, watery
  TRACKS.reliquary = {
    bpm: 72, loopBeats: 36,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Deep slow bass swells
      const bassPat = ['C2','G2','A2','F2'];
      for(let i=0;i<9;i++) bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.13, dest);
      // Sustained pad chords (triadic)
      const pads = [['C3','E3','G3'],['G3','B3','D4'],['A3','C4','E4'],['F3','A3','C4']];
      for(let i=0;i<9;i++){
        for(const n of pads[i%4]) pad(start+i*4*Q, n, 4*Q, 'sine', 0.07, dest);
      }
      // High chimes with echoes
      const mel = [
        [0,'C5',3],[4,'E5',3],[8,'G5',3],[12,'A5',3],
        [16,'G5',2],[18,'E5',2],[20,'C5',4],
        [24,'F5',3],[28,'E5',2],[30,'D5',2],[32,'C5',4],
      ];
      for(const [b,n,d] of mel){
        pluck(start+b*Q, n, d*Q, 'sine', 0.13, dest);
        // poor-man's reverb: echo at half-volume one beat later
        pluck(start+(b+1)*Q, n, d*Q*0.8, 'sine', 0.06, dest);
      }
    }
  };

  // Ashen (26–30) — sparse, scorched, melancholy. The old version used noise
  // crackles + low rumble that piled into a hissy, grating texture; this version
  // is a clean tonal piece with a slow lament line and a faint heat-shimmer pad.
  TRACKS.ashen = {
    bpm: 78, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Slow heavy bass: D2 holding, occasional pull to C2 for darkness
      const bassPat = ['D2','D2','C2','D2'];
      for(let i=0;i<8;i++) bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.13, dest);
      // Warm sustained pad — perfect 5ths
      const padRoot = ['D3','D3','C3','D3'];
      const padFifth= ['A3','A3','G3','A3'];
      for(let i=0;i<8;i++){
        pad(start+i*4*Q, padRoot[i%4],  4*Q, 'triangle', 0.06, dest);
        pad(start+i*4*Q, padFifth[i%4], 4*Q, 'triangle', 0.05, dest);
      }
      // Lament lead — slow, sparse, in D minor
      const mel = [
        [0,'D4',4],[4,'F4',3],[7,'E4',1],
        [8,'D4',2],[10,'C4',2],[12,'D4',4],
        [16,'F4',2],[18,'A4',2],[20,'G4',4],
        [24,'F4',2],[26,'E4',2],[28,'D4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.13, dest);
      // Distant low bell every 8 beats — soft, tonal, NOT a noise burst
      for(let i=0;i<4;i++) pluck(start+i*8*Q, 'D3', 3*Q, 'sine', 0.08, dest);
    }
  };

  // Verdant (31–35) — organic, slightly off-kilter, decaying
  TRACKS.verdant = {
    bpm: 92, loopBeats: 48,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Bass in 5/4 against 4/4 melody — gentle polyrhythm for "off-kilter"
      const bassPat = ['G2','G2','D3','C3','F2'];
      for(let i=0;i<12;i++) bass(start+i*4*Q, bassPat[i%5], Q*3.5, 0.13, dest);
      // Woodwind-ish pad
      for(let i=0;i<12;i++){
        const n = ['G3','C4','D4','F4'][i%4];
        pad(start+i*4*Q, n, 4*Q, 'triangle', 0.06, dest);
      }
      // Melody with grace notes
      const mel = [
        [0,'G4',1],[1,'A4',1],[2,'C5',2],[4,'D5',1],[5,'C5',1],[6,'A4',2],
        [8,'G4',2],[10,'F4',2],[12,'G4',4],
        [16,'C5',1],[17,'D5',1],[18,'E5',2],[20,'D5',2],[22,'C5',2],
        [24,'A4',2],[26,'G4',6],
        [32,'D5',1],[33,'C5',1],[34,'A4',2],[36,'G4',1],[37,'F4',1],[38,'D4',2],
        [40,'G4',2],[42,'A4',2],[44,'G4',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.12, dest);
      // Soft hat / leaf rustle
      for(let i=0;i<24;i++) noise(start+i*2*Q, 0.04, 6000, 0.04, dest);
    }
  };

  // Citadel (36–40) — cold celestial, arpeggios over deep bass
  TRACKS.citadel = {
    bpm: 104, loopBeats: 64,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Deep void bass — slow
      const bassPat = ['A1','A1','F1','G1'];
      for(let i=0;i<16;i++) bass(start+i*4*Q, bassPat[i%4], 4*Q, 0.16, dest);
      // High arpeggios — sixteenth notes
      const arpPat = ['A4','C5','E5','A5','G5','E5','C5','A4'];
      for(let i=0;i<64;i++){
        pluck(start+i*Q, arpPat[i%8], Q*0.9, 'sine', 0.09, dest);
      }
      // Wide pad chords
      const padChords = [['A3','C4','E4'],['A3','C4','E4'],['F3','A3','C4'],['G3','B3','D4']];
      for(let i=0;i<16;i++){
        for(const n of padChords[i%4]) pad(start+i*4*Q, n, 4*Q, 'sawtooth', 0.05, dest);
      }
      // High eerie lead — distant
      const mel = [
        [8,'E6',4],[12,'D6',4],
        [24,'C6',2],[26,'D6',2],[28,'E6',4],
        [40,'A5',2],[42,'C6',2],[44,'E6',4],
        [56,'D6',2],[58,'C6',2],[60,'A5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'sine', 0.10, dest);
    }
  };

  // Victory — major key triumph, plays after Zarakhel + on NG+ screen
  TRACKS.victory = {
    bpm: 110, loopBeats: 32,
    compose(start, dest, bps){
      const Q = 1/bps;
      // Heroic bass in C major
      const bassPat = ['C2','G2','A2','F2'];
      for(let i=0;i<8;i++) bass(start+i*4*Q, bassPat[i%4], Q*3.5, 0.15, dest);
      // Bright sustained chords
      const chords = [['C3','E3','G3'],['G2','B2','D3'],['A2','C3','E3'],['F2','A2','C3']];
      for(let i=0;i<8;i++){
        for(const n of chords[i%4]) pad(start+i*4*Q, n, 4*Q, 'sawtooth', 0.06, dest);
      }
      // Triumphant fanfare lead
      const mel = [
        [0,'G4',1],[1,'C5',1],[2,'E5',2],[4,'G5',2],[6,'E5',2],
        [8,'D5',1],[9,'B4',1],[10,'D5',2],[12,'G5',4],
        [16,'C5',1],[17,'E5',1],[18,'G5',2],[20,'C6',2],[22,'B5',2],
        [24,'A5',1],[25,'G5',1],[26,'E5',2],[28,'C5',4],
      ];
      for(const [b,n,d] of mel) pluck(start+b*Q, n, d*Q*0.9, 'triangle', 0.16, dest);
      // Snare-ish hits on 2 and 4
      for(let i=0;i<16;i++) noise(start+(i*2+1)*Q, 0.05, 1800, 0.10, dest);
      // Kick on 1 and 3
      for(let i=0;i<16;i++) noise(start+i*2*Q, 0.06, 100, 0.13, dest);
    }
  };

  return { play, stop, unlock, setOn, setVolume, isMusicOn, getVolume, current,
           // debug tap (audio-rendering verification only; harmless in production)
           _ctx:()=>actx, _master:()=>masterGain };
})();

// Pick the right track for a given depth (called on biome change).
export function musicTrackForDepth(d){
  const b = biomeFor(d);
  if(!b) return 'halls';
  return ({halls:'halls',crypt:'crypt',cavern:'cavern',infernal:'infernal',
           reliquary:'reliquary',ashen:'ashen',verdant:'verdant',citadel:'citadel'})[b.id] || 'halls';
}

// Audio unlock — must fire on any user gesture before Web Audio can play.
// _musicUnlock references MUSIC (above) and G from state.js for the title-track guard.
function _musicUnlock(){
  MUSIC.unlock();
  // If user hasn't started a game yet, make sure the title track is queued.
  if(!G.started && MUSIC.isMusicOn() && !MUSIC.current()) MUSIC.play('title');
}
window.addEventListener('click',     _musicUnlock, {once:false, passive:true});
window.addEventListener('keydown',   _musicUnlock, {once:false, passive:true});
window.addEventListener('touchstart',_musicUnlock, {once:false, passive:true});
