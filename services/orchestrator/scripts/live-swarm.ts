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

const size = Math.min(arg('--size', MAX_SIMS), MAX_SIMS);
const budget = arg('--budget', 3);
const writer = new InsForgeWriter({ baseUrl, key });
const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: orKey });
const rng = makeRng(Math.floor(Date.now() % 100000));
const now = () => new Date().toISOString();
const runId = rng.id('run');
const specs = selectPersonas(size);

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
console.log(`▶ run ${runId} — grid up; building + provisioning ${size} real iOS simulators…`);
console.log(`  open: http://localhost:3000/?run=${runId}`);

// Clear any stale (dead) attached simulator so `xcode build` doesn't fail on its
// install step (404 folder-sync), then build (tolerate non-zero — the build
// artifact itself succeeds; create --attach installs it per fresh sim).
try {
  const info = await lim(['xcode', 'get']);
  const dead = info.match(/attached \((ios_[a-z0-9_]+)\)/i)?.[1];
  if (dead) await lim(['ios', 'delete', dead]).catch(() => {});
} catch { /* best-effort */ }
try {
  await lim(['xcode', 'build', '.']);
} catch (e) {
  console.log('  build step reported non-zero (continuing):', (e as Error).message.slice(0, 100));
}

// Provision each simulator; update its row live/down as it comes up (partial OK).
for (const u of units) {
  try {
    const out = await lim(['ios', 'create', '--attach']);
    u.iosId = out.match(/ID:\s*(ios_[a-z0-9_]+)/i)?.[1] ?? '';
  } catch (e) {
    console.error(`  sim provision failed for ${u.spec.display_name}:`, (e as Error).message.slice(0, 80));
  }
  if (u.iosId) {
    u.simulator = { ...u.simulator, lim_handle: u.iosId, status: 'live' };
    await writer.upsertSimulator(u.simulator);
  } else {
    await writer.upsertSimulator({ ...u.simulator, status: 'down' });
    await writer.upsertPersona({ ...u.persona, status: 'crashed' });
  }
  console.log(`  ${u.spec.display_name} → ${u.iosId || 'FAILED'}`);
}
console.log(`▶ agents exploring (LLM-decided flows)…`);

const results = await Promise.all(
  units.map(async (u) => {
    if (!u.iosId) return { ok: false, rating: null as number | null };
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
      // Finalize + upload the session video and the decision log to InsForge Storage.
      logLines.push('', `# verdict: ${r.rating}/5 — "${r.review}"`);
      let videoUrl: string | null = null;
      let logUrl: string | null = null;
      try {
        const mp4 = `/tmp/${runId}-${u.spec.key}.mp4`;
        await lim(['ios', 'record', 'stop', '--id', u.iosId, '-o', mp4]);
        videoUrl = await uploadFile(mp4, `${runId}/${u.spec.key}.mp4`);
      } catch (e) {
        console.error(`  record/upload failed ${u.spec.key}:`, (e as Error).message.slice(0, 80));
      }
      const logf = `/tmp/${runId}-${u.spec.key}.log.txt`;
      writeFileSync(logf, logLines.join('\n'));
      logUrl = await uploadFile(logf, `${runId}/${u.spec.key}.log.txt`);
      await writer.upsertSimulator({ ...u.simulator, video_url: videoUrl, log_url: logUrl });
      console.log(`  ✓ ${u.spec.display_name}: ${r.findings.length} findings, ${r.rating}/5${videoUrl ? ' +video' : ''}`);
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
