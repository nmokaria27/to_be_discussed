/**
 * InsForge reader — loads a converged run (C6) for the Report Site over the
 * PostgREST records API. Plain fetch so it works in Next server components and
 * node. Returns the same RunSnapshot shape the Fake Swarm produces, so the
 * report page is identical whether reading fixtures or InsForge.
 */

import type { Finding, Persona, Run, RunSnapshot, Simulator } from './types.ts';
import type { InsForgeConfig } from './insforge-writer.ts';

async function get<T>(cfg: InsForgeConfig, path: string): Promise<T> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/database/records/${path}`, {
    headers: { Authorization: `Bearer ${cfg.key}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`InsForge read failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Load one run by id, fully materialised. Returns null if the run doesn't exist. */
export async function loadRunSnapshot(cfg: InsForgeConfig, runId: string): Promise<RunSnapshot | null> {
  const runs = await get<Run[]>(cfg, `runs?id=eq.${encodeURIComponent(runId)}`);
  const run = runs[0];
  if (!run) return null;
  const [personas, simulators, findings] = await Promise.all([
    get<Persona[]>(cfg, `personas?run_id=eq.${encodeURIComponent(runId)}`),
    get<Simulator[]>(cfg, `simulators?run_id=eq.${encodeURIComponent(runId)}`),
    get<Finding[]>(cfg, `findings?run_id=eq.${encodeURIComponent(runId)}`),
  ]);
  return { run, personas, simulators, findings };
}

/** Most recent run (by started_at) — handy when no run id is supplied. */
export async function loadLatestRun(cfg: InsForgeConfig): Promise<RunSnapshot | null> {
  const runs = await get<Run[]>(cfg, `runs?order=started_at.desc&limit=1`);
  const run = runs[0];
  return run ? loadRunSnapshot(cfg, run.id) : null;
}

export function insforgeConfigFromEnv(env: Record<string, string | undefined>): InsForgeConfig | null {
  const baseUrl = env.NEXT_PUBLIC_INSFORGE_URL ?? env.INSFORGE_URL;
  const key = env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? env.INSFORGE_KEY;
  if (!baseUrl || !key) return null;
  return { baseUrl, key };
}
