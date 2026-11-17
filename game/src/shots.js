// Screenshot scenes behind ?shot=title|play|upgrade|boss|results&seed=N.
// Each one plays the real rules forward from a fresh seeded run, steered by a simple autopilot
// (dodge bullets and critters, keep a kiting distance, shoot the nearest foe, dash when cornered),
// so a frame shows what a real run looks like and the same seed always gives the same frame.
import { ARENA, LAST_WAVE, STEP } from './config.js';
import { createGame, pickUpgrade, stepGame } from './world.js';

const PREFERENCE = ['split', 'pierce', 'orbit', 'homing', 'poprocks', 'bounce', 'rapid', 'heart', 'shield', 'trail'];

/** Controls a cautious player would give this step. */
export function autopilot(state) {
  const p = state.player;
  const foes = state.enemies.filter((e) => e.spawn <= 0);
  if (state.boss && !state.boss.dead && state.boss.entering <= 0) foes.push(state.boss);
  let target = null;
  let best = Infinity;
  for (const f of foes) {
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d < best) { best = d; target = f; }
  }
  let ax = 0;
  let ay = 0;
  let danger = false;
  for (const b of state.bullets) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 170) {
      const w = (170 - d) / 170;
      ax += (dx / d) * w * 3;
      ay += (dy / d) * w * 3;
      if (d < p.radius + b.radius + 26) danger = true;
    }
  }
  for (const f of foes) {
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const keep = f.radius + 230;
    if (d < keep) {
      const w = (keep - d) / keep;
      ax += (dx / d) * w * 4;
      ay += (dy / d) * w * 4;
      if (d < f.radius + p.radius + 30) danger = true;
    }
    if (f.mode === 'windup' || f.mode === 'charge') {
      ax += (-f.aimY) * 1.5;
      ay += f.aimX * 1.5;
    }
  }
  // Stay off the walls.
  const cx = (ARENA.left + ARENA.right) / 2;
  const cy = (ARENA.top + ARENA.bottom) / 2 + 60;
  ax += ((cx - p.x) / 600) * 1.2;
  ay += ((cy - p.y) / 300) * 1.2;
  const len = Math.hypot(ax, ay);
  return {
    moveX: len > 0.15 ? ax / len : 0,
    moveY: len > 0.15 ? ay / len : 0,
    aimX: target ? target.x : p.x,
    aimY: target ? target.y : p.y - 100,
    fire: target !== null,
    dash: danger && p.dashCooldown <= 0,
  };
}

/** The upgrade the autopilot takes from the offered cards. */
function choose(state) {
  let pick = 0;
  let rank = Infinity;
  state.choices.forEach((id, i) => {
    const r = PREFERENCE.indexOf(id);
    if (r < rank) { rank = r; pick = i; }
  });
  return pick;
}

/** Play forward until `stop(state)` is true (or the run ends / time runs out). */
function playUntil(state, stop, maxSeconds = 900) {
  for (let t = 0; t < maxSeconds; t += STEP) {
    if (stop(state)) return;
    if (state.mode === 'upgrade') {
      if (state.modeTime > 0.6) pickUpgrade(state, choose(state));
    }
    if ((state.mode === 'victory' || state.mode === 'defeat') && state.modeTime > 1) return;
    stepGame(state, autopilot(state), STEP);
    state.events.length = 0;
  }
}

/** A scene object main.js can draw: which screen, the game state, the clock, and UI flags. */
export function buildShotScene(name, seed) {
  const ui = { paused: false, best: 0, newBest: false, hover: -1 };
  if (name === 'title') return { screen: 'title', game: null, time: 0.35, ui };
  const game = createGame(seed);
  game.stats.moved = 5;
  game.stats.shots = 50;
  game.stats.dashes = 1;
  if (name === 'play') {
    playUntil(game, (s) => s.wave === 4 && s.waveClock > 9 && s.mode === 'play' && s.enemies.length >= 6);
  } else if (name === 'upgrade') {
    playUntil(game, (s) => s.wave === 3 && s.mode === 'upgrade' && s.modeTime > 0.5);
    ui.hover = 0;
  } else if (name === 'boss') {
    playUntil(game, (s) => s.boss && s.boss.phase === 1 && s.boss.transition <= 0 && s.player.invulnerable <= 0
      && s.bullets.length > 30 && s.enemies.length > 0);
  } else {
    playUntil(game, (s) => (s.mode === 'victory' || s.mode === 'defeat') && s.modeTime > 0.6);
    ui.best = game.score;
    ui.newBest = true;
  }
  return { screen: 'game', game, time: game.time, ui, wave: game.wave, last: LAST_WAVE };
}
