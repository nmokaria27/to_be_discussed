/**
 * Pure replay core for the Live Swarm Grid (Epic 2).
 *
 * The Dashboard subscribes to realtime events (C5) — or, in Fake Swarm mode,
 * replays a TimedEvent[] — and folds them into RunState via applyEvent(). Keeping
 * this a pure reducer makes the live-updating UI fully testable without a browser
 * or a backend. When the real swarm lands, the same events arrive over InsForge
 * realtime and this reducer is unchanged.
 *
 * Type-only imports from @swarm/shared (erased at runtime), so this file and its
 * tests run under `node --test` with zero install.
 */

import type {
  Finding,
  Persona,
  RealtimeEvent,
  Run,
  Severity,
  Simulator,
  TimedEvent,
} from '@swarm/shared';

export interface RunState {
  run: Run | null;
  personas: Record<string, Persona>;
  simulators: Record<string, Simulator>;
  findings: Finding[];
  /** Insertion order index per finding id, for stable recency tie-breaks. */
  order: Record<string, number>;
}

export interface FeedItem {
  groupKey: string;
  finding: Finding; // representative (latest in group)
  count: number;
}

// Local severity ordering (canonical SEVERITY_RANK lives in @swarm/shared; kept
// local here so the reducer needs no runtime value import).
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function initialRunState(): RunState {
  return { run: null, personas: {}, simulators: {}, findings: [], order: {} };
}

export function applyEvent(state: RunState, event: RealtimeEvent): RunState {
  switch (event.kind) {
    case 'run':
      return { ...state, run: event.run };
    case 'persona':
      return { ...state, personas: { ...state.personas, [event.persona.id]: event.persona } };
    case 'simulator':
      return { ...state, simulators: { ...state.simulators, [event.simulator.id]: event.simulator } };
    case 'finding': {
      if (state.order[event.finding.id] !== undefined) return state; // idempotent
      return {
        ...state,
        findings: [...state.findings, event.finding],
        order: { ...state.order, [event.finding.id]: state.findings.length },
      };
    }
    default:
      return state;
  }
}

/** Fold all timeline beats with at_ms <= t into a fresh state. */
export function replayUpTo(timeline: TimedEvent[], t: number): RunState {
  let s = initialRunState();
  for (const beat of timeline) {
    if (beat.at_ms <= t) s = applyEvent(s, beat.event);
  }
  return s;
}

// ---- selectors ----

/** Raw count of findings discovered (drives the live counter — includes dupes). */
export function findingCount(state: RunState): number {
  return state.findings.length;
}

export function personaList(state: RunState): Persona[] {
  return Object.values(state.personas);
}

export function simulatorList(state: RunState): Simulator[] {
  return Object.values(state.simulators);
}

export function liveSimulators(state: RunState): Simulator[] {
  return simulatorList(state).filter((s) => s.status === 'live');
}

function groupKeyOf(f: Finding): string {
  return f.screen_key ?? `${f.persona_id}:${f.edge_case}`;
}

/**
 * Grouped, ranked feed (FR-7 dedup, FR-8 severity ranking).
 * One row per (persona, edge_case, screen); ordered most-severe first, then most-recent.
 */
export function feedItems(state: RunState): FeedItem[] {
  const groups = new Map<string, FeedItem>();
  for (const f of state.findings) {
    const key = groupKeyOf(f);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { groupKey: key, finding: f, count: 1 });
    } else {
      existing.count += 1;
      // keep the most-recent occurrence as representative
      if ((state.order[f.id] ?? 0) >= (state.order[existing.finding.id] ?? 0)) {
        existing.finding = f;
      }
    }
  }
  return [...groups.values()].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.finding.severity] - SEVERITY_ORDER[b.finding.severity];
    if (sev !== 0) return sev;
    return (state.order[b.finding.id] ?? 0) - (state.order[a.finding.id] ?? 0); // recent first
  });
}
