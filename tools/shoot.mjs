// Takes the entry's screenshots: serves game/, opens each ?shot= scene from shots.json in
// headless Chrome over the DevTools protocol, and saves a 1280×720 JPEG of the game's own render.
//   node tools/shoot.mjs [--preview <dir>]   (Chrome path from CHROME or the default Windows install)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const chrome = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const previewIndex = process.argv.indexOf('--preview');
const outDir = previewIndex > 0 ? process.argv[previewIndex + 1] : join(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', '8091'], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'gg-chrome-'));
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=9233', `--user-data-dir=${profile}`, '--window-size=1280,720', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });

try {
  let target = null;
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200);
    try {
      const list = await (await fetch('http://127.0.0.1:9233/json/list')).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    id += 1;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  for (const shot of shots) {
    await send('Page.navigate', { url: `http://localhost:8091/${shot.query}` });
    for (let i = 0; i < 100; i += 1) {
      await sleep(100);
      const r = await send('Runtime.evaluate', { expression: 'document.body && document.body.dataset.shotReady', returnByValue: true });
      if (r.result?.result?.value === 'yes') break;
    }
    await sleep(150);
    let quality = 88;
    let bytes;
    do {
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality });
      bytes = Buffer.from(r.result.data, 'base64');
      quality -= 6;
    } while (bytes.length > 250 * 1024 && quality > 40);
    const file = join(outDir, shot.name);
    writeFileSync(file, bytes);
    console.log(`${shot.name}: ${statSync(file).size} bytes (q${quality + 6})`);
  }
  ws.close();
} finally {
  browser.kill();
  server.kill();
}
