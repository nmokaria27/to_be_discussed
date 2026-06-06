/**
 * PersonaAgent — the autonomous explorer (FR-4/FR-5/FR-6/FR-12).
 *
 * Drives a DriverAgent, surfaces Findings in its persona's targeted edge-case
 * classes, dedupes by (persona, edge_case, screen), persists each via the
 * SwarmWriter seam (so fake and real backends are identical), then produces a
 * lens-appropriate Review + Rating. The same shapes the Fake Swarm emits.
 */

import type { Finding, Persona, Severity, Simulator } from '@swarm/shared';
import type { PersonaSpec } from '@swarm/shared';
import type { Action, DriverAgent } from './driver.ts';
import type { SwarmWriter } from '@swarm/shared';

export interface RunPersonaCtx {
  runId: string;
  persona: Persona; // pre-created row (id, key, display_name, target_edge_cases)
  spec: PersonaSpec; // catalog entry (disposition, review_voice)
  simulator: Simulator;
  driver: DriverAgent;
  writer: SwarmWriter;
  nextId: (prefix: string) => string;
  stepBudget?: number;
  now?: () => string;
}

export interface PersonaResult {
  findings: Finding[];
  rating: number;
  review: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0.5 };

function ratingFromFindings(findings: Finding[]): number {
  if (findings.length === 0) return 5;
  const weight = findings.reduce((a, f) => a + SEVERITY_WEIGHT[f.severity], 0);
  return Math.max(1, Math.min(5, Math.round(5 - Math.min(4, weight * 0.7))));
}

function reviewFor(spec: PersonaSpec, n: number, rating: number): string {
  const v = rating <= 2 ? spec.review_voice.rough : rating >= 5 ? spec.review_voice.clean : spec.review_voice.ok;
  return v.replace('{n}', String(n));
}

/** Persona-flavoured next action toward its targeted edge cases. */
function chooseAction(spec: PersonaSpec, step: number): Action {
  const targets = spec.target_edge_cases;
  if (targets.includes('offline') && step === 0) return { kind: 'setNetwork', state: 'offline' };
  if (targets.includes('slow_network') && step === 0) return { kind: 'setNetwork', state: 'slow' };
  if (targets.includes('rapid_tap')) return { kind: 'gesture', name: 'rapidTap' };
  if (targets.includes('large_data')) return { kind: 'gesture', name: 'scroll' };
  return { kind: 'gesture', name: 'swipe' }; // advance to the next screen
}

export async function runPersona(ctx: RunPersonaCtx): Promise<PersonaResult> {
  const now = ctx.now ?? (() => new Date().toISOString());
  const budget = ctx.stepBudget ?? 8;

  await ctx.writer.upsertSimulator({ ...ctx.simulator, status: 'live' });
  await ctx.writer.upsertPersona({ ...ctx.persona, status: 'exploring', rating: null, review_text: null });

  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (let step = 0; step < budget; step += 1) {
    const obs = await ctx.driver.observe();
    const hints = await ctx.driver.detectVisualDefects(obs);
    for (const h of hints) {
      if (!ctx.persona.target_edge_cases.includes(h.edge_case)) continue; // persona reports its lens
      const screenKey = `${ctx.persona.key}:${h.edge_case}:${h.screen}`;
      if (seen.has(screenKey)) continue;
      seen.add(screenKey);
      const id = ctx.nextId('finding');
      const screenshot_url = await ctx.writer.uploadScreenshot(ctx.runId, id, obs.screenshot);
      const finding: Finding = {
        id,
        run_id: ctx.runId,
        persona_id: ctx.persona.id,
        simulator_id: ctx.simulator.id,
        edge_case: h.edge_case,
        severity: h.severity,
        title: h.title,
        repro_steps: h.repro_steps,
        screenshot_url,
        screen_key: screenKey,
        created_at: now(),
      };
      await ctx.writer.insertFinding(finding);
      findings.push(finding);
    }
    await ctx.driver.act(chooseAction(ctx.spec, step));
  }

  const rating = ratingFromFindings(findings);
  const review = reviewFor(ctx.spec, findings.length, rating);
  await ctx.writer.upsertPersona({ ...ctx.persona, status: 'done', rating, review_text: review });
  await ctx.driver.dispose?.();

  return { findings, rating, review };
}
