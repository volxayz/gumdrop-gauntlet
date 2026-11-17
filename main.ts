// Gumdrop Gauntlet — make.fun best-game-01 entry program (Node 22, standard library only).
//
// The game itself lives in game/: plain static files (index.html plus ES modules under game/src)
// that a desktop browser opens offline. This program hands the entry in: it copies game/ and the
// maker's screenshots/ to the output directory and writes dossier.json with the kit's vendored
// buildDossier, unchanged, so the gate can rebuild the same bytes.
//
// Play locally:   node serve.ts   then open http://localhost:8080
// Hand in locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy one top-level folder of the repository into the output, if it exists. */
function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  mkdirSync(join(outputDir, name), { recursive: true });
  if (existsSync(from)) cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

// The scorer's caps: 160 KiB of source text, at most 4 screenshots of 256 KiB, and game/ within
// 993 entries, 48 MiB and 1000-byte paths.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
