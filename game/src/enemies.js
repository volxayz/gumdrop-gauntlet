// The sour critters: how each kind spawns, thinks and moves.
import { ARENA, ENEMY } from './config.js';

const SPAWN_TIME = 0.75;

export function spawnEnemy(state, kind, x, y, scale = 1) {
  const type = ENEMY[kind];
  const hp = Math.round(type.hp * scale);
  const enemy = {
    kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, radius: type.radius,
    spawn: SPAWN_TIME, flash: 0, timer: state.rng.range(0.5, 1.5), mode: 'roam', aimX: 0, aimY: 0,
    wobble: state.rng.range(0, Math.PI * 2), dead: false,
  };
  state.enemies.push(enemy);
  return enemy;
}

/** A spawn point along the arena edge, kept away from the player. */
export function edgePoint(state) {
  const rng = state.rng;
  for (let tries = 0; tries < 12; tries += 1) {
    const side = rng.int(0, 3);
    const x = side === 0 ? ARENA.left + 50 : side === 1 ? ARENA.right - 50 : rng.range(ARENA.left + 60, ARENA.right - 60);
    const y = side === 2 ? ARENA.top + 50 : side === 3 ? ARENA.bottom - 50 : rng.range(ARENA.top + 60, ARENA.bottom - 60);
    if (Math.hypot(x - state.player.x, y - state.player.y) > 260) return { x, y };
  }
  return { x: ARENA.left + 60, y: ARENA.top + 60 };
}

/** Fire one sour bullet. */
export function fireBullet(state, x, y, angle, speed, radius = 11) {
  state.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius, life: 6 });
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.wobble += dt * 6;
    if (e.spawn > 0) { e.spawn -= dt; continue; }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const type = ENEMY[e.kind];
    e.timer -= dt;

    if (e.kind === 'jellybob' || e.kind === 'gobstopper' || e.kind === 'minigob') {
      const hop = e.kind === 'jellybob' ? 0.75 + 0.45 * Math.sin(e.wobble) : 1;
      e.vx = (dx / dist) * type.speed * hop;
      e.vy = (dy / dist) * type.speed * hop;
    } else if (e.kind === 'sprinkler') {
      const want = dist > 340 ? 1 : dist < 260 ? -1 : 0;
      e.vx = (dx / dist) * type.speed * want + (-dy / dist) * type.speed * 0.6;
      e.vy = (dy / dist) * type.speed * want + (dx / dist) * type.speed * 0.6;
      if (e.timer <= 0) {
        e.timer = type.fireDelay;
        const base = Math.atan2(dy, dx);
        for (const off of [-0.25, 0, 0.25]) fireBullet(state, e.x, e.y, base + off, 230);
        state.events.push({ type: 'enemyShoot' });
      }
    } else if (e.kind === 'zipper') {
      if (e.mode === 'roam') {
        e.vx = (dx / dist) * type.speed;
        e.vy = (dy / dist) * type.speed;
        if (e.timer <= 0 && dist < 520) {
          e.mode = 'windup';
          e.timer = 0.7;
          e.aimX = dx / dist;
          e.aimY = dy / dist;
          state.events.push({ type: 'windup' });
        }
      } else if (e.mode === 'windup') {
        e.vx = -e.aimX * 30;
        e.vy = -e.aimY * 30;
        if (e.timer <= 0) { e.mode = 'charge'; e.timer = 0.55; }
      } else {
        e.vx = e.aimX * type.chargeSpeed;
        e.vy = e.aimY * type.chargeSpeed;
        if (e.timer <= 0) { e.mode = 'roam'; e.timer = 1.6; }
      }
    }

    e.x = Math.min(ARENA.right - e.radius, Math.max(ARENA.left + e.radius, e.x + e.vx * dt));
    e.y = Math.min(ARENA.bottom - e.radius, Math.max(ARENA.top + e.radius, e.y + e.vy * dt));
  }

  // Keep critters from stacking into one blob.
  const list = state.enemies;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
  }
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < ARENA.left - 20 || b.x > ARENA.right + 20 || b.y < ARENA.top - 20 || b.y > ARENA.bottom + 20) b.life = 0;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}
