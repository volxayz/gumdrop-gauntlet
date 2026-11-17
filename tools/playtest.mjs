// End-to-end play test in headless Chrome with real keyboard and mouse events:
// title click → waves (autopilot decides, inputs go through the page's own listeners) → upgrade
// picks by key and by click → results → restart → pause. Reports page errors and saves snapshots.
//   node tools/playtest.mjs <snapshot dir>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const chrome = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = process.argv[2] ?? join(root, 'out', 'playtest');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', '8092'], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'gg-play-'));
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=9234', `--user-data-dir=${profile}`, '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const errors = [];

try {
  let target = null;
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200);
    try { target = (await (await fetch('http://127.0.0.1:9234/json/list')).json()).find((t) => t.type === 'page'); } catch { /* starting */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(JSON.stringify(msg.params.args));
  });
  const send = (method, params = {}) => new Promise((resolve) => { id += 1; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const snap = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    writeFileSync(join(outDir, `${name}.jpg`), Buffer.from(r.result.data, 'base64'));
    console.log(`snapshot ${name}`);
  };
  const keyCodes = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32, Enter: 13, Digit1: 49, Digit2: 50, KeyP: 80, Escape: 27, KeyE: 69 };
  const key = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: code === 'Space' ? ' ' : code.replace('Key', '').replace('Digit', ''), windowsVirtualKeyCode: keyCodes[code] });
  const tap = async (code) => { await key('keyDown', code); await sleep(30); await key('keyUp', code); };
  const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra });

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8092/?debug' });
  await sleep(1200);
  await evaluate(`import('/src/shots.js').then((m) => { window.pilot = m.autopilot; return 1; })`);
  await snap('01-title');
  await mouse('mousePressed', 640, 545);
  await mouse('mouseReleased', 640, 545);
  await sleep(500);
  console.log('after start:', await evaluate('JSON.stringify({screen: gumdropDebug.screen, mode: gumdropDebug.game && gumdropDebug.game.mode})'));

  const held = new Set();
  let mouseDown = false;
  let picks = 0;
  let snappedPlay = false;
  const started = Date.now();
  let result = null;
  while (Date.now() - started < 400000) {
    const s = JSON.parse(await evaluate(`(() => { const g = gumdropDebug.game; const c = window.pilot(g);
      return JSON.stringify({ mode: g.mode, wave: g.wave, hp: g.player.hp, score: g.score, c }); })()`));
    if (s.mode === 'upgrade') {
      for (const code of held) await key('keyUp', code);
      held.clear();
      if (mouseDown) { await mouse('mouseReleased', 640, 360); mouseDown = false; }
      await sleep(500);
      if (picks === 1) await snap('03-upgrade');
      if (picks % 2 === 0) await tap('Digit1');
      else { await mouse('mouseMoved', 640, 400); await mouse('mousePressed', 640, 400); await mouse('mouseReleased', 640, 400); }
      picks += 1;
      await sleep(300);
      continue;
    }
    if (s.mode === 'victory' || s.mode === 'defeat') { result = s; break; }
    if (!snappedPlay && s.wave === 2) { snappedPlay = true; await snap('02-play'); }
    const want = new Set();
    if (s.c.moveX > 0.3) want.add('KeyD');
    if (s.c.moveX < -0.3) want.add('KeyA');
    if (s.c.moveY > 0.3) want.add('KeyS');
    if (s.c.moveY < -0.3) want.add('KeyW');
    for (const code of held) if (!want.has(code)) { await key('keyUp', code); held.delete(code); }
    for (const code of want) if (!held.has(code)) { await key('keyDown', code); held.add(code); }
    await mouse('mouseMoved', s.c.aimX, s.c.aimY, { buttons: mouseDown ? 1 : 0 });
    if (!mouseDown) { await mouse('mousePressed', s.c.aimX, s.c.aimY); mouseDown = true; }
    if (s.c.dash) await tap('Space');
    if (s.c.dejavu) await tap('KeyE');
    if (s.mode === 'play' && s.wave === 8 && !result) {
      const bossShot = await evaluate('gumdropDebug.game.boss && gumdropDebug.game.boss.phase');
      if (bossShot === 2 && !held.has('snapBoss')) { held.add('snapBoss'); await snap('04-boss-phase3'); held.delete('snapBoss'); }
    }
    await sleep(25);
  }
  for (const code of held) await key('keyUp', code);
  if (mouseDown) await mouse('mouseReleased', 640, 360);
  console.log('run ended:', JSON.stringify(result), 'picks', picks);
  console.log('deja vu:', await evaluate('JSON.stringify({ unleashed: gumdropDebug.game.stats.dejavus, barrageKills: gumdropDebug.game.stats.dejavuKills, echoesLeft: gumdropDebug.game.dejavu.echoes.length })'));
  await sleep(1500);
  await snap('05-results');
  await tap('Enter');
  await sleep(600);
  console.log('after restart:', await evaluate('JSON.stringify({screen: gumdropDebug.screen, mode: gumdropDebug.game.mode, wave: gumdropDebug.game.wave, hp: gumdropDebug.game.player.hp, score: gumdropDebug.game.score})'));
  await tap('KeyP');
  await sleep(300);
  await snap('06-pause');
  console.log('paused:', await evaluate('gumdropDebug.paused'));
  await tap('KeyP');
  console.log('audio:', await evaluate(`(() => { try { return typeof AudioContext; } catch (e) { return String(e); } })()`));
  ws.close();
} finally {
  browser.kill();
  server.kill();
  console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
}
