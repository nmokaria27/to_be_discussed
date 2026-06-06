/**
 * InsForgeWriter — the real implementation of the SwarmWriter seam (Story 1.4).
 *
 * Writes the C1/C3/C4 shapes to InsForge over its PostgREST records API. Because
 * it implements the same SwarmWriter interface the Fake Swarm uses, the Dashboard
 * and Report consume the resulting rows with no change (fake -> real is a swap).
 *
 * Plain fetch (no SDK dep) so it runs under node --env-file for seeding and in
 * any server context. Type-stripping friendly: no parameter properties / enums.
 */

import type { Finding, Persona, Run, Simulator } from './types.ts';
import type { SwarmWriter } from './writer.ts';

export interface InsForgeConfig {
  baseUrl: string;
  key: string;
}

export class InsForgeWriter implements SwarmWriter {
  baseUrl: string;
  key: string;

  constructor(cfg: InsForgeConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.key = cfg.key;
  }

  private async upsert(table: string, row: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/database/records/${table}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        // PK-conflict upsert so re-seeding / status updates are idempotent.
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([row]),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`InsForge ${table} write failed ${res.status}: ${body.slice(0, 300)}`);
    }
  }

  upsertRun(run: Run): Promise<void> {
    return this.upsert('runs', run as unknown as Record<string, unknown>);
  }
  upsertPersona(persona: Persona): Promise<void> {
    return this.upsert('personas', persona as unknown as Record<string, unknown>);
  }
  upsertSimulator(sim: Simulator): Promise<void> {
    return this.upsert('simulators', sim as unknown as Record<string, unknown>);
  }
  insertFinding(finding: Finding): Promise<void> {
    return this.upsert('findings', finding as unknown as Record<string, unknown>);
  }

  async uploadScreenshot(runId: string, findingId: string): Promise<string> {
    // Demo/fixture mode: deterministic placeholder. Real Persona Agents (Dev A)
    // upload the captured frame to the `findings/` bucket and return its URL.
    return `insforge://findings/${runId}/${findingId}.png`;
  }
}
