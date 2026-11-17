// Déjà Vu: popping critters fills a gauge. Each time it fills, a ghostly echo of Gummo is left
// where Gummo stands (up to five). Press E and every echo snaps into the real world at once,
// spraying candy barrages in every direction before fading away.
import { DEJAVU } from './config.js';
import { addFlash, addHitStop, addShake, burst, floatText, ring, showBanner } from './effects.js';

export function createDejavu() {
  return { gauge: DEJAVU.startGauge, echoes: [], burst: null, pending: false };
}

/** Fill the gauge; a full gauge drops an echo at Gummo's feet. */
export function chargeDejavu(state, amount) {
  const dv = state.dejavu;
  if (dv.burst) return; // barrages never pay for themselves
  dv.gauge = Math.min(DEJAVU.gaugeMax, dv.gauge + amount);
  if (dv.gauge < DEJAVU.gaugeMax || dv.echoes.length >= DEJAVU.maxEchoes) return;
  const p = state.player;
  if (!p.alive) return;
  dv.gauge = 0;
  dv.echoes.push({ x: p.x, y: p.y, aim: p.aim, age: 0, phase: dv.echoes.length * 1.7 });
  ring(state.fx, p.x, p.y, DEJAVU.color, 110, 0.5);
  burst(state.fx, state.rng, p.x, p.y, DEJAVU.color, 14, 260, 7);
  floatText(state.fx, p.x, p.y - 64, `ECHO ${dv.echoes.length}/${DEJAVU.maxEchoes}`, DEJAVU.color, 30);
  state.events.push({ type: 'dejavuSet' });
}

/** Gauge points for popping one critter. */
export function killCharge(kind) {
  return DEJAVU.perKill[kind] ?? DEJAVU.perKill.default;
}

/** Turn every echo real and start the barrage. */
function unleash(state) {
  const dv = state.dejavu;
  const echoes = dv.echoes;
  dv.echoes = [];
  dv.burst = { time: 0, volleys: 0, echoes: echoes.map((e) => ({ x: e.x, y: e.y, aim: e.aim, phase: e.phase })) };
  state.stats.dejavus += 1;
  // The past catches up: enemy drops near an echo vanish.
  const r2 = DEJAVU.clearRadius * DEJAVU.clearRadius;
  for (const b of state.bullets) {
    if (echoes.some((e) => (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < r2)) {
      b.life = 0;
      burst(state.fx, state.rng, b.x, b.y, DEJAVU.color, 2, 120, 4);
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  for (const e of echoes) {
    ring(state.fx, e.x, e.y, '#ffffff', 160, 0.45);
    ring(state.fx, e.x, e.y, DEJAVU.color, DEJAVU.clearRadius, 0.6);
    burst(state.fx, state.rng, e.x, e.y, DEJAVU.color, 22, 420, 9);
  }
  addShake(state.fx, 14 + echoes.length * 3);
  addFlash(state.fx, DEJAVU.color, 0.7);
  addHitStop(state.fx, 0.1);
  showBanner(state.fx, 'DÉJÀ VU!', `${echoes.length} ECHO${echoes.length > 1 ? 'ES' : ''} UNLEASHED`, DEJAVU.color, 1.5);
  state.events.push({ type: 'dejavu', count: echoes.length });
}

/** Ring of barrage shots from one echo. */
function volley(state, echo, index) {
  const n = DEJAVU.shotsPerVolley;
  const twist = index * 0.21 + echo.phase;
  for (let i = 0; i < n; i += 1) {
    const angle = twist + (i / n) * Math.PI * 2;
    state.shots.push({
      x: echo.x + Math.cos(angle) * 34,
      y: echo.y + Math.sin(angle) * 34,
      vx: Math.cos(angle) * DEJAVU.shotSpeed,
      vy: Math.sin(angle) * DEJAVU.shotSpeed,
      radius: DEJAVU.shotRadius,
      damage: DEJAVU.shotDamage,
      bounces: 0,
      pierce: DEJAVU.shotPierce,
      hit: new Set(),
      life: 1.5,
      dejavu: true,
    });
  }
}

/** Remember a press of the Déjà Vu key, even one that lands during hit-stop. */
export function requestDejavu(state) {
  if (state.mode === 'play') state.dejavu.pending = true;
}

/** One step of Déjà Vu: a latched press unleashes the echoes; a running barrage fires its volleys. */
export function updateDejavu(state, dt) {
  const dv = state.dejavu;
  for (const e of dv.echoes) e.age += dt;
  if (dv.pending && state.mode === 'play' && state.player.alive) {
    dv.pending = false;
    if (dv.echoes.length > 0 && !dv.burst) unleash(state);
  } else if (state.mode !== 'play') dv.pending = false;

  const b = dv.burst;
  if (!b) return;
  b.time += dt;
  while (b.volleys < DEJAVU.volleys && b.time >= b.volleys * DEJAVU.volleyGap) {
    for (const echo of b.echoes) volley(state, echo, b.volleys);
    b.volleys += 1;
    state.events.push({ type: 'dejavuVolley' });
  }
  if (b.time > DEJAVU.volleys * DEJAVU.volleyGap + DEJAVU.fadeTime) dv.burst = null;
}

/** 0..1: how far into the fade-out a barrage echo is (0 while it is still firing). */
export function burstFade(burstState) {
  const firing = DEJAVU.volleys * DEJAVU.volleyGap;
  return Math.max(0, Math.min(1, (burstState.time - firing) / DEJAVU.fadeTime));
}
