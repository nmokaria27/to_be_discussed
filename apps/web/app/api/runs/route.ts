import { InsForgeWriter, generateSnapshot, generateTimeline } from '@swarm/shared';
import type { RealtimeEvent, TimedEvent } from '@swarm/shared';

export const dynamic = 'force-dynamic';
// Streams rows over ~30s wall-clock — requires a persistent runtime (local
// `next start` or a long-lived Node host). On frozen serverless the stream is
// killed after the response; deploy this route to a Node server, or replace it
// with Dev A's real orchestrator. maxDuration nudges platforms that honor it.
export const maxDuration = 60;

// Stand-in Orchestrator (contract C2). Until Dev A's real Replicas+lim.run
// orchestrator lands, this streams a Fake Swarm run into InsForge over wall-clock
// so the dashboard sees it live via InsForge realtime (C5). Swapping in the real
// orchestrator changes nothing downstream — same rows, same channels.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rank = (k: RealtimeEvent['kind']) => (k === 'run' ? 0 : k === 'persona' ? 1 : k === 'simulator' ? 2 : 3);

async function streamRun(writer: InsForgeWriter, timeline: TimedEvent[]): Promise<void> {
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
  const swarmSize = Number(body.swarm_size) || 12;

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  // Server-side writes use the admin key; fall back to anon (RLS also permits it).
  const key = process.env.INSFORGE_API_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !key) {
    return Response.json({ error: 'InsForge not configured' }, { status: 500 });
  }

  // Unique-ish run per click; deterministic within the run.
  const seed = Math.floor(Date.now() % 100000);
  const demoDurationMs = 30000;
  const snapshot = generateSnapshot({ seed, swarmSize, demoDurationMs });
  const timeline = generateTimeline({ seed, swarmSize, demoDurationMs });
  const writer = new InsForgeWriter({ baseUrl, key });

  // Fire-and-forget: stream rows over ~30s; realtime triggers publish each one.
  streamRun(writer, timeline).catch((e) => console.error('streamRun error', e));

  return Response.json({ run_id: snapshot.run.id });
}
