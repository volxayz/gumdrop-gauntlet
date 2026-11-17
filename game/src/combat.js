// Every collision: shots, mint moons and syrup against critters and the boss; danger against Gummo.
import { ARENA, BOSS, COMBO, ENEMY } from './config.js';
import { level } from './upgrades.js';
import { orbitPositions } from './player.js';
import { spawnEnemy } from './enemies.js';
import { PHASES } from './boss.js';
import { addFlash, addHitStop, addShake, burst, floatText, ring } from './effects.js';

const touching = (a, b, extra = 0) => {
  const r = a.radius + b.radius + extra;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < r * r;
};

/** Everything a player attack can hit: live critters and the boss. */
function targets(state) {
  const list = state.enemies.filter((e) => e.spawn <= 0 && !e.dead);
  if (state.boss && !state.boss.dead && state.boss.entering <= 0) list.push(state.boss);
  return list;
}

function nearestTarget(state, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const t of targets(state)) {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

/** Hurt a critter or the boss; handles the kill. */
export function damage(state, target, amount) {
  if (target.dead) return;
  target.hp -= amount;
  target.flash = 0.08;
  if (target === state.boss) {
    state.stats.bossDamage += amount;
    if (target.hp <= 0) killBoss(state);
    return;
  }
  if (target.hp <= 0) killEnemy(state, target);
}

function addScore(state, base, x, y) {
  state.combo += 1;
  state.comboTimer = COMBO.window;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, state.combo);
  const multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / 5));
  const gained = base * multiplier;
  state.score += gained;
  floatText(state.fx, x, y - 20, `+${gained}`, multiplier > 1 ? '#ffd23d' : '#ffffff', multiplier > 1 ? 30 : 24);
  if (state.combo > 0 && state.combo % 5 === 0) {
    floatText(state.fx, x, y - 56, `x${multiplier} COMBO!`, '#ff5fb2', 34);
    state.events.push({ type: 'combo' });
  }
}

function killEnemy(state, e) {
  e.dead = true;
  const type = ENEMY[e.kind];
  state.stats.kills += 1;
  addScore(state, type.score, e.x, e.y);
  burst(state.fx, state.rng, e.x, e.y, type.color, 18, 320, 9);
  burst(state.fx, state.rng, e.x, e.y, '#ffffff', 6, 200, 6);
  addShake(state.fx, e.kind === 'gobstopper' ? 10 : 5);
  state.events.push({ type: 'pop', big: e.kind === 'gobstopper' });
  if (e.kind === 'gobstopper') {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2;
      const mini = spawnEnemy(state, 'minigob', e.x + Math.cos(angle) * 30, e.y + Math.sin(angle) * 30);
      mini.spawn = 0.15;
    }
  }
  const pops = level(state, 'poprocks');
  if (pops > 0) state.explosions.push({ x: e.x, y: e.y, radius: 80 + pops * 30, damage: 18 + pops * 16, delay: 0.08 });
}

function killBoss(state) {
  const boss = state.boss;
  boss.dead = true;
  boss.hp = 0;
  addScore(state, BOSS.score, boss.x, boss.y);
  for (let i = 0; i < 4; i += 1) burst(state.fx, state.rng, boss.x, boss.y, PHASES[i % 3].color, 40, 640, 14);
  ring(state.fx, boss.x, boss.y, '#ffffff', 420, 1);
  addShake(state.fx, 28);
  addFlash(state.fx, '#ffffff', 1);
  addHitStop(state.fx, 0.35);
  state.bullets.length = 0;
  for (const e of state.enemies) if (!e.dead) killEnemy(state, e);
  state.events.push({ type: 'bossDown' });
}

/** Lose a heart, unless dashing, recovering, or a caramel shell soaks it. */
export function hurtPlayer(state) {
  const p = state.player;
  if (!p.alive || p.invulnerable > 0 || p.dashTimer > 0) return;
  if (p.shieldReady) {
    p.shieldReady = false;
    p.shieldTimer = 8;
    p.invulnerable = 0.6;
    ring(state.fx, p.x, p.y, '#ffd23d', 90, 0.4);
    floatText(state.fx, p.x, p.y - 50, 'BLOCKED!', '#ffd23d', 30);
    state.events.push({ type: 'block' });
    return;
  }
  p.hp -= 1;
  p.invulnerable = 1.1;
  p.hurtFlash = 0.3;
  state.combo = 0;
  state.stats.hitsTaken += 1;
  addShake(state.fx, 18);
  addFlash(state.fx, '#ff3b5c', 0.55);
  addHitStop(state.fx, 0.12);
  burst(state.fx, state.rng, p.x, p.y, '#29c6ff', 20, 300, 8);
  state.events.push({ type: 'hurt' });
  if (p.hp <= 0) {
    p.alive = false;
    burst(state.fx, state.rng, p.x, p.y, '#29c6ff', 60, 500, 12);
    addShake(state.fx, 28);
    state.events.push({ type: 'dead' });
  }
}

export function updateShots(state, dt) {
  const homing = level(state, 'homing');
  for (const s of state.shots) {
    if (homing > 0) {
      const t = nearestTarget(state, s.x, s.y);
      if (t) {
        const want = Math.atan2(t.y - s.y, t.x - s.x);
        const have = Math.atan2(s.vy, s.vx);
        let turn = want - have;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const angle = have + Math.max(-1, Math.min(1, turn)) * 6 * dt;
        const speed = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(angle) * speed;
        s.vy = Math.sin(angle) * speed;
      }
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    const outX = s.x < ARENA.left + s.radius || s.x > ARENA.right - s.radius;
    const outY = s.y < ARENA.top + s.radius || s.y > ARENA.bottom - s.radius;
    if (outX || outY) {
      if (s.bounces > 0) {
        s.bounces -= 1;
        if (outX) s.vx = -s.vx;
        if (outY) s.vy = -s.vy;
        s.x = Math.min(ARENA.right - s.radius, Math.max(ARENA.left + s.radius, s.x));
        s.y = Math.min(ARENA.bottom - s.radius, Math.max(ARENA.top + s.radius, s.y));
        s.hit.clear();
        burst(state.fx, state.rng, s.x, s.y, '#3ee07a', 4, 120, 5);
      } else {
        s.life = 0;
        burst(state.fx, state.rng, s.x, s.y, '#ffffff', 3, 100, 4);
      }
    }
    if (s.life <= 0) continue;
    for (const t of targets(state)) {
      if (s.hit.has(t) || !touching(s, t)) continue;
      s.hit.add(t);
      damage(state, t, s.damage);
      burst(state.fx, state.rng, s.x, s.y, '#ffffff', 4, 160, 5);
      state.events.push({ type: 'hit' });
      if (s.pierce > 0) s.pierce -= 1;
      else { s.life = 0; break; }
    }
  }
  state.shots = state.shots.filter((s) => s.life > 0);
}

export function updateCombat(state, dt) {
  const p = state.player;

  // Mint moons.
  const all = targets(state);
  for (const t of all) t.moonCooldown = Math.max(0, (t.moonCooldown ?? 0) - dt);
  for (const moon of orbitPositions(state)) {
    for (const t of all) {
      if (t.moonCooldown > 0 || !touching(moon, t)) continue;
      t.moonCooldown = 0.3;
      damage(state, t, 14);
      burst(state.fx, state.rng, moon.x, moon.y, '#7ff5e1', 5, 160, 5);
      state.events.push({ type: 'hit' });
    }
  }

  // Burning syrup puddles.
  for (const puddle of state.puddles) {
    puddle.life -= dt;
    for (const t of targets(state)) if (touching(puddle, t)) damage(state, t, puddle.damage * dt);
  }
  state.puddles = state.puddles.filter((pd) => pd.life > 0);

  // Pop Rocks chain explosions.
  const ready = state.explosions.filter((x) => (x.delay -= dt) <= 0);
  state.explosions = state.explosions.filter((x) => x.delay > 0);
  for (const blast of ready) {
    ring(state.fx, blast.x, blast.y, '#ff3b5c', blast.radius, 0.35);
    burst(state.fx, state.rng, blast.x, blast.y, '#ffd23d', 12, 380, 8);
    addShake(state.fx, 8);
    state.events.push({ type: 'boom' });
    for (const t of targets(state)) if (touching(blast, t)) damage(state, t, blast.damage);
  }

  // Danger to Gummo.
  if (p.alive) {
    for (const b of state.bullets) {
      if (touching(b, p, -8)) {
        if (p.dashTimer > 0 || p.invulnerable > 0) continue;
        b.life = 0;
        hurtPlayer(state);
      }
    }
    for (const e of state.enemies) if (e.spawn <= 0 && !e.dead && touching(e, p, -6)) hurtPlayer(state);
    const boss = state.boss;
    if (boss && !boss.dead && boss.entering <= 0 && touching(boss, p, -10)) hurtPlayer(state);
  }

  state.enemies = state.enemies.filter((e) => !e.dead);

  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = 0;
}
