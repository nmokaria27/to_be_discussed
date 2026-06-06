/**
 * Seed a converged run into the real InsForge backend through the InsForgeWriter
 * seam — the exact path Dev A's real agents will use. Proves the live read path
 * (report + dashboard) end-to-end without the real swarm.
 *
 *   node --env-file=.env packages/shared/scripts/seed-insforge.ts [--seed N] [--size N]
 */

import { generateSnapshot } from '../src/fake-swarm.ts';
import { InsForgeWriter } from '../src/insforge-writer.ts';
import { writeSnapshot } from '../src/fake-swarm.ts';

function arg(flag: string, dflt: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return dflt;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : dflt;
}

const baseUrl = process.env.INSFORGE_URL;
const key = process.env.INSFORGE_KEY;
if (!baseUrl || !key) {
  console.error('Missing INSFORGE_URL / INSFORGE_KEY. Run with: node --env-file=.env ...');
  process.exit(1);
}

const seed = arg('--seed', 42);
const swarmSize = arg('--size', 12);
const snapshot = generateSnapshot({ seed, swarmSize });
const writer = new InsForgeWriter({ baseUrl, key });

await writeSnapshot(writer, snapshot);

console.log('Seeded InsForge:');
console.log(`  run       ${snapshot.run.id}  rating=${snapshot.run.swarm_rating}/5`);
console.log(`  personas  ${snapshot.personas.length}`);
console.log(`  findings  ${snapshot.findings.length}`);
console.log(`  report    /r/${snapshot.run.id}`);
