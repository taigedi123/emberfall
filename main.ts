// Emberfall's entrypoint (Node 22, standard library only). The game itself
// is the plain static files under game/ — game/index.html plus its ES
// modules, no library and no network request — and this program is what
// hands them in: it stages game/ and screenshots/ into the output
// directory and writes dossier.json there, the summary the judge reads,
// using the vendored make.fun library under vendor/.
//
// Play it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, from the kit's reference/gate.json. Only
// text_max_bytes shapes the dossier's bytes; the rest refuse an entry the
// scorer would refuse anyway, so they are checked here first with a clear
// message instead of a silent rejection later.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function main() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const gameDir = join(here, 'game');
  const tally = countFiles(gameDir);
  if (tally.files > CAPS.game_max_files) {
    throw new Error(`game/ holds ${tally.files} files, over the ${CAPS.game_max_files} cap`);
  }
  if (tally.bytes > CAPS.game_max_bytes) {
    throw new Error(`game/ is ${tally.bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
  }

  mkdirSync(out, { recursive: true });
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  const shotsOut = join(out, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsDir = join(here, 'screenshots');
  if (existsSync(shotsDir)) cpSync(shotsDir, shotsOut, { recursive: true });

  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  const shotNames = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name))
    : [];
  console.log(
    `staged ${tally.files} game files (${tally.bytes} bytes), ` +
      `${shotNames.length} screenshot(s) and a ${Buffer.byteLength(dossier)}-byte dossier into ${out}`,
  );
}

main();
