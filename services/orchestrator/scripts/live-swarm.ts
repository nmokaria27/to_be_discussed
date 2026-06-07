/**
 * LIVE agentic swarm (real, end-to-end). Provisions N real lim.run iOS
 * simulators, runs one LLM-driven persona agent per simulator (the agent DECIDES
 * its own flow via the InsForge Model Gateway / OpenRouter vision model), writes
 * findings + reviews to InsForge, and converges. The dashboard (opened at the
 * printed /?run=<id> URL) shows the real device frames + findings live.
 *
 *   node --env-file=.env services/orchestrator/scripts/live-swarm.ts [--size N]
 *
 * Env: INSFORGE_URL, INSFORGE_KEY (admin), OPENROUTER_API_KEY, LIM_APP_DIR.
 * Bounded by --size (default 2) to control real spend.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import OpenAI from 'openai';
import { InsForgeWriter, makeRng, selectPersonas } from '@swarm/shared';
import type { Persona, Run, Simulator } from '@swarm/shared';
import { LimDriver } from '../../../agents/persona/src/limDriver.ts';
import { runPersona } from '../../../agents/persona/src/personaAgent.ts';
import { decideStep } from '../../../agents/persona/src/agentBrain.ts';

const exec = promisify(execFile);
const ROOT = join(import.meta.dirname, '..', '..', '..');
const LIM = join(ROOT, 'node_modules', '.bin', 'lim');
const APP_DIR = process.env.LIM_APP_DIR ?? join(ROOT, 'sample-native-app');
const arg = (f: string, d: number) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && Number.isFinite(Number(process.argv[i + 1])) ? Number(process.argv[i + 1]) : d;
};

async function lim(args: string[]): Promise<string> {
  const { stdout } = await exec(LIM, args, { cwd: APP_DIR, env: process.env, maxBuffer: 32 * 1024 * 1024, timeout: 300000 });
  return stdout;
}

const baseUrl = process.env.INSFORGE_URL;
const key = process.env.INSFORGE_KEY;
const orKey = process.env.OPENROUTER_API_KEY;
if (!baseUrl || !key || !orKey) {
  console.error('Missing INSFORGE_URL / INSFORGE_KEY / OPENROUTER_API_KEY. Use --env-file=.env');
  process.exit(1);
}

const size = arg('--size', 2);
const budget = arg('--budget', 3);
const writer = new InsForgeWriter({ baseUrl, key });
const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: orKey });
const rng = makeRng(Math.floor(Date.now() % 100000));
const now = () => new Date().toISOString();
const runId = rng.id('run');
const specs = selectPersonas(size);

console.log(`▶ live-swarm: building app + provisioning ${size} real iOS simulators…`);
await lim(['xcode', 'build', '.']);

const run: Run = {
  id: runId, app_id: 'sample-native', status: 'provisioning', swarm_size: specs.length,
  swarm_rating: null, started_at: now(), converged_at: null,
};
await writer.upsertRun(run);

// Provision one real simulator per persona.
const units = [];
for (const spec of specs) {
  const persona: Persona = {
    id: rng.id('persona'), run_id: runId, key: spec.key, display_name: spec.display_name,
    target_edge_cases: spec.target_edge_cases, status: 'provisioning', rating: null, review_text: null,
  };
  await writer.upsertPersona(persona);
  let iosId = '';
  try {
    const out = await lim(['ios', 'create', '--attach']);
    iosId = (out.match(/ID:\s*(ios_[a-z0-9_]+)/i)?.[1]) ?? '';
  } catch (e) {
    console.error(`  sim provision failed for ${spec.display_name}:`, (e as Error).message);
  }
  const simulator: Simulator = {
    id: rng.id('sim'), run_id: runId, persona_id: persona.id,
    lim_handle: iosId || 'unprovisioned', stream_url: null,
    status: iosId ? 'live' : 'down',
  };
  await writer.upsertSimulator(simulator);
  console.log(`  ${spec.display_name} → ${iosId || 'FAILED'}`);
  units.push({ spec, persona, simulator, iosId });
}

await writer.upsertRun({ ...run, status: 'running' });
console.log(`▶ run ${runId} — agents exploring (LLM-decided flows)… open:\n  http://localhost:3000/?run=${runId}\n`);

const results = await Promise.all(
  units.map(async (u) => {
    if (!u.iosId) return { ok: false, rating: null as number | null };
    try {
      const driver = new LimDriver({ cwd: APP_DIR, iosId: u.iosId });
      const r = await runPersona({
        runId, persona: u.persona, spec: u.spec, simulator: u.simulator, driver, writer,
        nextId: (p) => rng.id(p), stepBudget: budget, now,
        decide: async (obs, step) => {
          const d = await decideStep({ client: openai, spec: u.spec, observation: obs, step, budget });
          return { action: d.action, defects: d.defects, done: d.done };
        },
      });
      console.log(`  ✓ ${u.spec.display_name}: ${r.findings.length} findings, ${r.rating}/5`);
      return { ok: true, rating: r.rating };
    } catch (e) {
      console.error(`  ✗ ${u.spec.display_name}:`, (e as Error).message);
      await writer.upsertPersona({ ...u.persona, status: 'crashed', rating: null, review_text: null });
      await writer.upsertSimulator({ ...u.simulator, status: 'down' });
      return { ok: false, rating: null as number | null };
    }
  }),
);

const ratings = results.filter((r) => r.ok && r.rating != null).map((r) => r.rating as number);
const swarmRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
await writer.upsertRun({ ...run, status: 'converged', swarm_rating: swarmRating, converged_at: now() });
console.log(`▶ converged — Swarm Rating ${swarmRating}/5. Report: http://localhost:3000/r/${runId}`);

// Teardown (cost guardrail). Comment out to keep sims for live frame viewing.
const keep = process.argv.includes('--keep');
if (!keep) {
  for (const u of units) if (u.iosId) await lim(['ios', 'delete', u.iosId]).catch(() => {});
  console.log('▶ simulators torn down (use --keep to leave them up for live-frame viewing).');
}
