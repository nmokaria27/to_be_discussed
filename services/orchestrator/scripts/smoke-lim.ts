/**
 * Real smoke test (Epic 5, bounded): run ONE persona against a live lim.run iOS
 * simulator via LimDriver, writing a real run + finding(s) + review to InsForge.
 * Proves the real device-control + write path end-to-end (1 persona = tiny quota).
 *
 *   node --env-file=.env services/orchestrator/scripts/smoke-lim.ts
 *
 * Requires: a built+attached lim iOS simulator (lim xcode build . ; lim ios
 * create --attach) and INSFORGE_URL/INSFORGE_KEY (admin) in .env.
 */

import { InsForgeWriter, makeRng, PERSONA_BY_KEY } from '@swarm/shared';
import type { Persona, Run, Simulator } from '@swarm/shared';
import { LimDriver } from '../../../agents/persona/src/limDriver.ts';
import { runPersona } from '../../../agents/persona/src/personaAgent.ts';

const baseUrl = process.env.INSFORGE_URL;
const key = process.env.INSFORGE_KEY;
if (!baseUrl || !key) {
  console.error('Missing INSFORGE_URL / INSFORGE_KEY (admin). Use --env-file=.env');
  process.exit(1);
}

const appCwd = process.env.LIM_APP_DIR ?? `${process.cwd()}/sample-native-app`;
const iosId = process.env.LIM_IOS_ID; // optional; defaults to last-created

const writer = new InsForgeWriter({ baseUrl, key });
const rng = makeRng(2026);
const now = () => new Date().toISOString();
const runId = rng.id('run');
const spec = PERSONA_BY_KEY['empty_state']!;

const run: Run = {
  id: runId,
  app_id: 'sample-native',
  status: 'provisioning',
  swarm_size: 1,
  swarm_rating: null,
  started_at: now(),
  converged_at: null,
};
await writer.upsertRun(run);

const persona: Persona = {
  id: rng.id('persona'),
  run_id: runId,
  key: spec.key,
  display_name: spec.display_name,
  target_edge_cases: spec.target_edge_cases,
  status: 'provisioning',
  rating: null,
  review_text: null,
};
const simulator: Simulator = {
  id: rng.id('sim'),
  run_id: runId,
  persona_id: persona.id,
  lim_handle: iosId ?? 'lim-last-created',
  stream_url: null,
  status: 'booting',
};
await writer.upsertPersona(persona);
await writer.upsertSimulator(simulator);
await writer.upsertRun({ ...run, status: 'running' });

console.log('Driving real lim simulator with persona:', spec.display_name, '…');
const driver = new LimDriver({ cwd: appCwd, iosId });
const result = await runPersona({ runId, persona, spec, simulator, driver, writer, nextId: (p) => rng.id(p), stepBudget: 3, now });

const swarmRating = result.rating;
await writer.upsertRun({ ...run, status: 'converged', swarm_rating: swarmRating, converged_at: now() });

console.log('Smoke run complete:');
console.log(`  run        ${runId}  rating=${swarmRating}/5`);
console.log(`  findings   ${result.findings.length}`);
result.findings.forEach((f) => console.log(`   - [${f.severity}] ${f.edge_case}: ${f.title} @ ${f.screen_key}`));
console.log(`  review     "${result.review}"`);
console.log(`  report     /r/${runId}`);
