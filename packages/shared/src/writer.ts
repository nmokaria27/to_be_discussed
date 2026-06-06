/**
 * Contract seam between producers (Fake Swarm now, Persona Agents later) and the
 * backend. Both write through this interface, so swapping fake -> real is a
 * one-line change for consumers.
 *
 * Dev B implements InsForgeWriter against the real InsForge SDK once creds exist.
 * MemoryWriter/collect() are provided for tests and offline fixture generation.
 */

import type { Finding, Persona, Run, Simulator } from './types.ts';

export interface SwarmWriter {
  upsertRun(run: Run): Promise<void>;
  upsertPersona(persona: Persona): Promise<void>;
  upsertSimulator(sim: Simulator): Promise<void>;
  insertFinding(finding: Finding): Promise<void>;
  /** Upload a screenshot; returns the public URL to store on the finding. */
  uploadScreenshot(runId: string, findingId: string, bytes: Uint8Array): Promise<string>;
}

/** In-memory writer — accumulates everything; used by tests and the seeder. */
export class MemoryWriter implements SwarmWriter {
  runs: Run[] = [];
  personas: Persona[] = [];
  simulators: Simulator[] = [];
  findings: Finding[] = [];

  async upsertRun(run: Run): Promise<void> {
    this.runs = upsert(this.runs, run);
  }
  async upsertPersona(persona: Persona): Promise<void> {
    this.personas = upsert(this.personas, persona);
  }
  async upsertSimulator(sim: Simulator): Promise<void> {
    this.simulators = upsert(this.simulators, sim);
  }
  async insertFinding(finding: Finding): Promise<void> {
    this.findings.push(finding);
  }
  async uploadScreenshot(runId: string, findingId: string): Promise<string> {
    // Fixture/offline mode: deterministic placeholder URL.
    return `insforge://findings/${runId}/${findingId}.png`;
  }
}

function upsert<T extends { id: string }>(arr: T[], row: T): T[] {
  const i = arr.findIndex((r) => r.id === row.id);
  if (i === -1) return [...arr, row];
  const copy = arr.slice();
  copy[i] = row;
  return copy;
}
