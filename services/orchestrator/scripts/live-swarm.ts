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
import { writeFileSync } from 'node:fs';
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
const INSF = join(ROOT, 'node_modules', '.bin', 'insforge');
const APP_DIR = process.env.LIM_APP_DIR ?? join(ROOT, 'sample-native-app');
// lim.run free/org concurrency cap is 5 iOS simulators — never exceed it, so the
// whole grid stays live (no "simulator down" from a 403 over-limit).
const MAX_SIMS = Number(process.env.LIM_MAX_SIMS) || 5;
const arg = (f: string, d: number) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && Number.isFinite(Number(process.argv[i + 1])) ? Number(process.argv[i + 1]) : d;
};

async function lim(args: string[]): Promise<string> {
  const { stdout } = await exec(LIM, args, { cwd: APP_DIR, env: process.env, maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  return stdout;
}

/** Upload a local file to the InsForge `recordings` bucket; returns the public URL. */
async function uploadFile(localPath: string, objectKey: string): Promise<string | null> {
  try {
    const { stdout } = await exec(INSF, ['storage', 'upload', localPath, '--bucket', 'recordings', '--key', objectKey, '--json'], {
      cwd: ROOT, env: process.env, maxBuffer: 16 * 1024 * 1024, timeout: 120000,
    });
    return (JSON.parse(stdout) as { url?: string }).url ?? null;
  } catch (e) {
    console.error('  upload failed', objectKey, (e as Error).message.slice(0, 80));
    return null;
  }
}

const baseUrl = process.env.INSFORGE_URL;
const key = process.env.INSFORGE_KEY;
const orKey = process.env.OPENROUTER_API_KEY;
if (!baseUrl || !key || !orKey) {
  console.error('Missing INSFORGE_URL / INSFORGE_KEY / OPENROUTER_API_KEY. Use --env-file=.env');
  process.exit(1);
}

const personaCount = arg('--size', 8); // total personas; run in waves of MAX_SIMS
const budget = arg('--budget', 3);
const writer = new InsForgeWriter({ baseUrl, key });
const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: orKey });
const rng = makeRng(Math.floor(Date.now() % 100000));
const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const runId = rng.id('run');
const specs = selectPersonas(personaCount);

// Create the run row + announce the id FIRST so a caller (e.g. the dashboard
// Unleash route) can return it immediately and subscribe while we build/provision.
const run: Run = {
  id: runId, app_id: 'sample-native', status: 'provisioning', swarm_size: specs.length,
  swarm_rating: null, started_at: now(), converged_at: null,
};
await writer.upsertRun(run);
console.log(`RUN_ID ${runId}`);

// Write ALL persona + simulator rows up front (booting) so the dashboard shows
// the full grid immediately instead of an empty "Provisioning" screen.
const units = specs.map((spec) => {
  const persona: Persona = {
    id: rng.id('persona'), run_id: runId, key: spec.key, display_name: spec.display_name,
    target_edge_cases: spec.target_edge_cases, status: 'provisioning', rating: null, review_text: null,
  };
  const simulator: Simulator = {
    id: rng.id('sim'), run_id: runId, persona_id: persona.id,
    lim_handle: 'pending', stream_url: null, status: 'booting',
  };
  return { spec, persona, simulator, iosId: '' as string };
});
for (const u of units) {
  await writer.upsertPersona(u.persona);
  await writer.upsertSimulator(u.simulator);
}
await writer.upsertRun({ ...run, status: 'running' });
console.log(`▶ run ${runId} — ${units.length} personas in waves of ${MAX_SIMS} (lim concurrency cap)…`);
console.log(`  open: http://localhost:3000/?run=${runId}`);

// Free the org concurrency cap (delete every existing sim) + clear any dead
// attached sim that would fail `xcode build`'s install step.
async function clearCap(): Promise<void> {
  try {
    const list = await lim(['ios', 'list']);
    const ids = [...new Set([...list.matchAll(/ios_[a-z0-9_]+/gi)].map((m) => m[0]))];
    for (const id of ids) await lim(['ios', 'delete', id]).catch(() => {});
  } catch { /* best-effort */ }
}
await clearCap();
try {
  await lim(['xcode', 'build', '.']);
} catch (e) {
  console.log('  build step reported non-zero (continuing):', (e as Error).message.slice(0, 100));
}

type Unit = (typeof units)[number];

async function runUnit(u: Unit): Promise<{ ok: boolean; rating: number | null }> {
  const logLines: string[] = [`# ${u.spec.display_name} — session log (run ${runId})`, `# ${u.spec.disposition}`, ''];
  try {
    await lim(['ios', 'record', 'start', '--id', u.iosId]).catch(() => {}); // session video
    const driver = new LimDriver({ cwd: APP_DIR, iosId: u.iosId });
    const r = await runPersona({
      runId, persona: u.persona, spec: u.spec, simulator: u.simulator, driver, writer,
      nextId: (p) => rng.id(p), stepBudget: budget, now,
      decide: async (obs, step) => {
        const d = await decideStep({ client: openai, spec: u.spec, observation: obs, step, budget });
        logLines.push(`[step ${step + 1}] screen=${obs.screen} → ${d.action.kind}${d.thought ? `  «${d.thought}»` : ''}`);
        for (const f of d.defects) logLines.push(`   ⚑ ${f.severity.toUpperCase()} ${f.edge_case}: ${f.title}`);
        return { action: d.action, defects: d.defects, done: d.done };
      },
    });
    logLines.push('', `# verdict: ${r.rating}/5 — "${r.review}"`);
    let videoUrl: string | null = null;
    try {
      const mp4 = `/tmp/${runId}-${u.spec.key}.mp4`;
      await lim(['ios', 'record', 'stop', '--id', u.iosId, '-o', mp4]);
      videoUrl = await uploadFile(mp4, `${runId}/${u.spec.key}.mp4`);
    } catch (e) {
      console.error(`  record/upload failed ${u.spec.key}:`, (e as Error).message.slice(0, 80));
    }
    const logf = `/tmp/${runId}-${u.spec.key}.log.txt`;
    writeFileSync(logf, logLines.join('\n'));
    const logUrl = await uploadFile(logf, `${runId}/${u.spec.key}.log.txt`);
    await writer.upsertSimulator({ ...u.simulator, video_url: videoUrl, log_url: logUrl });
    console.log(`  ✓ ${u.spec.display_name}: ${r.findings.length} findings, ${r.rating}/5${videoUrl ? ' +video' : ''}`);
    return { ok: true, rating: r.rating };
  } catch (e) {
    console.error(`  ✗ ${u.spec.display_name}:`, (e as Error).message.slice(0, 120));
    await writer.upsertPersona({ ...u.persona, status: 'crashed', rating: null, review_text: null });
    await writer.upsertSimulator({ ...u.simulator, status: 'down' });
    return { ok: false, rating: null };
  }
}

// Process personas in waves bounded by the lim concurrency cap. Each wave:
// provision (1s apart, requested) → run agents → free the sims for the next wave.
const keep = process.argv.includes('--keep');
const waves: Unit[][] = [];
for (let i = 0; i < units.length; i += MAX_SIMS) waves.push(units.slice(i, i + MAX_SIMS));
const results: Array<{ ok: boolean; rating: number | null }> = [];
for (let w = 0; w < waves.length; w += 1) {
  const wave = waves[w] as Unit[];
  if (w > 0) await clearCap();
  console.log(`▶ wave ${w + 1}/${waves.length}: provisioning ${wave.length} simulators…`);
  for (const u of wave) {
    try {
      const out = await lim(['ios', 'create', '--attach']);
      u.iosId = out.match(/ID:\s*(ios_[a-z0-9_]+)/i)?.[1] ?? '';
    } catch (e) {
      console.error(`  provision failed ${u.spec.display_name}:`, (e as Error).message.slice(0, 60));
    }
    if (u.iosId) {
      // Foreground OUR app so the agent tests it, not the iOS home screen.
      await lim(['ios', 'launch-app', 'com.limrun.sample-native', '--id', u.iosId]).catch(() => {});
      u.simulator = { ...u.simulator, lim_handle: u.iosId, status: 'live' };
      await writer.upsertSimulator(u.simulator);
    } else {
      await writer.upsertSimulator({ ...u.simulator, status: 'down' });
      await writer.upsertPersona({ ...u.persona, status: 'crashed' });
    }
    console.log(`  ${u.spec.display_name} → ${u.iosId || 'FAILED'}`);
    await sleep(1000); // 1s delay between creates (requested; avoids transient 403s)
  }
  results.push(
    ...(await Promise.all(wave.map((u) => (u.iosId ? runUnit(u) : Promise.resolve({ ok: false, rating: null as number | null }))))),
  );
  const isLast = w === waves.length - 1;
  if (!isLast || !keep) for (const u of wave) if (u.iosId) await lim(['ios', 'delete', u.iosId]).catch(() => {});
}

const ratings = results.filter((r) => r.ok && r.rating != null).map((r) => r.rating as number);
const swarmRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
await writer.upsertRun({ ...run, status: 'converged', swarm_rating: swarmRating, converged_at: now() });
console.log(`▶ converged — Swarm Rating ${swarmRating}/5. Report: http://localhost:3000/r/${runId}`);
