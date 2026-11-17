// A tiny step sequencer for the background music: bass, arpeggio and drums, all synthesised.
// Three songs: a bouncy title tune, the wave groove, and a faster minor-key boss theme.
import { audioContext, musicBus } from './audio.js';

const SONGS = {
  title: {
    bpm: 112,
    bass: [48, null, 48, null, 53, null, 55, null, 48, null, 48, null, 57, null, 55, null],
    lead: [72, 76, 79, 76, 77, 81, 79, 76, 72, 76, 79, 84, 81, 79, 77, 76],
    drums: 'k.h.s.h.k.k.s.h.',
  },
  play: {
    bpm: 132,
    bass: [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47],
    lead: [69, null, 72, 76, null, 72, 74, null, 72, null, 69, 67, null, 69, 71, null],
    drums: 'k.hsk.hsk.hsk.ss',
  },
  boss: {
    bpm: 152,
    bass: [40, 40, 52, 40, 41, 41, 53, 41, 38, 38, 50, 38, 39, 39, 51, 47],
    lead: [64, 67, 71, 67, 65, 68, 72, 68, 62, 65, 69, 65, 63, 66, 70, 71],
    drums: 'kkhskkhskkhskshs',
  },
};

let current = null;
let step = 0;
let nextTime = 0;
let timer = null;
let musicGain = null;

const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function note(ctx, type, midi, time, length, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq(midi);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  osc.connect(gain).connect(musicGain);
  osc.start(time);
  osc.stop(time + length + 0.02);
}

function drum(ctx, kind, time) {
  if (kind === 'k') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    osc.connect(gain).connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.17);
    return;
  }
  const length = kind === 's' ? 0.12 : 0.04;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = kind === 's' ? 'bandpass' : 'highpass';
  filter.frequency.value = kind === 's' ? 1800 : 7000;
  const gain = ctx.createGain();
  gain.gain.value = kind === 's' ? 0.35 : 0.12;
  src.connect(filter).connect(gain).connect(musicGain);
  src.start(time);
}

function schedule() {
  const ctx = audioContext();
  if (!ctx || !current) return;
  const song = SONGS[current];
  const sixteenth = 60 / song.bpm / 4;
  while (nextTime < ctx.currentTime + 0.15) {
    const i = step % 16;
    const b = song.bass[i];
    if (b !== null) note(ctx, 'triangle', b, nextTime, sixteenth * 1.8, 0.22);
    const l = song.lead[i];
    if (l !== null && (step >> 4) % 4 !== 3) note(ctx, 'square', l, nextTime, sixteenth * 0.9, 0.05);
    const d = song.drums[i];
    if (d !== '.') drum(ctx, d, nextTime);
    nextTime += sixteenth;
    step += 1;
  }
}

/** Switch to a song ('title', 'play', 'boss') or null for silence. */
export function playMusic(name) {
  const ctx = audioContext();
  if (!ctx || name === current) return;
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(musicBus());
  }
  current = name;
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  if (!timer) timer = setInterval(schedule, 40);
}
