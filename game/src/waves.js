// The wave plan: which critters each of the seven waves sends, then the boss on wave 8.
import { LAST_WAVE } from './config.js';
import { edgePoint, spawnEnemy } from './enemies.js';
import { createBoss } from './boss.js';
import { showBanner } from './effects.js';

/** [kind, count] per wave. Order matters a little: the queue is shuffled in chunks. */
const PLAN = [
  [['jellybob', 10]],
  [['jellybob', 12], ['sprinkler', 4]],
  [['jellybob', 10], ['sprinkler', 4], ['gobstopper', 2]],
  [['zipper', 6], ['jellybob', 12], ['sprinkler', 4]],
  [['gobstopper', 3], ['zipper', 6], ['sprinkler', 6], ['jellybob', 12]],
  [['zipper', 8], ['sprinkler', 8], ['jellybob', 16], ['gobstopper', 4]],
  [['gobstopper', 6], ['zipper', 10], ['sprinkler', 10], ['jellybob', 20]],
];

export const WAVE_TITLES = [
  'JELLY JAMBOREE', 'SPRINKLE SHOWER', 'GOBSTOPPER GANG', 'LICORICE ZIPPERS',
  'SOUR PARADE', 'CANDY CHAOS', 'LAST LICK', 'THE SOUR QUEEN',
];

/** Begin wave `n` (1-based): fill the spawn queue or bring in the boss. */
export function startWave(state, n) {
  state.wave = n;
  state.waveClock = 0;
  state.clearTimer = 0;
  state.queue = [];
  if (n === LAST_WAVE) {
    state.boss = createBoss();
    showBanner(state.fx, 'BOSS!', WAVE_TITLES[n - 1], '#ff3b5c', 2.6);
    state.events.push({ type: 'bossIntro' });
    return;
  }
  for (const [kind, count] of PLAN[n - 1]) for (let i = 0; i < count; i += 1) state.queue.push(kind);
  // A gentle shuffle so kinds mix without the hard ones all arriving first.
  for (let i = state.queue.length - 1; i > 0; i -= 1) {
    const j = Math.max(0, i - state.rng.int(0, 3));
    [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
  }
  state.spawnTimer = 0.8;
  showBanner(state.fx, `WAVE ${n}`, WAVE_TITLES[n - 1], '#29c6ff', 2);
  state.events.push({ type: 'wave' });
}

/** How hard this wave's critters are. */
export function hpScale(wave) {
  return 1 + (wave - 1) * 0.15;
}

/** Spawn from the queue over time. Returns true once the wave is fully cleared. */
export function updateWave(state, dt) {
  state.waveClock += dt;
  if (state.wave === LAST_WAVE) return state.boss !== null && state.boss.dead;
  const maxAlive = 8 + state.wave * 2;
  state.spawnTimer -= dt;
  if (state.queue.length > 0 && state.spawnTimer <= 0 && state.enemies.length < maxAlive) {
    state.spawnTimer = Math.max(0.35, 0.9 - state.wave * 0.07);
    const kind = state.queue.shift();
    const at = edgePoint(state);
    spawnEnemy(state, kind, at.x, at.y, hpScale(state.wave));
  }
  return state.queue.length === 0 && state.enemies.length === 0;
}
