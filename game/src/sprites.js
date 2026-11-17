// Hand-drawn canvas characters: Gummo the hero, the sour critters and Queen Sourbelle.
// Chunky outlines and big eyes so every character reads even in a tiny screenshot.
import { COLOR, ENEMY } from './config.js';

const INK = COLOR.ink;

/** Two big cartoon eyes looking toward `look` (radians). */
function eyes(ctx, x, y, size, spread, look, angry = false) {
  for (const side of [-1, 1]) {
    const ex = x + side * spread;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, size * 0.22);
    ctx.beginPath();
    ctx.ellipse(ex, y, size * 0.8, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + Math.cos(look) * size * 0.35, y + Math.sin(look) * size * 0.4, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    if (angry) {
      ctx.lineWidth = Math.max(3, size * 0.35);
      ctx.beginPath();
      ctx.moveTo(ex - side * size * 0.9, y - size * 0.7);
      ctx.lineTo(ex + side * size * 0.7, y - size * 1.3);
      ctx.stroke();
    }
  }
}

/** Gummo, a sugar-coated blue gumdrop. */
export function drawGummo(ctx, p, time) {
  const r = p.radius;
  const stretch = 1 + p.squash * 0.18;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow.
  ctx.fillStyle = 'rgba(58, 20, 64, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 1.05, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.dashTimer > 0) ctx.rotate(Math.atan2(p.dashY, p.dashX) * 0.15);
  ctx.scale(stretch, 2 - stretch);
  const blink = p.hurtFlash > 0 && Math.floor(time * 30) % 2 === 0;
  ctx.fillStyle = blink ? '#ffffff' : COLOR.hero;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, r * 0.8);
  ctx.bezierCurveTo(-r * 1.15, -r * 0.4, -r * 0.6, -r * 1.25, 0, -r * 1.25);
  ctx.bezierCurveTo(r * 0.6, -r * 1.25, r * 1.15, -r * 0.4, r * 1.05, r * 0.8);
  ctx.quadraticCurveTo(0, r * 1.02, -r * 1.05, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shine and sugar crystals.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.45, -r * 0.6, r * 0.18, r * 0.35, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [sx, sy] of [[0.5, -0.5], [0.7, 0.2], [-0.7, 0.3], [0.1, 0.55], [-0.2, -0.9]]) ctx.fillRect(sx * r - 2, sy * r - 2, 4, 4);
  eyes(ctx, 0, -r * 0.2, r * 0.26, r * 0.36, p.aim);
  // Smile.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, r * 0.25, r * 0.22, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();

  // Little candy blaster pointing at the aim.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.aim);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(r * 0.75, -8, 26, 16, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5fb2';
  ctx.fillRect(r * 0.75 + 8, -8, 6, 16);
  ctx.restore();
}

function blob(ctx, r, wobble, color, dark) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r * (1 + 0.07 * Math.sin(a * 3 + wobble));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.9;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.8, r * 0.35, 0, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** One sour critter, by kind. */
export function drawCritter(ctx, e, player) {
  const type = ENEMY[e.kind];
  const r = e.radius;
  const look = Math.atan2(player.y - e.y, player.x - e.x);
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.spawn > 0) {
    // A swirling candy portal shows where it will appear.
    const k = 1 - e.spawn / 0.75;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 6;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.6 - k * 0.6), e.wobble, e.wobble + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = k;
    ctx.scale(k, k);
  }
  ctx.fillStyle = 'rgba(58, 20, 64, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.kind === 'jellybob' || e.kind === 'minigob' || e.kind === 'gobstopper') {
    const squish = e.kind === 'jellybob' ? 1 + 0.12 * Math.sin(e.wobble * 1.5) : 1;
    ctx.scale(squish, 2 - squish);
    blob(ctx, r, e.wobble, type.color, type.dark);
    if (e.kind !== 'jellybob') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, -2.4, -0.7);
      ctx.stroke();
      ctx.strokeStyle = type.dark;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0.6, 2.5);
      ctx.stroke();
    }
    eyes(ctx, 0, -r * 0.12, r * 0.24, r * 0.33, look, true);
  } else if (e.kind === 'sprinkler') {
    // A frosted donut with a mean face on its icing.
    ctx.rotate(Math.sin(e.wobble * 0.5) * 0.2);
    ctx.fillStyle = '#f4b56a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = type.color;
    ctx.beginPath();
    for (let i = 0; i <= 20; i += 1) {
      const a = (i / 20) * Math.PI * 2;
      const rr = r * (0.84 + 0.06 * Math.sin(a * 5));
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.fill();
    const sprinkles = ['#ffffff', '#ffe23d', '#29c6ff', '#3ee07a'];
    for (let i = 0; i < 10; i += 1) {
      const a = i * 2.4;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
      ctx.rotate(a * 3);
      ctx.fillStyle = sprinkles[i % 4];
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }
    eyes(ctx, 0, -r * 0.05, r * 0.24, r * 0.32, look, true);
  } else if (e.kind === 'zipper') {
    // A licorice wheel that spins up before it charges.
    if (e.mode === 'windup') {
      ctx.save();
      ctx.rotate(Math.atan2(e.aimY, e.aimX));
      ctx.fillStyle = 'rgba(255, 59, 92, 0.25)';
      ctx.fillRect(0, -r * 0.8, 380, r * 1.6);
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 4;
      ctx.setLineDash([16, 10]);
      ctx.strokeRect(0, -r * 0.8, 380, r * 1.6);
      ctx.setLineDash([]);
      ctx.restore();
    }
    const spin = e.mode === 'roam' ? e.wobble * 0.3 : e.wobble * 2.5;
    ctx.save();
    ctx.rotate(spin);
    ctx.fillStyle = type.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = type.dark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.2) {
      const rr = (a / (Math.PI * 6)) * r * 0.85;
      if (a === 0) ctx.moveTo(0, 0); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.restore();
    eyes(ctx, 0, -r * 0.1, r * 0.25, r * 0.34, look, true);
  }

  if (e.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  if (e.hp < e.maxHp && e.spawn <= 0) {
    const w = r * 1.6;
    ctx.fillStyle = INK;
    ctx.fillRect(e.x - w / 2 - 2, e.y - r - 18, w + 4, 10);
    ctx.fillStyle = type.color;
    ctx.fillRect(e.x - w / 2, e.y - r - 16, w * Math.max(0, e.hp / e.maxHp), 6);
  }
}

/** Queen Sourbelle: a giant lemon drop with a crown; her colour and face follow her phase. */
export function drawBoss(ctx, boss, phases, player, time) {
  const ph = phases[boss.phase];
  const r = boss.radius;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  if (boss.entering > 0) {
    const k = 1 - boss.entering / 1.6;
    ctx.translate(0, -(1 - k) * 300);
  }
  if (boss.mode === 'windup' && boss.phase === 2) {
    ctx.save();
    ctx.rotate(Math.atan2(boss.aimY, boss.aimX));
    ctx.fillStyle = 'rgba(255, 59, 92, 0.28)';
    ctx.fillRect(0, -r, 1400, r * 2);
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = 6;
    ctx.setLineDash([22, 12]);
    ctx.strokeRect(0, -r, 1400, r * 2);
    ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(58, 20, 64, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const throb = 1 + Math.sin(time * (4 + boss.phase * 3)) * 0.03;
  ctx.scale(throb * 1.12, throb * 0.95);
  if (boss.phase === 2) ctx.rotate(Math.sin(time * 20) * 0.03);
  // Lemon body with pointed tips.
  ctx.fillStyle = ph.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-r * 1.2, 0);
  ctx.bezierCurveTo(-r * 1.0, -r * 1.05, r * 1.0, -r * 1.05, r * 1.2, 0);
  ctx.bezierCurveTo(r * 1.0, r * 1.05, -r * 1.0, r * 1.05, -r * 1.2, 0);
  ctx.closePath();
  ctx.fill();
  if (boss.flash > 0) {
    // Hit flash: a quick white glaze over her own colour.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.45, -r * 0.45, r * 0.3, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ph.dark;
  for (const [sx, sy] of [[0.6, 0.3], [0.3, 0.55], [-0.5, 0.45], [0.75, -0.2]]) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Face.
  const look = Math.atan2(player.y - boss.y, player.x - boss.x);
  eyes(ctx, 0, -r * 0.15, r * 0.2, r * 0.36, look, true);
  ctx.fillStyle = INK;
  ctx.beginPath();
  if (boss.phase === 0) {
    ctx.ellipse(0, r * 0.35, r * 0.28, r * 0.09, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-r * 0.4, r * 0.28);
    for (let i = 0; i <= 8; i += 1) ctx.lineTo(-r * 0.4 + (i / 8) * r * 0.8, r * 0.28 + (i % 2 === 0 ? 0 : r * (boss.phase === 2 ? 0.22 : 0.14)));
    ctx.lineTo(r * 0.4, r * 0.5);
    ctx.lineTo(-r * 0.4, r * 0.5);
  }
  ctx.fill();
  // Crown (cracks as she weakens).
  ctx.save();
  ctx.translate(0, -r * 0.9);
  ctx.rotate(boss.phase === 2 ? -0.25 : 0);
  ctx.fillStyle = COLOR.gold;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, 0);
  ctx.lineTo(-r * 0.55, -r * 0.5);
  ctx.lineTo(-r * 0.25, -r * 0.22);
  ctx.lineTo(0, -r * 0.6);
  ctx.lineTo(r * 0.25, -r * 0.22);
  ctx.lineTo(r * 0.55, -r * 0.5);
  ctx.lineTo(r * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const gems = ['#ff3b5c', '#29c6ff', '#3ee07a'];
  gems.forEach((g, i) => {
    if (i < boss.phase) return;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc((i - 1) * r * 0.28, -r * 0.12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  if (boss.phase > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.5);
    ctx.lineTo(r * 0.05, -r * 0.3);
    ctx.lineTo(-r * 0.05, -r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}
