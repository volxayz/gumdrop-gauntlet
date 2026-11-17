// Gumdrop Gauntlet: every tuning number and colour in one place.

/** The logical screen. The canvas is scaled to the window, but the game always thinks in 1280×720. */
export const VIEW = { width: 1280, height: 720 };

/** The candy arena the fight happens in (inside a frosting wall). */
export const ARENA = { left: 40, top: 96, right: 1240, bottom: 690 };

/** Fixed simulation step, seconds. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 30,
  speed: 330,
  maxHp: 5,
  fireDelay: 0.2,
  shotSpeed: 820,
  shotDamage: 10,
  shotRadius: 9,
  dashSpeed: 980,
  dashTime: 0.17,
  dashCooldown: 0.9,
  hurtInvulnerable: 1.1,
};

/** Enemy archetypes. hp, speed, radius, contact damage, score. */
export const ENEMY = {
  jellybob: { hp: 30, speed: 135, radius: 26, score: 100, color: '#3ee07a', dark: '#1d9a4c' },
  sprinkler: { hp: 48, speed: 90, radius: 28, score: 150, color: '#ff5fb2', dark: '#c02a7c', fireDelay: 1.8 },
  gobstopper: { hp: 150, speed: 70, radius: 44, score: 300, color: '#ff9b2f', dark: '#c4620a' },
  minigob: { hp: 26, speed: 165, radius: 20, score: 60, color: '#ffc061', dark: '#c4620a' },
  zipper: { hp: 52, speed: 100, radius: 27, score: 200, color: '#a66bff', dark: '#6331c4', chargeSpeed: 640 },
};

export const BOSS = {
  name: 'QUEEN SOURBELLE',
  hp: 6000,
  radius: 84,
  score: 5000,
  /** HP fractions at which the next phase starts. */
  phaseAt: [2 / 3, 1 / 3],
};

/** Waves 1..7 are critter waves, wave 8 is the boss. */
export const LAST_WAVE = 8;

export const COMBO = { window: 2.2, maxMultiplier: 8 };

/** The candy palette. */
export const COLOR = {
  sky: '#ffe9f5',
  floorA: '#ffd6ec',
  floorB: '#ffc4e1',
  wall: '#ff7ab8',
  wallLight: '#ffffff',
  ink: '#3a1440',
  hero: '#29c6ff',
  heroDark: '#0b7fb8',
  shot: '#ffffff',
  shotGlow: '#29c6ff',
  bullet: '#ffe23d',
  bulletEdge: '#d4380d',
  heart: '#ff3b5c',
  gold: '#ffd23d',
  hudPanel: 'rgba(58, 20, 64, 0.82)',
};

export const FONT = "'Arial Black', 'Segoe UI Black', 'Trebuchet MS', system-ui, sans-serif";
