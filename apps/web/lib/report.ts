/**
 * Pure report-shaping for the Beta-Test Report (Epic 3).
 *
 * Turns a converged RunSnapshot (C6) into the view-model the report page renders:
 * a summary header (FR-9, FR-13) and per-persona sections with severity-ranked
 * findings (FR-8) and the persona's review + rating (FR-12). Pure + tested so the
 * page is just markup. Reads the same shapes the Fake Swarm and real agents write.
 */

import type { Finding, Persona, RunSnapshot, Severity } from '@swarm/shared';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

export interface ReportSummary {
  totalFindings: number;
  personaCount: number;
  durationSec: number;
  swarmRating: number | null;
  appId: string;
  runId: string;
}

export interface PersonaSection {
  persona: Persona;
  findings: Finding[]; // severity-ranked
  painScore: number;
}

export function reportSummary(snapshot: RunSnapshot): ReportSummary {
  const { run, personas, findings } = snapshot;
  const durationSec =
    run.converged_at != null
      ? Math.round((Date.parse(run.converged_at) - Date.parse(run.started_at)) / 1000)
      : 0;
  return {
    totalFindings: findings.length,
    personaCount: personas.length,
    durationSec,
    swarmRating: run.swarm_rating,
    appId: run.app_id,
    runId: run.id,
  };
}

export function personaSections(snapshot: RunSnapshot): PersonaSection[] {
  const sections: PersonaSection[] = snapshot.personas.map((persona) => {
    const findings = snapshot.findings
      .filter((f) => f.persona_id === persona.id)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const painScore = findings.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0);
    return { persona, findings, painScore };
  });

  // Worst-first: most pain leads; tie-break by lower rating, then name.
  return sections.sort((a, b) => {
    if (b.painScore !== a.painScore) return b.painScore - a.painScore;
    const ra = a.persona.rating ?? 5;
    const rb = b.persona.rating ?? 5;
    if (ra !== rb) return ra - rb;
    return a.persona.display_name.localeCompare(b.persona.display_name);
  });
}
