// Keyboard and mouse, read into one plain object the simulation can use (and a bot can fake).
import { VIEW } from './config.js';

/** A fresh, idle control state: what the simulation reads every step. */
export function emptyControls() {
  return { moveX: 0, moveY: 0, aimX: VIEW.width / 2, aimY: 0, fire: false, dash: false };
}

/** Wire up the page's keyboard and mouse. Returns { controls(), pressed(code), mouse, clicked() }. */
export function createInput(canvas, toLogical) {
  const down = new Set();
  const fresh = new Set();
  const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, left: false, right: false, clicks: 0 };

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!down.has(event.code)) fresh.add(event.code);
    down.add(event.code);
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => { down.clear(); mouse.left = false; mouse.right = false; });

  const track = (event) => {
    const point = toLogical(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
  };
  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', (event) => {
    track(event);
    if (event.button === 0) { mouse.left = true; mouse.clicks += 1; }
    if (event.button === 2) { mouse.right = true; fresh.add('MouseRight'); }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) mouse.left = false;
    if (event.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const held = (...codes) => codes.some((code) => down.has(code));

  return {
    mouse,
    /** True once for each fresh press of any of the codes. */
    pressed(...codes) {
      let hit = false;
      for (const code of codes) if (fresh.has(code)) { fresh.delete(code); hit = true; }
      return hit;
    },
    /** True once per left click since the last call. */
    clicked() {
      const hit = mouse.clicks > 0;
      mouse.clicks = 0;
      return hit;
    },
    /** Forget presses nobody read this frame. */
    endFrame() { fresh.clear(); },
    controls() {
      return {
        moveX: (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0),
        moveY: (held('KeyS', 'ArrowDown') ? 1 : 0) - (held('KeyW', 'ArrowUp') ? 1 : 0),
        aimX: mouse.x,
        aimY: mouse.y,
        fire: mouse.left || held('KeyJ'),
        dash: fresh.has('Space') || fresh.has('ShiftLeft') || fresh.has('MouseRight'),
      };
    },
  };
}
