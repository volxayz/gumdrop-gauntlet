// The run: one state object and the fixed-step rules that move it between
// play, upgrade picks, the boss, and the final results.
import { LAST_WAVE } from './config.js';
import { createRng } from './rng.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateBullets, updateEnemies } from './enemies.js';
import { updateBoss } from './boss.js';
import { updateCombat, updateShots } from './combat.js';
import { startWave, updateWave } from './waves.js';
import { applyUpgrade, rollChoices } from './upgrades.js';
import { createEffects, floatText, showBanner, updateEffects } from './effects.js';

export function createGame(seed) {
  const state = {
    seed,
    rng: createRng(seed),
    mode: 'play', // play | upgrade | outro | victory | defeat
    modeTime: 0,
    time: 0,
    wave: 0,
    waveClock: 0,
    queue: [],
    spawnTimer: 0,
    clearTimer: 0,
    player: createPlayer(),
    enemies: [],
    shots: [],
    bullets: [],
    puddles: [],
    explosions: [],
    boss: null,
    upgrades: {},
    choices: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    fx: createEffects(),
    events: [],
    stats: { kills: 0, shots: 0, dashes: 0, moved: 0, hitsTaken: 0, bestCombo: 0, bossDamage: 0 },
  };
  startWave(state, 1);
  return state;
}

function setMode(state, mode) {
  state.mode = mode;
  state.modeTime = 0;
}

/** Take upgrade card `index` (0..2) and start the next wave. */
export function pickUpgrade(state, index) {
  if (state.mode !== 'upgrade' || !state.choices[index]) return false;
  applyUpgrade(state, state.choices[index]);
  state.events.push({ type: 'pick' });
  state.choices = [];
  setMode(state, 'play');
  startWave(state, state.wave + 1);
  return true;
}

/** Advance the run by one fixed step. */
export function stepGame(state, controls, dt) {
  state.modeTime += dt;
  const fx = state.fx;
  if (fx.hitStop > 0) {
    fx.hitStop -= dt;
    updateEffects(fx, state.rng, dt * 0.25);
    return;
  }
  updateEffects(fx, state.rng, dt);

  if (state.mode === 'play' || state.mode === 'outro') {
    state.time += dt;
    if (state.mode === 'play' && (controls.moveX !== 0 || controls.moveY !== 0)) state.stats.moved += dt;
    updatePlayer(state, state.mode === 'play' ? controls : { ...controls, fire: false, dash: false, moveX: 0, moveY: 0 }, dt);
    updateEnemies(state, dt);
    updateBoss(state, dt);
    updateBullets(state, dt);
    updateShots(state, dt);
    updateCombat(state, dt);
  }

  if (state.mode === 'play') {
    if (!state.player.alive) {
      setMode(state, 'outro');
      state.outcome = 'defeat';
      return;
    }
    if (updateWave(state, dt)) {
      state.clearTimer += dt;
      if (state.clearTimer > 0.9) {
        if (state.wave >= LAST_WAVE) {
          setMode(state, 'outro');
          state.outcome = 'victory';
          showBanner(fx, 'SWEET VICTORY!', 'The Sour Queen is crushed', '#ffd23d', 2.4);
          state.events.push({ type: 'win' });
        } else {
          state.choices = rollChoices(state);
          state.bullets.length = 0;
          const p = state.player;
          if (p.hp < p.maxHp) {
            p.hp += 1;
            floatText(fx, p.x, p.y - 60, '+1 HEART', '#ff3b5c', 34);
          }
          setMode(state, 'upgrade');
          state.events.push({ type: 'cleared' });
        }
      }
    }
  } else if (state.mode === 'outro') {
    if (state.modeTime > 2.4) {
      setMode(state, state.outcome);
      state.events.push({ type: state.outcome === 'victory' ? 'results' : 'lose' });
    }
  }
}

/** Letter grade for the results screen. */
export function grade(state) {
  const won = state.outcome === 'victory';
  const s = state.score - state.stats.hitsTaken * 1000;
  if (won) return s >= 100000 ? 'S' : 'A';
  if (s >= 50000) return 'B';
  if (s >= 20000) return 'C';
  return 'D';
}
