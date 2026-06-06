/**
 * DriverAgent (contract C7) — the seam between persona logic and the device.
 *
 * Persona logic depends only on this interface, so it is testable against a
 * FakeDriver with no simulator, and the real LimDriver (lim.run) drops in
 * unchanged. Per SPIKE-1 the real impl is hybrid (a11y tree for navigation +
 * vision for visual defects) with a vision-only fallback.
 */

import type { EdgeCase, Severity } from '@swarm/shared';

export interface UiNode {
  id: string;
  role: string;
  label?: string;
  /** Screen this node belongs to (NoteList, NoteDetail, Search, Auth, Sync). */
  screen?: string;
}

export interface Observation {
  /** Current screen name. */
  screen: string;
  /** PNG bytes of the current frame (empty in FakeDriver). */
  screenshot: Uint8Array;
  /** Accessibility tree if available (hybrid mode); undefined => vision-only. */
  a11yTree?: UiNode[];
}

export type Action =
  | { kind: 'tapNode'; id: string }
  | { kind: 'tap'; x: number; y: number }
  | { kind: 'type'; text: string }
  | { kind: 'gesture'; name: 'scroll' | 'swipe' | 'rapidTap' }
  | { kind: 'setNetwork'; state: 'online' | 'offline' | 'slow' }
  | { kind: 'navigate'; screen: string };

/** A candidate UI/UX defect surfaced by perception. */
export interface DefectHint {
  edge_case: EdgeCase;
  severity: Severity;
  title: string;
  repro_steps: string;
  screen: string;
}

export interface DriverAgent {
  /** Perceive the current screen. */
  observe(): Promise<Observation>;
  /** Execute an action against the device. */
  act(action: Action): Promise<void>;
  /** Vision/heuristic pass: visual defects on the current screen (overlap, clip, blank…). */
  detectVisualDefects(obs: Observation): Promise<DefectHint[]>;
  /** Release the device (teardown). */
  dispose?(): Promise<void>;
}
