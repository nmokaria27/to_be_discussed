/**
 * Contract C1 — the InsForge data model, mirrored as TypeScript types.
 *
 * These are the single source of truth all three workstreams code against.
 * The Fake Swarm (C9) and the real Persona Agents (C3/C4) both emit exactly
 * these shapes, which is what makes the fake->real swap a no-op for the
 * Dashboard and Report consumers.
 *
 * Type-stripping friendly: no enums, no namespaces. String unions + `as const`.
 */

// ---- Enums as string unions (kept in sync with the SQL CHECK constraints) ----

export type RunStatus =
  | 'pending'
  | 'provisioning'
  | 'running'
  | 'converged'
  | 'failed';

export type PersonaStatus =
  | 'provisioning'
  | 'exploring'
  | 'done'
  | 'crashed';

export type SimulatorStatus = 'booting' | 'live' | 'down';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** FR-5 Edge-Case Battery — the named failure classes the swarm hunts. */
export type EdgeCase =
  | 'empty_state'
  | 'overflow'
  | 'long_name_rtl'
  | 'offline'
  | 'slow_network'
  | 'rapid_tap'
  | 'tiny_screen'
  | 'accessibility'
  | 'large_data'
  | 'auth_expiry';

export const EDGE_CASES: readonly EdgeCase[] = [
  'empty_state',
  'overflow',
  'long_name_rtl',
  'offline',
  'slow_network',
  'rapid_tap',
  'tiny_screen',
  'accessibility',
  'large_data',
  'auth_expiry',
] as const;

export const SEVERITIES: readonly Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

/** Severity ordering for ranking in the Report (lower index = more severe). */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ---- Table row types (§4 of architecture.md) ----

export interface Run {
  id: string;
  app_id: string;
  status: RunStatus;
  swarm_size: number;
  /** Mean of persona ratings; null until converged (FR-13). */
  swarm_rating: number | null;
  started_at: string; // ISO-8601
  converged_at: string | null;
}

export interface Persona {
  id: string;
  run_id: string;
  key: string; // see personas.ts catalog (C8)
  display_name: string;
  target_edge_cases: EdgeCase[];
  status: PersonaStatus;
  /** 1..5, set when the Persona Review is produced (FR-12). */
  rating: number | null;
  review_text: string | null;
}

export interface Simulator {
  id: string;
  run_id: string;
  persona_id: string;
  lim_handle: string;
  /** Live-view surface for the Grid; null while booting. */
  stream_url: string | null;
  status: SimulatorStatus;
  /** Session video (lim.run recording) uploaded to InsForge Storage; null if none. */
  video_url?: string | null;
  /** Agent decision/findings log uploaded to InsForge Storage; null if none. */
  log_url?: string | null;
}

export interface Finding {
  id: string;
  run_id: string;
  persona_id: string;
  simulator_id: string;
  edge_case: EdgeCase;
  severity: Severity;
  title: string;
  repro_steps: string;
  screenshot_url: string;
  /** Dedup grouping key: persona + edge_case + screen (FR-7). */
  screen_key: string | null;
  created_at: string; // ISO-8601
}

/** A fully materialised run — what the Report Site reads (contract C6). */
export interface RunSnapshot {
  run: Run;
  personas: Persona[];
  simulators: Simulator[];
  findings: Finding[];
}

// ---- Realtime contract (C5) ----

export const channels = {
  status: (runId: string) => `run:${runId}:status` as const,
  findings: (runId: string) => `run:${runId}:findings` as const,
};

export type StatusEvent =
  | { kind: 'run'; run: Run }
  | { kind: 'persona'; persona: Persona }
  | { kind: 'simulator'; simulator: Simulator };

export interface FindingEvent {
  kind: 'finding';
  finding: Finding;
}

export type RealtimeEvent = StatusEvent | FindingEvent;

/** One ordered, replayable beat of a live run (used by the Fake Swarm for the Dashboard). */
export interface TimedEvent {
  /** Milliseconds after run start when this event fires. */
  at_ms: number;
  event: RealtimeEvent;
}

// ---- POST /runs contract (C2) ----

export interface CreateRunRequest {
  app_id: string;
  swarm_size: number;
  persona_keys: string[];
}

export interface CreateRunResponse {
  run_id: string;
}
