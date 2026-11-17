// Balance check: let the screenshot autopilot play whole runs in Node and report how far it gets.
//   node tools/simulate.mjs [runs]
import { buildShotScene } from '../game/src/shots.js';

const runs = Number(process.argv[2] || 8);
for (let seed = 1; seed <= runs; seed += 1) {
  const started = Date.now();
  const scene = buildShotScene('results', seed);
  const g = scene.game;
  const boss = g.boss ? `boss hp ${Math.round(g.boss.hp)} phase ${g.boss.phase + 1}` : 'no boss';
  console.log(`seed ${seed}: ${g.mode} wave ${g.wave} score ${g.score} kills ${g.stats.kills} hits ${g.stats.hitsTaken} time ${g.time.toFixed(0)}s ${boss} upgrades ${JSON.stringify(g.upgrades)} (${Date.now() - started} ms)`);
}
