/**
 * Fake Swarm seeder (C9 CLI).
 *
 * Default: writes deterministic JSON fixtures to packages/shared/fixtures/ so the
 * Dashboard and Report Site can develop with ZERO backend dependency.
 *
 *   npm run seed                 # write fixtures (seed=42, swarmSize=12)
 *   npm run seed -- --size 8     # smaller swarm
 *   npm run seed -- --seed 7     # different deterministic run
 *
 * When the real InsForge SDK + creds exist, Dev B adds an InsForgeWriter and this
 * same data can be pushed live via writeSnapshot(writer, snapshot).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSONA_CATALOG } from '../src/personas.ts';
import { generateSnapshot, generateTimeline } from '../src/fake-swarm.ts';

function arg(flag: string, dflt: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return dflt;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : dflt;
}

const seed = arg('--seed', 42);
const swarmSize = arg('--size', 12);

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'fixtures');
mkdirSync(outDir, { recursive: true });

const snapshot = generateSnapshot({ seed, swarmSize });
const timeline = generateTimeline({ seed, swarmSize });

const write = (name: string, data: unknown) => {
  const path = join(outDir, name);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  return path;
};

write('run-snapshot.json', snapshot);
write('run-timeline.json', timeline);
write('personas-catalog.json', PERSONA_CATALOG);

const findingCount = snapshot.findings.length;
console.log(`Fake Swarm seeded (seed=${seed}, size=${swarmSize}):`);
console.log(`  run            ${snapshot.run.id}  rating=${snapshot.run.swarm_rating}/5`);
console.log(`  personas       ${snapshot.personas.length}`);
console.log(`  findings       ${findingCount}`);
console.log(`  timeline beats ${timeline.length}`);
console.log(`  -> ${outDir}`);
