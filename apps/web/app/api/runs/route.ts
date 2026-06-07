import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { InsForgeWriter, generateSnapshot, generateTimeline } from '@swarm/shared';
import type { RealtimeEvent, TimedEvent } from '@swarm/shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Unleash → real device swarm. Spawns the live-swarm orchestrator (real lim.run
// simulators + LLM agents that decide their own flows) as a detached process and
// returns its run id as soon as the run row exists, so the dashboard can subscribe
// and watch real frames stream in. Falls back to the Fake Swarm if the real swarm
// can't start (e.g. lim/credentials unavailable) so the demo never dead-ends.

function spawnRealSwarm(root: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--env-file=.env', 'services/orchestrator/scripts/live-swarm.ts', '--size', String(size)],
      { cwd: root, env: process.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let buf = '';
    let errBuf = '';
    const to = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for RUN_ID${errBuf ? `: ${errBuf.slice(0, 200)}` : ''}`));
    }, 30000);
    const onData = (d: Buffer) => {
      buf += d.toString();
      const m = buf.match(/RUN_ID (run_[a-z0-9]+)/);
      if (m) {
        cleanup();
        child.unref();
        resolve(m[1] as string);
      }
    };
    const onErr = (d: Buffer) => {
      errBuf += d.toString();
    };
    function cleanup() {
      clearTimeout(to);
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onErr);
    }
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onErr);
    child.on('error', (e) => {
      cleanup();
      reject(e);
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rank = (k: RealtimeEvent['kind']) => (k === 'run' ? 0 : k === 'persona' ? 1 : k === 'simulator' ? 2 : 3);

async function streamFakeRun(writer: InsForgeWriter, timeline: TimedEvent[]): Promise<void> {
  const sorted = [...timeline].sort((a, b) => a.at_ms - b.at_ms || rank(a.event.kind) - rank(b.event.kind));
  const start = Date.now();
  for (const beat of sorted) {
    const wait = beat.at_ms - (Date.now() - start);
    if (wait > 0) await sleep(wait);
    const ev = beat.event;
    if (ev.kind === 'run') await writer.upsertRun(ev.run);
    else if (ev.kind === 'persona') await writer.upsertPersona(ev.persona);
    else if (ev.kind === 'simulator') await writer.upsertSimulator(ev.simulator);
    else if (ev.kind === 'finding') await writer.insertFinding(ev.finding);
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { swarm_size?: number };
  const size = Number(body.swarm_size) || Number(process.env.LIVE_SWARM_SIZE) || 4;
  const root = join(process.cwd(), '..', '..'); // repo root from apps/web

  // Real swarm first (live device frames + agents that decide flows).
  try {
    const runId = await spawnRealSwarm(root, size);
    return Response.json({ run_id: runId, mode: 'real' });
  } catch (err) {
    console.error('real swarm unavailable, falling back to Fake Swarm:', (err as Error).message);
  }

  // Fallback: Fake Swarm stream (no real devices, but a complete demo).
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const key = process.env.INSFORGE_API_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !key) return Response.json({ error: 'InsForge not configured' }, { status: 500 });
  const seed = Math.floor(Date.now() % 100000);
  const demoDurationMs = 30000;
  const snapshot = generateSnapshot({ seed, swarmSize: 12, demoDurationMs });
  const timeline = generateTimeline({ seed, swarmSize: 12, demoDurationMs });
  const writer = new InsForgeWriter({ baseUrl, key });
  streamFakeRun(writer, timeline).catch((e) => console.error('fake stream error', e));
  return Response.json({ run_id: snapshot.run.id, mode: 'fake' });
}
