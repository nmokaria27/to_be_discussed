/**
 * Contract C8 — the Persona catalog (PRD FR-3).
 *
 * 12 personas so the Dashboard can render an 8-12 tile grid. Each declares the
 * Edge-Case Battery classes it is biased to provoke and a first-person review
 * voice the Persona Agent (FR-12) and Fake Swarm both use.
 */

import type { EdgeCase } from './types.ts';

export interface PersonaSpec {
  key: string;
  display_name: string;
  /** One-line disposition — feeds the agent system prompt. */
  disposition: string;
  target_edge_cases: EdgeCase[];
  /** Review voice templates by sentiment; {n} interpolated with finding count. */
  review_voice: {
    rough: string; // many/severe findings
    ok: string; // few findings
    clean: string; // no findings
  };
}

export const PERSONA_CATALOG: readonly PersonaSpec[] = [
  {
    key: 'rage_tapper',
    display_name: 'Rage-Tapper',
    disposition: 'Taps fast and repeatedly, double-fires buttons, never waits for spinners.',
    target_edge_cases: ['rapid_tap', 'overflow'],
    review_voice: {
      rough: 'Felt janky — {n} actions misfired or duplicated when I tapped quickly.',
      ok: 'Mostly responsive, but {n} spot(s) double-fired under fast taps.',
      clean: 'Held up to aggressive tapping. Responsive throughout.',
    },
  },
  {
    key: 'offline_commuter',
    display_name: 'Offline Commuter',
    disposition: 'Drops to airplane mode mid-task; expects graceful offline handling.',
    target_edge_cases: ['offline', 'slow_network'],
    review_voice: {
      rough: 'Falls apart offline — {n} screen(s) hung or lost my data with no connection.',
      ok: 'Survives offline mostly; {n} rough edge(s) when the network dropped.',
      clean: 'Handled going offline gracefully. Impressed.',
    },
  },
  {
    key: 'power_user_10k',
    display_name: '10k-Item Power User',
    disposition: 'Loads thousands of items; stresses lists, search, and scroll.',
    target_edge_cases: ['large_data', 'overflow'],
    review_voice: {
      rough: 'Buckles under real data — {n} slowdown(s)/breakage(s) with a large list.',
      ok: 'Handles scale with {n} hiccup(s) on big lists.',
      clean: 'Stayed smooth even with thousands of items.',
    },
  },
  {
    key: 'long_name_rtl',
    display_name: 'Long-Name / RTL User',
    disposition: 'Uses 200-char titles, emoji, and right-to-left scripts.',
    target_edge_cases: ['long_name_rtl', 'overflow'],
    review_voice: {
      rough: 'Text handling is broken — {n} clip/overlap issue(s) with long or RTL text.',
      ok: 'Mostly fine; {n} clipping issue(s) with long names.',
      clean: 'Long and RTL text rendered correctly everywhere.',
    },
  },
  {
    key: 'accessibility',
    display_name: 'Accessibility User',
    disposition: 'Uses large text + VoiceOver; needs labels, contrast, and focus order.',
    target_edge_cases: ['accessibility'],
    review_voice: {
      rough: 'Hard to use with assistive tech — {n} unlabeled/low-contrast element(s).',
      ok: 'Usable with {n} accessibility gap(s) to fix.',
      clean: 'Accessible: labels, contrast, and focus order all checked out.',
    },
  },
  {
    key: 'tiny_screen',
    display_name: 'Tiny-Screen User',
    disposition: 'On the smallest supported device; watches for overlap and cutoff.',
    target_edge_cases: ['tiny_screen', 'overflow'],
    review_voice: {
      rough: 'Cramped — {n} control(s) overlapped or ran off the small screen.',
      ok: 'Works small with {n} layout issue(s).',
      clean: 'Layout held up on the smallest screen.',
    },
  },
  {
    key: 'slow_network',
    display_name: 'Slow-Network User',
    disposition: 'On 2G/lossy network; watches for missing loading + timeout states.',
    target_edge_cases: ['slow_network'],
    review_voice: {
      rough: 'Painful on slow data — {n} screen(s) with no loading state or silent timeout.',
      ok: 'Tolerable on slow data; {n} missing loading state(s).',
      clean: 'Clear loading states made slow network bearable.',
    },
  },
  {
    key: 'empty_state',
    display_name: 'Empty-State Explorer',
    disposition: 'Fresh install, zero data; probes first-run and empty screens.',
    target_edge_cases: ['empty_state'],
    review_voice: {
      rough: 'Bad first impression — {n} blank/crashing empty screen(s) on first run.',
      ok: 'First run okay; {n} empty screen(s) need attention.',
      clean: 'Empty states were clear and welcoming.',
    },
  },
  {
    key: 'permission_denier',
    display_name: 'Permission Denier',
    disposition: 'Denies every permission prompt; expects graceful degradation.',
    target_edge_cases: ['auth_expiry', 'empty_state'],
    review_voice: {
      rough: 'Breaks when I say no — {n} dead-end(s) after denying permissions.',
      ok: 'Mostly degrades gracefully; {n} permission dead-end(s).',
      clean: 'Denying permissions degraded gracefully.',
    },
  },
  {
    key: 'background_resume',
    display_name: 'Background / Resume User',
    disposition: 'Backgrounds the app for minutes; expects session + state to survive.',
    target_edge_cases: ['auth_expiry'],
    review_voice: {
      rough: 'Loses my place — {n} state/session loss(es) after resuming.',
      ok: 'Resumes okay with {n} state issue(s).',
      clean: 'Backgrounding and resuming preserved my session and state.',
    },
  },
  {
    key: 'deep_link',
    display_name: 'Deep-Link Visitor',
    disposition: 'Arrives via deep link into an inner screen, not the home screen.',
    target_edge_cases: ['empty_state', 'auth_expiry'],
    review_voice: {
      rough: 'Deep links are broken — {n} link(s) dumped me into a blank/error screen.',
      ok: 'Deep links mostly work; {n} landed wrong.',
      clean: 'Deep links landed me exactly where expected.',
    },
  },
  {
    key: 'rapid_switcher',
    display_name: 'Rapid Switcher',
    disposition: 'Switches screens/tabs mid-load; stresses navigation + cancellation.',
    target_edge_cases: ['rapid_tap', 'slow_network'],
    review_voice: {
      rough: 'Gets confused fast — {n} stale/overlapping screen(s) when I switched quickly.',
      ok: 'Navigation mostly holds; {n} stale-screen issue(s).',
      clean: 'Fast screen switching never left stale or overlapping views.',
    },
  },
] as const;

export const PERSONA_BY_KEY: Record<string, PersonaSpec> = Object.fromEntries(
  PERSONA_CATALOG.map((p) => [p.key, p]),
);

/** Default selection for a given swarm size (first N of the catalog). */
export function selectPersonas(swarmSize: number): PersonaSpec[] {
  const n = Math.max(1, Math.min(swarmSize, PERSONA_CATALOG.length));
  return PERSONA_CATALOG.slice(0, n);
}
