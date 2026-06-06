/**
 * Orchestrator (Epic 5) — run lifecycle for the real swarm.
 *
 * Creates a Run + per-persona Persona/Simulator rows, runs each PersonaAgent
 * against a DriverAgent (FakeDriver in tests, LimDriver for real), converges,
 * computes the Swarm Rating, and tears down. Partial-swarm start (FR-1): a
 * persona that fails is marked crashed and the run continues. Writes go through
 * the SwarmWriter seam, so MemoryWriter (tests) and InsForgeWriter (real) are
 * interchangeable.
 */

import { makeRng, selectPersonas } from '@swarm/shared';
import type { Persona, Run, Simulator, SwarmWriter } from '@swarm/shared';
import { runPersona } from '../../../agents/persona/src/personaAgent.ts';
import type { DriverAgent } from '../../../agents/persona/src/driver.ts';

export interface RunSwarmOpts {
  writer: SwarmWriter;
  swarmSize: number;
  makeDriver: (persona: Persona) => DriverAgent;
  appId?: string;
  seed?: number;
  stepBudget?: number;
  now?: () => string;
}

export async function runSwarm(opts: RunSwarmOpts): Promise<Run> {
  const now = opts.now ?? (() => new Date().toISOString());
  const rng = makeRng(opts.seed ?? 1);
  const specs = selectPersonas(opts.swarmSize);
  const runId = rng.id('run');
  const startedAt = now();
  const appId = opts.appId ?? 'notes-demo';

  const baseRun: Run = {
    id: runId,
    app_id: appId,
    status: 'provisioning',
    swarm_size: specs.length,
    swarm_rating: null,
    started_at: startedAt,
    converged_at: null,
  };
  await opts.writer.upsertRun(baseRun);

  const units = specs.map((spec) => {
    const personaId = rng.id('persona');
    const simId = rng.id('sim');
    const persona: Persona = {
      id: personaId,
      run_id: runId,
      key: spec.key,
      display_name: spec.display_name,
      target_edge_cases: spec.target_edge_cases,
      status: 'provisioning',
      rating: null,
      review_text: null,
    };
    const simulator: Simulator = {
      id: simId,
      run_id: runId,
      persona_id: personaId,
      lim_handle: rng.id('lim'),
      stream_url: null,
      status: 'booting',
    };
    return { spec, persona, simulator };
  });

  // FK-safe order: persona before its simulator.
  for (const u of units) {
    await opts.writer.upsertPersona(u.persona);
    await opts.writer.upsertSimulator(u.simulator);
  }

  await opts.writer.upsertRun({ ...baseRun, status: 'running' });

  const results = await Promise.all(
    units.map(async (u) => {
      try {
        const driver = opts.makeDriver(u.persona);
        const r = await runPersona({
          runId,
          persona: u.persona,
          spec: u.spec,
          simulator: u.simulator,
          driver,
          writer: opts.writer,
          nextId: (p) => rng.id(p),
          stepBudget: opts.stepBudget,
          now,
        });
        return { ok: true, rating: r.rating };
      } catch (err) {
        await opts.writer.upsertPersona({ ...u.persona, status: 'crashed', rating: null, review_text: null });
        await opts.writer.upsertSimulator({ ...u.simulator, status: 'down' });
        return { ok: false, rating: null as number | null };
      }
    }),
  );

  const ratings = results.filter((r) => r.ok && r.rating != null).map((r) => r.rating as number);
  const swarmRating =
    ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  const converged: Run = {
    ...baseRun,
    status: 'converged',
    swarm_rating: swarmRating,
    converged_at: now(),
  };
  await opts.writer.upsertRun(converged);
  return converged;
}
