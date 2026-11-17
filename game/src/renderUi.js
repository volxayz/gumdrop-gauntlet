// Screens and HUD: the title, the in-game HUD and hints, the upgrade cards, pause, and the results.
import { BOSS, COLOR, FONT, LAST_WAVE, PLAYER, VIEW } from './config.js';
import { upgradeById } from './upgrades.js';
import { PHASES } from './boss.js';
import { WAVE_TITLES } from './waves.js';
import { drawArena } from './renderWorld.js';
import { drawBoss, drawCritter, drawGummo } from './sprites.js';
import { currentHint } from './hints.js';
import { grade } from './world.js';

const CX = VIEW.width / 2;

/** Big outlined cartoon text. */
export function bigText(ctx, text, x, y, size, fill, align = 'center', outline = 0.2) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * outline);
  ctx.strokeStyle = COLOR.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function panel(ctx, x, y, w, h, fill = COLOR.hudPanel, radius = 18) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function heart(ctx, x, y, size, full) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 30, size / 30);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-26, -6, -12, -26, 0, -12);
  ctx.bezierCurveTo(12, -26, 26, -6, 0, 10);
  ctx.closePath();
  ctx.fillStyle = full ? COLOR.heart : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLOR.ink;
  ctx.stroke();
  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-8, -10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Small round badge for an owned upgrade, with its stack count. */
function upgradeBadge(ctx, id, count, x, y, size) {
  const u = upgradeById(id);
  ctx.fillStyle = u.color;
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR.ink;
  ctx.font = `${size * 1.1}px 'Segoe UI Symbol', ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.icon, x, y + 2);
  if (count > 1) bigText(ctx, `${count}`, x + size * 0.8, y + size * 0.7, 18, '#ffffff');
}

/** The in-game HUD: hearts, wave, score, combo, dash, upgrades, boss bar, hints, banners. */
export function drawHud(ctx, state, time) {
  const p = state.player;
  // Top bar.
  panel(ctx, 0, 0, VIEW.width, 76, COLOR.hudPanel, 0);
  for (let i = 0; i < p.maxHp; i += 1) heart(ctx, 44 + i * 50, 40, 40, i < p.hp);
  const waveText = state.wave >= LAST_WAVE ? 'BOSS WAVE' : `WAVE ${state.wave} / ${LAST_WAVE - 1}`;
  bigText(ctx, waveText, CX, 38, 38, state.wave >= LAST_WAVE ? '#ff5fb2' : '#ffffff');
  bigText(ctx, `${state.score}`.padStart(6, '0'), VIEW.width - 24, 38, 44, COLOR.gold, 'right');

  // Combo meter under the score.
  if (state.combo >= 2) {
    const mult = Math.min(8, 1 + Math.floor(state.combo / 5));
    const k = Math.max(0, state.comboTimer / 2.2);
    panel(ctx, VIEW.width - 236, 86, 212, 56, 'rgba(58,20,64,0.7)', 14);
    bigText(ctx, `COMBO ${state.combo}  x${mult}`, VIEW.width - 130, 108, 24, '#ff5fb2');
    ctx.fillStyle = '#ff5fb2';
    ctx.fillRect(VIEW.width - 222, 128, 184 * k, 7);
  }

  // Dash meter beside the hearts.
  const ready = p.dashCooldown <= 0;
  const dashX = 44 + p.maxHp * 50 + 20;
  panel(ctx, dashX, 14, 150, 50, ready ? '#29c6ff' : 'rgba(255,255,255,0.15)', 12);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  if (!ready) ctx.fillRect(dashX, 14, 150 * (1 - p.dashCooldown / PLAYER.dashCooldown), 50);
  bigText(ctx, ready ? 'DASH ✓' : 'DASH', dashX + 75, 40, 24, '#ffffff');

  // Owned upgrades, bottom left.
  const owned = Object.entries(state.upgrades);
  if (owned.length > 0) {
    panel(ctx, 10, VIEW.height - 72, 30 + owned.length * 58, 64, 'rgba(58,20,64,0.6)', 16);
    owned.forEach(([id, count], i) => upgradeBadge(ctx, id, count, 44 + i * 58, VIEW.height - 40, 22));
  }

  // Boss health bar with phase notches.
  const boss = state.boss;
  if (boss && !boss.dead) {
    const w = 760;
    const x = CX - w / 2;
    const y = 96;
    const ph = PHASES[boss.phase];
    panel(ctx, x - 14, y - 6, w + 28, 74, 'rgba(58,20,64,0.85)', 14);
    bigText(ctx, `${BOSS.name}  ·  PHASE ${boss.phase + 1}: ${ph.name}`, CX, y + 16, 24, ph.color);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y + 34, w, 24);
    ctx.fillStyle = ph.color;
    ctx.fillRect(x, y + 34, w * Math.max(0, boss.hp / boss.maxHp), 24);
    ctx.fillStyle = COLOR.ink;
    for (const f of BOSS.phaseAt) ctx.fillRect(x + w * f - 3, y + 30, 6, 32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + 34, w, 24);
  }

  drawHint(ctx, state, time);
  drawBanner(ctx, state);
}

function drawHint(ctx, state, time) {
  const hint = currentHint(state);
  if (!hint) return;
  const bob = Math.sin(time * 4) * 4;
  const y = VIEW.height - 104 + bob;
  panel(ctx, CX - 330, y - 52, 660, 108, 'rgba(255,255,255,0.94)', 24);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(CX - 330, y - 52, 660, 108, 24);
  ctx.stroke();
  bigText(ctx, hint.text, CX, y - 14, 40, '#29c6ff', 'center', 0.16);
  ctx.font = `24px ${FONT}`;
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = 'center';
  ctx.fillText(hint.sub, CX, y + 30);
}

function drawBanner(ctx, state) {
  const b = state.fx.banner;
  if (!b) return;
  const t = b.maxLife - b.life;
  const pop = Math.min(1, t * 6);
  const fade = Math.min(1, b.life * 3);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(CX, VIEW.height / 2 - 40);
  ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
  ctx.rotate(-0.04);
  panel(ctx, -460, -80, 920, 170, 'rgba(58,20,64,0.78)', 30);
  bigText(ctx, b.title, 0, -22, 92, b.color);
  bigText(ctx, b.subtitle, 0, 54, 36, '#ffffff');
  ctx.restore();
}

/** The title screen, drawn over a live-looking arena. */
export function drawTitle(ctx, time, best) {
  drawArena(ctx, time);
  // A parade of critters and the queen in the background.
  const fakePlayer = { x: CX, y: 470 };
  const parade = ['jellybob', 'sprinkler', 'gobstopper', 'zipper', 'jellybob', 'sprinkler'];
  parade.forEach((kind, i) => {
    const x = 120 + i * 208;
    const y = 640 + Math.sin(time * 3 + i) * 10;
    drawCritter(ctx, { kind, x, y, radius: kind === 'gobstopper' ? 44 : 30, spawn: 0, wobble: time * 5 + i, hp: 1, maxHp: 1, flash: 0, mode: 'roam', aimX: 0, aimY: 0 }, fakePlayer);
  });
  drawBoss(ctx, { x: 1125, y: 290, radius: 78, phase: 0, mode: 'move', entering: 0, flash: 0, aimX: 0, aimY: 0 }, PHASES, { x: 200, y: 300 }, time);
  drawGummo(ctx, { x: 150, y: 300, radius: 64, squash: Math.abs(Math.sin(time * 3)) * 0.4, aim: 0, dashTimer: 0, hurtFlash: 0 }, time);

  // Logo.
  const letters = 'GUMDROP';
  const colors = ['#29c6ff', '#ff5fb2', '#3ee07a', '#ffd23d', '#a66bff', '#ff9b2f', '#ff3b5c'];
  ctx.save();
  ctx.translate(CX, 150);
  ctx.rotate(-0.03);
  for (let i = 0; i < letters.length; i += 1) {
    const x = (i - 3) * 96;
    const y = Math.sin(time * 4 + i * 0.7) * 8;
    bigText(ctx, letters[i], x, y, 128, colors[i], 'center', 0.16);
  }
  bigText(ctx, 'GAUNTLET', 0, 118, 96, '#ffffff', 'center', 0.18);
  ctx.restore();

  panel(ctx, CX - 330, 330, 660, 70, 'rgba(58,20,64,0.82)', 20);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('Pop 7 waves of sour critters, grab wild upgrades,', CX, 352);
  ctx.fillText('and knock QUEEN SOURBELLE off her throne!', CX, 380);

  // Controls.
  const keys = [['W A S D', 'MOVE'], ['MOUSE', 'AIM + SHOOT'], ['SPACE', 'DASH']];
  keys.forEach(([key, label], i) => {
    const x = CX - 300 + i * 300;
    panel(ctx, x - 130, 418, 260, 72, '#ffffff', 16);
    ctx.strokeStyle = COLOR.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x - 130, 418, 260, 72, 16);
    ctx.stroke();
    bigText(ctx, key, x, 442, 28, '#29c6ff', 'center', 0.14);
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = COLOR.ink;
    ctx.fillText(label, x, 474);
  });

  const pulse = 1 + Math.sin(time * 5) * 0.05;
  ctx.save();
  ctx.translate(CX, 545);
  ctx.scale(pulse, pulse);
  panel(ctx, -280, -40, 560, 80, '#ff5fb2', 40);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-280, -40, 560, 80, 40);
  ctx.stroke();
  bigText(ctx, 'CLICK TO START', 0, 2, 46, '#ffffff');
  ctx.restore();
  if (best > 0) bigText(ctx, `BEST ${best}`, CX, 610, 28, COLOR.gold);
  bigText(ctx, 'M: mute   P: pause', VIEW.width - 20, 30, 18, '#ffffff', 'right', 0.25);
}

/** Where the three upgrade cards sit (for drawing and for clicks). */
export function cardRects() {
  const w = 330;
  const h = 360;
  const gap = 40;
  const left = CX - (w * 3 + gap * 2) / 2;
  return [0, 1, 2].map((i) => ({ x: left + i * (w + gap), y: 222, w, h }));
}

/** The between-wave upgrade pick. */
export function drawUpgradeScreen(ctx, state, time, hover) {
  ctx.fillStyle = 'rgba(58, 20, 64, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  bigText(ctx, `WAVE ${state.wave} CLEARED!`, CX, 84, 64, COLOR.gold);
  bigText(ctx, 'PICK AN UPGRADE  —  click a card or press 1 2 3', CX, 148, 28, '#ffffff');
  cardRects().forEach((r, i) => {
    const id = state.choices[i];
    if (!id) return;
    const u = upgradeById(id);
    const lift = hover === i ? -14 : Math.sin(time * 3 + i) * 3;
    ctx.save();
    ctx.translate(0, lift);
    panel(ctx, r.x, r.y, r.w, r.h, '#ffffff', 26);
    ctx.fillStyle = u.color;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, 170, [26, 26, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = hover === i ? '#ff5fb2' : COLOR.ink;
    ctx.lineWidth = hover === i ? 10 : 6;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 26);
    ctx.stroke();
    ctx.fillStyle = COLOR.ink;
    ctx.font = `100px 'Segoe UI Symbol', ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.icon, r.x + r.w / 2, r.y + 92);
    bigText(ctx, u.name, r.x + r.w / 2, r.y + 210, 32, u.color === '#ffffff' ? '#29c6ff' : u.color, 'center', 0.16);
    ctx.font = `21px ${FONT}`;
    ctx.fillStyle = COLOR.ink;
    wrap(ctx, u.text, r.x + r.w / 2, r.y + 256, r.w - 40, 28);
    const have = state.upgrades[id] ?? 0;
    const tag = u.kind === 'play' ? (have > 0 ? `LEVEL ${have + 1}` : 'NEW PLAYSTYLE') : 'STAT BOOST';
    bigText(ctx, tag, r.x + r.w / 2, r.y + 322, 20, u.kind === 'play' ? '#ff5fb2' : '#9a8aa0', 'center', 0.12);
    panel(ctx, r.x + r.w / 2 - 26, r.y - 26, 52, 52, COLOR.ink, 26);
    bigText(ctx, `${i + 1}`, r.x + r.w / 2, r.y, 30, '#ffffff');
    ctx.restore();
  });
  const next = state.wave + 1;
  bigText(ctx, next >= LAST_WAVE ? 'NEXT: THE SOUR QUEEN AWAITS...' : `NEXT: WAVE ${next} · ${WAVE_TITLES[next - 1]}`, CX, 650, 30, next >= LAST_WAVE ? '#ff5fb2' : '#ffffff');
}

function wrap(ctx, text, x, y, width, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(58, 20, 64, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  bigText(ctx, 'PAUSED', CX, VIEW.height / 2 - 30, 110, '#ffffff');
  bigText(ctx, 'P to resume  ·  Q to quit to title', CX, VIEW.height / 2 + 60, 30, COLOR.gold);
}

/** Candy confetti raining down the sides of the victory screen. */
function drawConfetti(ctx, time) {
  const colors = ['#29c6ff', '#ff5fb2', '#3ee07a', '#ffd23d', '#a66bff', '#ff9b2f'];
  for (let i = 0; i < 70; i += 1) {
    const seed = Math.sin(i * 127.1) * 43758.5453;
    const r = seed - Math.floor(seed);
    const x = (i * 97.3 + Math.sin(time + i) * 20) % VIEW.width;
    const y = ((r * VIEW.height + time * (90 + r * 120)) % (VIEW.height + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 3 + i);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
}

/** The end of a run: win or lose, the grade, the stats and the restart prompt. */
export function drawResults(ctx, state, time, best, isNewBest) {
  const won = state.outcome === 'victory';
  ctx.fillStyle = won ? 'rgba(255, 210, 61, 0.35)' : 'rgba(58, 20, 64, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (won) drawConfetti(ctx, time);
  panel(ctx, CX - 470, 40, 940, 640, 'rgba(58,20,64,0.95)', 36);
  const wobble = Math.sin(time * 3) * 0.03;
  ctx.save();
  ctx.translate(CX, 120);
  ctx.rotate(wobble);
  bigText(ctx, won ? 'SWEET VICTORY!' : 'MELTED!', 0, 0, 84, won ? COLOR.gold : '#ff5fb2');
  ctx.restore();
  bigText(ctx, won ? 'Queen Sourbelle has been dethroned!' : `Gummo melted on wave ${state.wave} · ${WAVE_TITLES[state.wave - 1]}`, CX, 196, 28, '#ffffff');

  // Grade medal.
  const g = grade(state);
  const gColor = { S: '#ffd23d', A: '#3ee07a', B: '#29c6ff', C: '#ff9b2f', D: '#ff5fb2' }[g];
  ctx.fillStyle = gColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(CX - 290, 350, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  bigText(ctx, g, CX - 290, 358, 130, '#ffffff', 'center', 0.12);
  bigText(ctx, 'RANK', CX - 290, 478, 30, gColor);

  const minutes = Math.floor(state.time / 60);
  const seconds = `${Math.floor(state.time % 60)}`.padStart(2, '0');
  const rows = [
    ['SCORE', `${state.score}`],
    ['CRITTERS POPPED', `${state.stats.kills}`],
    ['BEST COMBO', `${state.stats.bestCombo}`],
    ['HITS TAKEN', `${state.stats.hitsTaken}`],
    ['TIME', `${minutes}:${seconds}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 270 + i * 50;
    bigText(ctx, label, CX - 130, y, 28, '#ffffff', 'left', 0.12);
    bigText(ctx, value, CX + 420, y, i === 0 ? 40 : 32, i === 0 ? COLOR.gold : '#29c6ff', 'right', 0.12);
  });
  bigText(ctx, isNewBest ? `NEW BEST: ${best}!` : `BEST: ${best}`, CX + 145, 515, 28, isNewBest ? '#3ee07a' : '#c9b8d0');

  // Owned upgrades this run.
  const owned = Object.entries(state.upgrades);
  owned.forEach(([id, count], i) => upgradeBadge(ctx, id, count, CX - (owned.length - 1) * 30 + i * 60, 568, 22));

  const pulse = 1 + Math.sin(time * 5) * 0.05;
  ctx.save();
  ctx.translate(CX, 636);
  ctx.scale(pulse, pulse);
  panel(ctx, -330, -36, 660, 72, '#3ee07a', 36);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-330, -36, 660, 72, 36);
  ctx.stroke();
  bigText(ctx, 'CLICK or ENTER: PLAY AGAIN', 0, 2, 36, '#ffffff');
  ctx.restore();
}

