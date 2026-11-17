// Juice: screen shake, hit-stop, flashes, particles, floating text and big banners.

export function createEffects() {
  return { shake: 0, shakeX: 0, shakeY: 0, hitStop: 0, flash: 0, flashColor: '#ffffff', particles: [], texts: [], banner: null };
}

/** Kick the camera; strength in pixels, it decays on its own. */
export function addShake(fx, strength) {
  fx.shake = Math.min(28, Math.max(fx.shake, strength));
}

/** Freeze the action for a few frames so a big hit lands. */
export function addHitStop(fx, seconds) {
  fx.hitStop = Math.max(fx.hitStop, seconds);
}

export function addFlash(fx, color, strength = 0.6) {
  fx.flash = Math.max(fx.flash, strength);
  fx.flashColor = color;
}

/** A burst of round candy crumbs. */
export function burst(fx, rng, x, y, color, count, speed = 260, size = 7) {
  for (let i = 0; i < count; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const velocity = rng.range(speed * 0.3, speed);
    fx.particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: rng.range(0.35, 0.8),
      maxLife: 0.8,
      size: rng.range(size * 0.5, size * 1.3),
      color,
      ring: false,
    });
  }
}

/** An expanding ring, used for explosions and phase changes. */
export function ring(fx, x, y, color, radius, life = 0.4) {
  fx.particles.push({ x, y, vx: 0, vy: 0, life, maxLife: life, size: radius, color, ring: true });
}

/** Floating text such as "+300" or "x4 COMBO!". */
export function floatText(fx, x, y, text, color, size = 28) {
  fx.texts.push({ x, y, text, color, size, life: 0.9 });
}

/** A big centred announcement ("WAVE 3", "PHASE 2"). */
export function showBanner(fx, title, subtitle, color, seconds = 2.2) {
  fx.banner = { title, subtitle, color, life: seconds, maxLife: seconds };
}

export function updateEffects(fx, rng, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 60);
  fx.shakeX = fx.shake > 0 ? rng.range(-fx.shake, fx.shake) : 0;
  fx.shakeY = fx.shake > 0 ? rng.range(-fx.shake, fx.shake) : 0;
  fx.flash = Math.max(0, fx.flash - dt * 2.5);
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  if (fx.particles.length > 600) fx.particles.splice(0, fx.particles.length - 600);
  for (const t of fx.texts) { t.life -= dt; t.y -= 50 * dt; }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  if (fx.banner) {
    fx.banner.life -= dt;
    if (fx.banner.life <= 0) fx.banner = null;
  }
}
