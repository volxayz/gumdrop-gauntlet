// First-run coaching: big hint bubbles that walk a new player through the controls.

const STEPS = [
  { key: 'move', text: 'MOVE with  W A S D', sub: '(or the arrow keys)', done: (s) => s.stats.moved > 0.8 },
  { key: 'shoot', text: 'AIM with the MOUSE', sub: 'HOLD LEFT CLICK to shoot gumdrops', done: (s) => s.stats.shots > 10 },
  { key: 'dash', text: 'SPACE to DASH', sub: 'You are untouchable while dashing!', done: (s) => s.stats.dashes > 0 },
];

const DEJAVU_FILL = { key: 'dejavuFill', text: 'POP CRITTERS = DÉJÀ VU', sub: 'A full gauge leaves an echo of you behind (up to 5)' };
const DEJAVU_USE = { key: 'dejavuUse', text: 'PRESS  E  FOR DÉJÀ VU!', sub: 'Your echoes come alive and spray a barrage' };

/** The hint to show now, or null once the player has done them all (or the moment has passed). */
export function currentHint(state) {
  if (state.mode !== 'play') return null;
  // Teach the key the moment the first echo exists, until it has been used once.
  if (state.stats.dejavus === 0 && state.dejavu.echoes.length > 0) return DEJAVU_USE;
  if (state.wave === 1) {
    for (const step of STEPS) if (!step.done(state)) return step;
    if (state.stats.dejavus === 0) return DEJAVU_FILL;
    return null;
  }
  if (state.wave === 2 && state.waveClock < 4) {
    return { key: 'upg', text: 'YOUR UPGRADE IS ACTIVE!', sub: 'Every card changes how you fight' };
  }
  if (state.boss && state.boss.entering > -2.5 && state.boss.phase === 0 && state.waveClock < 6) {
    return { key: 'boss', text: 'DASH THROUGH THE RINGS!', sub: 'Break her crown in 3 phases' };
  }
  return null;
}
