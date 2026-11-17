// Queen Sourbelle, the final boss, in three phases:
//   1 "LEMON WALTZ"   drifts and fires rings of sour drops
//   2 "SOUR STORM"    spins bullet spirals and calls in critters
//   3 "SUGAR CRASH"   enraged: telegraphed charges and bullet bursts
import { ARENA, BOSS } from './config.js';
import { edgePoint, fireBullet, spawnEnemy } from './enemies.js';
import { addFlash, addHitStop, addShake, burst, ring, showBanner } from './effects.js';

export const PHASES = [
  { name: 'LEMON WALTZ', color: '#ffe23d', dark: '#d9a400' },
  { name: 'SOUR STORM', color: '#ff9b2f', dark: '#c4620a' },
  { name: 'SUGAR CRASH', color: '#ff3b5c', dark: '#a8122f' },
];

export function createBoss() {
  return {
    x: (ARENA.left + ARENA.right) / 2,
    y: ARENA.top + 150,
    vx: 0, vy: 0,
    radius: BOSS.radius,
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    phase: 0,
    timer: 2,
    attack: 0,
    spin: 0,
    mode: 'move',
    aimX: 0, aimY: 0,
    flash: 0,
    entering: 1.6,
    transition: 0,
    dead: false,
  };
}

/** The phase the boss's HP puts it in. */
function phaseFor(boss) {
  const f = boss.hp / boss.maxHp;
  if (f <= BOSS.phaseAt[1]) return 2;
  if (f <= BOSS.phaseAt[0]) return 1;
  return 0;
}

export function updateBoss(state, dt) {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  boss.flash = Math.max(0, boss.flash - dt);
  boss.spin += dt;
  if (boss.entering > 0) {
    boss.entering -= dt;
    return;
  }

  const next = phaseFor(boss);
  if (next !== boss.phase) {
    boss.phase = next;
    boss.transition = 1.2;
    boss.mode = 'move';
    boss.timer = 1.2;
    state.bullets.length = 0;
    const ph = PHASES[next];
    showBanner(state.fx, `PHASE ${next + 1}`, ph.name, ph.color, 2.4);
    addShake(state.fx, 24);
    addFlash(state.fx, ph.color, 0.8);
    addHitStop(state.fx, 0.18);
    ring(state.fx, boss.x, boss.y, ph.color, 260, 0.7);
    burst(state.fx, state.rng, boss.x, boss.y, ph.color, 60, 520, 12);
    state.events.push({ type: 'phase', phase: next });
  }
  if (boss.transition > 0) { boss.transition -= dt; return; }

  const p = state.player;
  const dx = p.x - boss.x;
  const dy = p.y - boss.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  boss.timer -= dt;

  if (boss.phase === 0) {
    // Lemon Waltz: sway across the top and fire rings with a gap.
    boss.vx = Math.cos(boss.spin * 0.7) * 160;
    boss.vy = Math.sin(boss.spin * 1.1) * 60 + (ARENA.top + 190 - boss.y);
    if (boss.timer <= 0) {
      boss.timer = 1.45;
      const count = 16;
      const offset = state.rng.range(0, Math.PI * 2);
      for (let i = 0; i < count; i += 1) fireBullet(state, boss.x, boss.y, offset + (i / count) * Math.PI * 2, 210, 13);
      state.events.push({ type: 'bossShoot' });
    }
  } else if (boss.phase === 1) {
    // Sour Storm: circle the arena, spray a two-armed spiral, summon helpers.
    const cx = (ARENA.left + ARENA.right) / 2;
    const cy = (ARENA.top + ARENA.bottom) / 2;
    const tx = cx + Math.cos(boss.spin * 0.5) * 380;
    const ty = cy + Math.sin(boss.spin * 0.5) * 160;
    boss.vx = (tx - boss.x) * 1.5;
    boss.vy = (ty - boss.y) * 1.5;
    boss.attack -= dt;
    if (boss.attack <= 0) {
      boss.attack = 0.11;
      for (const arm of [0, Math.PI]) fireBullet(state, boss.x, boss.y, boss.spin * 2.3 + arm, 200, 11);
    }
    if (boss.timer <= 0) {
      boss.timer = 5;
      for (let i = 0; i < 3; i += 1) {
        const at = edgePoint(state);
        spawnEnemy(state, i === 2 ? 'zipper' : 'jellybob', at.x, at.y);
      }
      state.events.push({ type: 'summon' });
    }
  } else {
    // Sugar Crash: wind up (a line shows the path), charge, then burst on landing.
    if (boss.mode === 'move') {
      boss.vx = (dx / dist) * 90;
      boss.vy = (dy / dist) * 90;
      boss.attack -= dt;
      if (boss.attack <= 0) {
        boss.attack = 0.5;
        const base = Math.atan2(dy, dx);
        for (const off of [-0.3, -0.15, 0, 0.15, 0.3]) fireBullet(state, boss.x, boss.y, base + off, 260, 11);
      }
      if (boss.timer <= 0) {
        boss.mode = 'windup';
        boss.timer = 0.85;
        boss.aimX = dx / dist;
        boss.aimY = dy / dist;
        state.events.push({ type: 'windup' });
      }
    } else if (boss.mode === 'windup') {
      boss.vx = -boss.aimX * 40;
      boss.vy = -boss.aimY * 40;
      if (boss.timer <= 0) { boss.mode = 'charge'; boss.timer = 0.7; }
    } else {
      boss.vx = boss.aimX * 760;
      boss.vy = boss.aimY * 760;
      const hitWall = boss.x <= ARENA.left + boss.radius + 2 || boss.x >= ARENA.right - boss.radius - 2
        || boss.y <= ARENA.top + boss.radius + 2 || boss.y >= ARENA.bottom - boss.radius - 2;
      if (boss.timer <= 0 || hitWall) {
        boss.mode = 'move';
        boss.timer = 2.2;
        const count = 22;
        for (let i = 0; i < count; i += 1) fireBullet(state, boss.x, boss.y, (i / count) * Math.PI * 2, 250, 12);
        addShake(state.fx, 18);
        ring(state.fx, boss.x, boss.y, PHASES[2].color, 180, 0.5);
        state.events.push({ type: 'slam' });
      }
    }
  }

  boss.x = Math.min(ARENA.right - boss.radius, Math.max(ARENA.left + boss.radius, boss.x + boss.vx * dt));
  boss.y = Math.min(ARENA.bottom - boss.radius, Math.max(ARENA.top + boss.radius, boss.y + boss.vy * dt));
}
