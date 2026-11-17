// Gummo the gumdrop: moving, aiming, shooting, dashing and the upgrades that ride on them.
import { ARENA, PLAYER } from './config.js';
import { level } from './upgrades.js';
import { burst } from './effects.js';

export function createPlayer() {
  return {
    x: (ARENA.left + ARENA.right) / 2,
    y: (ARENA.top + ARENA.bottom) / 2 + 50,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    aim: -Math.PI / 2,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: -1,
    invulnerable: 0,
    shieldReady: false,
    shieldTimer: 0,
    orbitAngle: 0,
    trailTimer: 0,
    squash: 0,
    hurtFlash: 0,
    alive: true,
  };
}

/** Seconds between shots with the current upgrades. */
export function fireDelay(state) {
  return PLAYER.fireDelay / Math.pow(1.35, level(state, 'rapid'));
}

/** Positions of the orbiting mint moons. */
export function orbitPositions(state) {
  const count = level(state, 'orbit');
  if (count === 0) return [];
  const p = state.player;
  const moons = count * 2;
  const radius = 72 + count * 6;
  const list = [];
  for (let i = 0; i < moons; i += 1) {
    const angle = p.orbitAngle + (i / moons) * Math.PI * 2;
    list.push({ x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius, radius: 15 });
  }
  return list;
}

export function updatePlayer(state, controls, dt) {
  const p = state.player;
  if (!p.alive) return;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  p.squash *= 0.85;
  p.aim = Math.atan2(controls.aimY - p.y, controls.aimX - p.x);
  p.orbitAngle += dt * 3.4;

  if (level(state, 'shield') > 0 && !p.shieldReady) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) {
      p.shieldReady = true;
      state.events.push({ type: 'shield' });
    }
  }

  let mx = controls.moveX;
  let my = controls.moveY;
  const length = Math.hypot(mx, my);
  if (length > 0) { mx /= length; my /= length; }

  if (controls.dash && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    p.dashX = length > 0 ? mx : Math.cos(p.aim);
    p.dashY = length > 0 ? my : Math.sin(p.aim);
    p.squash = 1;
    state.stats.dashes += 1;
    state.events.push({ type: 'dash' });
    burst(state.fx, state.rng, p.x, p.y, '#ffffff', 10, 200, 6);
  }

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashX * PLAYER.dashSpeed;
    p.vy = p.dashY * PLAYER.dashSpeed;
    const trail = level(state, 'trail');
    if (trail > 0) {
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.025;
        state.puddles.push({ x: p.x, y: p.y, radius: 26 + trail * 6, life: 2.2 + trail, maxLife: 2.2 + trail, damage: 26 + trail * 14 });
      }
    }
  } else {
    const ease = 1 - Math.pow(0.0005, dt);
    p.vx += (mx * PLAYER.speed - p.vx) * ease;
    p.vy += (my * PLAYER.speed - p.vy) * ease;
  }

  p.x = Math.min(ARENA.right - p.radius, Math.max(ARENA.left + p.radius, p.x + p.vx * dt));
  p.y = Math.min(ARENA.bottom - p.radius, Math.max(ARENA.top + p.radius, p.y + p.vy * dt));

  p.fireTimer -= dt;
  if (controls.fire && p.fireTimer <= 0) {
    p.fireTimer = fireDelay(state);
    shoot(state);
  }
}

/** Spawn this volley of player shots, shaped by the upgrades. */
function shoot(state) {
  const p = state.player;
  const split = level(state, 'split');
  const spread = split === 0 ? [0] : split === 1 ? [-0.2, 0, 0.2] : [-0.36, -0.18, 0, 0.18, 0.36];
  for (const offset of spread) {
    const angle = p.aim + offset;
    state.shots.push({
      x: p.x + Math.cos(angle) * (p.radius + 6),
      y: p.y + Math.sin(angle) * (p.radius + 6),
      vx: Math.cos(angle) * PLAYER.shotSpeed,
      vy: Math.sin(angle) * PLAYER.shotSpeed,
      radius: PLAYER.shotRadius,
      damage: PLAYER.shotDamage,
      bounces: level(state, 'bounce'),
      pierce: level(state, 'pierce') * 2,
      hit: new Set(),
      life: 1.6,
    });
  }
  p.squash = Math.max(p.squash, 0.25);
  state.stats.shots += 1;
  state.events.push({ type: 'shoot' });
}
