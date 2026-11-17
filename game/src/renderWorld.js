// Draws the arena and everything in it: floor, syrup, shots, bullets, critters, boss, particles.
import { ARENA, COLOR, DEJAVU, FONT, VIEW } from './config.js';
import { burstFade } from './dejavu.js';
import { orbitPositions } from './player.js';
import { PHASES } from './boss.js';
import { drawBoss, drawCritter, drawGummo } from './sprites.js';

/** The candy floor: a soft checkerboard inside a frosting wall with gumdrop studs. */
export function drawArena(ctx, time, tint = null) {
  ctx.fillStyle = COLOR.sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const size = 60;
  for (let y = ARENA.top; y < ARENA.bottom; y += size) {
    for (let x = ARENA.left; x < ARENA.right; x += size) {
      const odd = ((x - ARENA.left) / size + (y - ARENA.top) / size) % 2 === 1;
      ctx.fillStyle = odd ? COLOR.floorB : COLOR.floorA;
      ctx.fillRect(x, y, Math.min(size, ARENA.right - x), Math.min(size, ARENA.bottom - y));
    }
  }
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
  }
  // Frosting wall.
  ctx.strokeStyle = COLOR.wall;
  ctx.lineWidth = 16;
  ctx.strokeRect(ARENA.left - 8, ARENA.top - 8, ARENA.right - ARENA.left + 16, ARENA.bottom - ARENA.top + 16);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(ARENA.left - 16, ARENA.top - 16, ARENA.right - ARENA.left + 32, ARENA.bottom - ARENA.top + 32);
  const studs = ['#29c6ff', '#ffe23d', '#3ee07a', '#a66bff', '#ff9b2f'];
  let i = 0;
  for (let x = ARENA.left; x <= ARENA.right; x += 80) {
    for (const y of [ARENA.top - 8, ARENA.bottom + 8]) {
      ctx.fillStyle = studs[i++ % studs.length];
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(time * 2 + x) * 1.5, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A wavering, see-through Gummo: a Déjà Vu echo waiting to be unleashed. */
function drawEcho(ctx, echo, time) {
  const t = time * 3 + echo.phase;
  const appear = Math.min(1, echo.age * 3);
  ctx.save();
  // Soft glow on the floor.
  ctx.globalAlpha = 0.35 * appear;
  ctx.fillStyle = DEJAVU.glow;
  ctx.beginPath();
  ctx.ellipse(echo.x, echo.y + 28, 52 + Math.sin(t * 2) * 6, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Two slipping afterimages, then the echo itself.
  const ghost = { radius: 30, squash: 0.15 + Math.sin(t * 1.3) * 0.15, aim: echo.aim, dashTimer: 0, hurtFlash: 0 };
  ctx.globalAlpha = 0.18 * appear;
  drawGummo(ctx, { ...ghost, x: echo.x + Math.sin(t * 2.3) * 12, y: echo.y - 6, tint: DEJAVU.glow }, time);
  drawGummo(ctx, { ...ghost, x: echo.x - Math.sin(t * 1.7) * 12, y: echo.y + 4, tint: '#29c6ff' }, time);
  ctx.globalAlpha = (0.45 + Math.sin(t * 4) * 0.08) * appear;
  drawGummo(ctx, { ...ghost, x: echo.x, y: echo.y + Math.sin(t) * 4, tint: DEJAVU.color }, time);
  ctx.restore();
}

/** An unleashed echo: solid, haloed, firing its barrage, then fading out. */
function drawLiveEcho(ctx, echo, fade, time) {
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  const pulse = 1 + Math.sin(time * 20) * 0.08;
  ctx.strokeStyle = DEJAVU.glow;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(echo.x, echo.y, 52 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(echo.x, echo.y, 62 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  drawGummo(ctx, { x: echo.x, y: echo.y, radius: 32, squash: 0.5 + Math.sin(time * 25) * 0.3, aim: echo.aim + time * 6, dashTimer: 0, hurtFlash: 0, tint: DEJAVU.color }, time);
  ctx.restore();
}

function drawShots(ctx, state) {
  for (const s of state.shots) {
    if (s.dejavu) {
      ctx.fillStyle = DEJAVU.glow;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.radius * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = DEJAVU.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = COLOR.shotGlow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(s.x - s.vx * 0.012, s.y - s.vy * 0.012, s.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLOR.shot;
    ctx.strokeStyle = COLOR.heroDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawBullets(ctx, state, time) {
  for (const b of state.bullets) {
    const pulse = 1 + Math.sin(time * 18 + b.x * 0.05) * 0.12;
    ctx.fillStyle = COLOR.bulletEdge;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * pulse + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPuddles(ctx, state) {
  for (const pd of state.puddles) {
    ctx.globalAlpha = Math.min(1, pd.life / pd.maxLife + 0.2) * 0.75;
    ctx.fillStyle = '#ff9b2f';
    ctx.beginPath();
    ctx.arc(pd.x, pd.y, pd.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.arc(pd.x, pd.y, pd.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMoons(ctx, state) {
  for (const m of orbitPositions(state)) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1aa88f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k += 1) {
      const a = state.player.orbitAngle * 2 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.6, a, a + 0.8);
      ctx.stroke();
    }
  }
}

function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    const k = Math.max(0, p.life / p.maxLife);
    if (p.ring) {
      ctx.globalAlpha = k;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 10 * k + 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - k * 0.8), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloatingText(ctx, fx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.font = `${t.size}px ${FONT}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = COLOR.ink;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

/** The whole play field for this frame, with camera shake. */
export function drawWorld(ctx, state, time) {
  const fx = state.fx;
  ctx.save();
  ctx.translate(fx.shakeX, fx.shakeY);
  const boss = state.boss && !state.boss.dead ? state.boss : null;
  const tint = boss && boss.phase === 2 ? 'rgba(255, 59, 92, 0.12)' : boss && boss.phase === 1 ? 'rgba(255, 155, 47, 0.1)' : null;
  drawArena(ctx, time, tint);
  drawPuddles(ctx, state);
  for (const echo of state.dejavu.echoes) drawEcho(ctx, echo, time);
  if (state.dejavu.burst) {
    const fade = burstFade(state.dejavu.burst);
    for (const echo of state.dejavu.burst.echoes) drawLiveEcho(ctx, echo, fade, time);
  }
  for (const e of state.enemies) drawCritter(ctx, e, state.player);
  if (state.boss && !state.boss.dead) drawBoss(ctx, state.boss, PHASES, state.player, time);
  drawShots(ctx, state);
  if (state.player.alive) {
    const p = state.player;
    if (p.shieldReady) {
      ctx.strokeStyle = 'rgba(255, 210, 61, 0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    const blinking = p.invulnerable > 0 && p.dashTimer <= 0 && Math.floor(time * 16) % 2 === 0;
    if (!blinking) drawGummo(ctx, p, time);
    drawMoons(ctx, state);
  }
  drawBullets(ctx, state, time);
  drawParticles(ctx, fx);
  drawFloatingText(ctx, fx);
  ctx.restore();
  if (fx.flash > 0) {
    ctx.globalAlpha = fx.flash * 0.5;
    ctx.fillStyle = fx.flashColor;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.globalAlpha = 1;
  }
}
