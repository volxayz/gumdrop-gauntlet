// Synthesised sound effects (Web Audio, no files). The context starts on the first click or key.

let ctx = null;
let master = null;
let sfxBus = null;
let muted = false;
const lastPlayed = new Map();

export function audioContext() {
  return ctx;
}

export function musicBus() {
  return master;
}

/** Create or resume the audio context; call from a user gesture. */
export function unlockAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.8;
  return muted;
}

export function isMuted() {
  return muted;
}

/** One enveloped oscillator note sliding from f0 to f1. */
function tone(type, f0, f1, duration, volume, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(sfxBus);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

let noiseBuffer = null;
function noise(duration, volume, filterFreq, delay = 0) {
  if (!ctx) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t);
  filter.frequency.exponentialRampToValueAtTime(80, t + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(gain).connect(sfxBus);
  src.start(t);
  src.stop(t + duration + 0.02);
}

/** Each game event's sound. */
const SOUNDS = {
  shoot: () => tone('square', 880, 440, 0.07, 0.05),
  hit: () => tone('triangle', 520, 300, 0.05, 0.08),
  pop: (e) => { tone('sine', e.big ? 300 : 700, e.big ? 90 : 1400, 0.16, 0.25); noise(0.12, e.big ? 0.4 : 0.15, 3000); },
  dash: () => { noise(0.18, 0.25, 5000); tone('sine', 300, 900, 0.15, 0.12); },
  hurt: () => { tone('sawtooth', 300, 60, 0.35, 0.3); noise(0.25, 0.4, 1500); },
  dead: () => { tone('sawtooth', 440, 40, 1.1, 0.3); noise(0.8, 0.4, 900); },
  block: () => { tone('triangle', 1200, 1800, 0.12, 0.2); tone('triangle', 1800, 2400, 0.12, 0.15, 0.06); },
  shield: () => tone('sine', 900, 1500, 0.2, 0.1),
  enemyShoot: () => tone('sine', 400, 250, 0.1, 0.06),
  bossShoot: () => tone('square', 200, 120, 0.25, 0.1),
  windup: () => tone('sawtooth', 120, 500, 0.6, 0.12),
  slam: () => { noise(0.5, 0.6, 1200); tone('sine', 120, 40, 0.5, 0.4); },
  summon: () => { tone('triangle', 300, 600, 0.2, 0.12); tone('triangle', 450, 900, 0.2, 0.12, 0.1); },
  boom: () => { noise(0.3, 0.35, 2200); tone('sine', 180, 50, 0.25, 0.2); },
  combo: () => { tone('square', 990, 990, 0.06, 0.08); tone('square', 1320, 1320, 0.09, 0.08, 0.06); },
  wave: () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.14, 0.15, i * 0.08)),
  cleared: () => [784, 988, 1175, 1568].forEach((f, i) => tone('square', f, f, 0.12, 0.08, i * 0.07)),
  pick: () => { tone('sine', 660, 1320, 0.2, 0.2); noise(0.15, 0.15, 6000); },
  bossIntro: () => { tone('sawtooth', 80, 60, 1.4, 0.25); [196, 185, 175].forEach((f, i) => tone('square', f, f, 0.35, 0.1, i * 0.35)); },
  phase: () => { noise(0.8, 0.5, 2500); tone('sawtooth', 100, 600, 0.8, 0.25); },
  bossDown: () => { noise(1.4, 0.6, 3000); tone('sine', 400, 30, 1.4, 0.4); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, 0.18, 0.1, 0.3 + i * 0.12)),
  results: () => {},
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.98, 0.3, 0.15, i * 0.22)),
  click: () => tone('sine', 900, 1200, 0.06, 0.12),
  start: () => [392, 523, 659, 784].forEach((f, i) => tone('square', f, f, 0.1, 0.1, i * 0.06)),
};

/** Play the sounds for a list of game events, throttling noisy repeats. */
export function playEvents(events) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  for (const event of events) {
    const play = SOUNDS[event.type];
    if (!play) continue;
    const gap = event.type === 'hit' ? 0.04 : event.type === 'shoot' ? 0.05 : 0.03;
    if (now - (lastPlayed.get(event.type) ?? -1) < gap) continue;
    lastPlayed.set(event.type, now);
    play(event);
  }
}

export function playSound(type) {
  playEvents([{ type }]);
}
