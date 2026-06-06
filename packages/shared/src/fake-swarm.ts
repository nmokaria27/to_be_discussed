/**
 * Contract C9 — the Fake Swarm.
 *
 * Generates realistic runs/personas/simulators/findings/reviews in the EXACT
 * shapes the real Persona Agents emit (C3/C4). This is the keystone that lets
 * the Dashboard (Dev B) and Report Site (Claude) build fully before the real
 * lim.run + Replicas integration (Dev A) exists. Swapping fake -> real is then
 * a no-op for consumers because both write the same shapes through SwarmWriter.
 *
 * Two outputs:
 *   - generateSnapshot(): a converged RunSnapshot  -> Report Site (C6)
 *   - generateTimeline(): ordered TimedEvent[]      -> Dashboard live replay (C5)
 */

import { FINDING_TEMPLATES } from './edge-cases.ts';
import { PERSONA_CATALOG, selectPersonas } from './personas.ts';
import type { PersonaSpec } from './personas.ts';
import { makeRng } from './rng.ts';
import type { Rng } from './rng.ts';
import type {
  EdgeCase,
  Finding,
  Persona,
  RealtimeEvent,
  Run,
  RunSnapshot,
  Simulator,
  TimedEvent,
} from './types.ts';

export interface FakeSwarmOptions {
  seed?: number;
  swarmSize?: number;
  appId?: string;
  /** Run start time (ISO). Fixed default keeps fixtures byte-stable. */
  startedAt?: string;
  /** Wall-clock length of the simulated run; events spread across it. */
  demoDurationMs?: number;
}

interface ResolvedOptions {
  seed: number;
  swarmSize: number;
  appId: string;
  startedAt: string;
  demoDurationMs: number;
}

function resolve(opts: FakeSwarmOptions): ResolvedOptions {
  return {
    seed: opts.seed ?? 42,
    swarmSize: opts.swarmSize ?? 12,
    appId: opts.appId ?? 'notes-demo',
    startedAt: opts.startedAt ?? '2026-06-06T17:00:00.000Z',
    demoDurationMs: opts.demoDurationMs ?? 80_000,
  };
}

function iso(baseIso: string, offsetMs: number): string {
  return new Date(Date.parse(baseIso) + offsetMs).toISOString();
}

/** Rating from findings: more + more-severe findings => lower stars. */
function ratingFor(findings: Finding[]): number {
  if (findings.length === 0) return 5;
  const weight = findings.reduce((acc, f) => {
    const w = f.severity === 'critical' ? 3 : f.severity === 'high' ? 2 : f.severity === 'medium' ? 1 : 0.5;
    return acc + w;
  }, 0);
  const stars = Math.round(5 - Math.min(4, weight * 0.7));
  return Math.max(1, Math.min(5, stars));
}

function reviewFor(spec: PersonaSpec, findings: Finding[], rating: number): string {
  const n = findings.length;
  const voice =
    rating <= 2 ? spec.review_voice.rough : rating >= 5 ? spec.review_voice.clean : spec.review_voice.ok;
  return voice.replace('{n}', String(n));
}

interface BuiltPersona {
  persona: Persona;
  simulator: Simulator;
  findings: Finding[];
}

function buildPersona(rng: Rng, o: ResolvedOptions, spec: PersonaSpec, runId: string): BuiltPersona {
  const personaId = rng.id('persona');
  const simId = rng.id('sim');

  // 0-3 findings, biased toward the persona's target edge cases.
  const count = rng.int(4);
  const findings: Finding[] = [];
  for (let i = 0; i < count; i += 1) {
    const edge: EdgeCase = rng.pick(spec.target_edge_cases);
    const tpl = rng.pick(FINDING_TEMPLATES[edge]);
    const fid = rng.id('finding');
    findings.push({
      id: fid,
      run_id: runId,
      persona_id: personaId,
      simulator_id: simId,
      edge_case: edge,
      severity: tpl.severity,
      title: tpl.title,
      repro_steps: tpl.repro_steps,
      screenshot_url: `insforge://findings/${runId}/${fid}.png`,
      screen_key: `${spec.key}:${edge}:${tpl.screen}`,
      created_at: o.startedAt, // refined per-event in the timeline
    });
  }

  const rating = ratingFor(findings);
  const persona: Persona = {
    id: personaId,
    run_id: runId,
    key: spec.key,
    display_name: spec.display_name,
    target_edge_cases: spec.target_edge_cases,
    status: 'done',
    rating,
    review_text: reviewFor(spec, findings, rating),
  };
  const simulator: Simulator = {
    id: simId,
    run_id: runId,
    persona_id: personaId,
    lim_handle: rng.id('lim'),
    stream_url: `https://lim.run/stream/${simId}`,
    status: 'live',
  };
  return { persona, simulator, findings };
}

function meanRating(personas: Persona[]): number {
  const rated = personas.filter((p) => p.rating != null) as Array<Persona & { rating: number }>;
  if (rated.length === 0) return 0;
  const sum = rated.reduce((a, p) => a + p.rating, 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

/** Build the canonical run + its parts (internal). */
function build(opts: FakeSwarmOptions): { built: BuiltPersona[]; run: Run; o: ResolvedOptions } {
  const o = resolve(opts);
  const rng = makeRng(o.seed);
  const specs = selectPersonas(o.swarmSize);
  const runId = rng.id('run');

  const built = specs.map((spec) => buildPersona(rng, o, spec, runId));
  const personas = built.map((b) => b.persona);

  const run: Run = {
    id: runId,
    app_id: o.appId,
    status: 'converged',
    swarm_size: specs.length,
    swarm_rating: meanRating(personas),
    started_at: o.startedAt,
    converged_at: iso(o.startedAt, o.demoDurationMs),
  };
  return { built, run, o };
}

/** A fully converged run — feed the Report Site (C6). */
export function generateSnapshot(opts: FakeSwarmOptions = {}): RunSnapshot {
  const { built, run } = build(opts);
  return {
    run,
    personas: built.map((b) => b.persona),
    simulators: built.map((b) => b.simulator),
    findings: built.flatMap((b) => b.findings),
  };
}

/**
 * Ordered, replayable timeline of a live run — feed the Dashboard (C5).
 * Beats: run provisioning -> sims boot/live + personas exploring -> findings
 * trickle in -> personas finish (rating+review) -> run converged.
 */
export function generateTimeline(opts: FakeSwarmOptions = {}): TimedEvent[] {
  const { built, run, o } = build(opts);
  const events: TimedEvent[] = [];
  const push = (at_ms: number, event: RealtimeEvent) => events.push({ at_ms, event });

  // 1. Run starts provisioning.
  push(0, { kind: 'run', run: { ...run, status: 'provisioning', swarm_rating: null, converged_at: null } });

  // 2. Per persona: sim boots -> live, persona provisioning -> exploring.
  built.forEach((b, i) => {
    const bootAt = 200 + i * 150;
    const liveAt = bootAt + 900;
    push(bootAt, { kind: 'simulator', simulator: { ...b.simulator, stream_url: null, status: 'booting' } });
    push(bootAt, { kind: 'persona', persona: { ...b.persona, status: 'provisioning', rating: null, review_text: null } });
    push(liveAt, { kind: 'simulator', simulator: { ...b.simulator, status: 'live' } });
    push(liveAt, { kind: 'persona', persona: { ...b.persona, status: 'exploring', rating: null, review_text: null } });
  });

  // 3. Run flips to running once provisioning is underway.
  const provisionedAt = 200 + built.length * 150 + 900;
  push(provisionedAt, { kind: 'run', run: { ...run, status: 'running', swarm_rating: null, converged_at: null } });

  // 4. Findings trickle in across the exploration window.
  const exploreStart = provisionedAt + 500;
  const exploreEnd = o.demoDurationMs - 6000;
  const allFindings = built.flatMap((b) => b.findings);
  const span = Math.max(1, exploreEnd - exploreStart);
  allFindings.forEach((f, i) => {
    const at = exploreStart + Math.floor((span * (i + 1)) / (allFindings.length + 1));
    push(at, { kind: 'finding', finding: { ...f, created_at: iso(o.startedAt, at) } });
  });

  // 5. Personas finish with their review + rating.
  built.forEach((b, i) => {
    const doneAt = exploreEnd + 500 + i * 120;
    push(doneAt, { kind: 'persona', persona: b.persona });
  });

  // 6. Run converged.
  push(o.demoDurationMs, { kind: 'run', run });

  return events.sort((a, b) => a.at_ms - b.at_ms);
}

/** Convenience: write a converged run through any SwarmWriter (fake -> real seam). */
export async function writeSnapshot(
  writer: import('./writer.ts').SwarmWriter,
  snapshot: RunSnapshot,
): Promise<void> {
  await writer.upsertRun(snapshot.run);
  for (const p of snapshot.personas) await writer.upsertPersona(p);
  for (const s of snapshot.simulators) await writer.upsertSimulator(s);
  for (const f of snapshot.findings) await writer.insertFinding(f);
}

export const SWARM_DEFAULTS = { seed: 42, swarmSize: 12, appId: 'notes-demo' };
export { PERSONA_CATALOG };
