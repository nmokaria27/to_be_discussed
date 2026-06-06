/**
 * Finding templates per Edge-Case Battery class — realistic titles, repro steps,
 * the screen they occur on, and a plausible severity. Used by the Fake Swarm so
 * seeded data reads like the real thing; the real Persona Agent generates these
 * live but to the same Finding shape (C3).
 */

import type { EdgeCase, Severity } from './types.ts';

export interface FindingTemplate {
  screen: string;
  title: string;
  repro_steps: string;
  severity: Severity;
}

export const FINDING_TEMPLATES: Record<EdgeCase, FindingTemplate[]> = {
  empty_state: [
    {
      screen: 'NoteList',
      title: 'Blank screen with no guidance on first launch',
      repro_steps: 'Fresh install → open app → land on an empty white list with no message or CTA.',
      severity: 'high',
    },
    {
      screen: 'NoteList',
      title: 'App crashes when opening an empty list',
      repro_steps: 'Fresh install → tap All Notes before creating any note → crash.',
      severity: 'critical',
    },
  ],
  overflow: [
    {
      screen: 'NoteDetail',
      title: 'Action buttons overlap when content is long',
      repro_steps: 'Open a long note → Save and Delete buttons overlap at the bottom.',
      severity: 'medium',
    },
    {
      screen: 'NoteList',
      title: 'Row content overflows its container',
      repro_steps: 'Add a note with a long preview → text bleeds past the card edge.',
      severity: 'medium',
    },
  ],
  long_name_rtl: [
    {
      screen: 'NoteList',
      title: 'Title clipped at 40 chars with no ellipsis',
      repro_steps: 'Create a note titled with 200 characters → title is hard-cut mid-word.',
      severity: 'medium',
    },
    {
      screen: 'NoteDetail',
      title: 'RTL text renders left-aligned and mis-ordered',
      repro_steps: 'Enter an Arabic title → alignment and punctuation order are wrong.',
      severity: 'high',
    },
  ],
  offline: [
    {
      screen: 'NoteList',
      title: 'Infinite spinner when offline',
      repro_steps: 'Enable airplane mode → pull to refresh → spinner never resolves.',
      severity: 'high',
    },
    {
      screen: 'NoteDetail',
      title: 'Edits silently lost when saving offline',
      repro_steps: 'Go offline → edit a note → Save → edit discarded with no warning.',
      severity: 'critical',
    },
  ],
  slow_network: [
    {
      screen: 'NoteList',
      title: 'No loading indicator on slow network',
      repro_steps: 'Throttle to 2G → open app → blank list for 8s with no spinner.',
      severity: 'medium',
    },
    {
      screen: 'Sync',
      title: 'Request times out with no retry option',
      repro_steps: 'Throttle network → trigger sync → fails silently, no retry.',
      severity: 'high',
    },
  ],
  rapid_tap: [
    {
      screen: 'NoteList',
      title: 'Double-tap creates duplicate notes',
      repro_steps: 'Tap "New Note" twice quickly → two identical notes created.',
      severity: 'high',
    },
    {
      screen: 'NoteDetail',
      title: 'Rapid Save taps stack multiple save toasts',
      repro_steps: 'Tap Save repeatedly → several overlapping toasts appear.',
      severity: 'low',
    },
  ],
  tiny_screen: [
    {
      screen: 'NoteDetail',
      title: 'Toolbar controls run off the smallest screen',
      repro_steps: 'On the smallest device → open a note → rightmost control is cut off.',
      severity: 'high',
    },
    {
      screen: 'NoteList',
      title: 'FAB overlaps the last list row',
      repro_steps: 'Smallest device → scroll to bottom → add button covers the last note.',
      severity: 'medium',
    },
  ],
  accessibility: [
    {
      screen: 'NoteList',
      title: 'Icon buttons missing accessibility labels',
      repro_steps: 'Enable VoiceOver → toolbar icons announce as "button" with no name.',
      severity: 'high',
    },
    {
      screen: 'NoteDetail',
      title: 'Placeholder text fails contrast at large text size',
      repro_steps: 'Set largest text size → placeholder is unreadable on the background.',
      severity: 'medium',
    },
  ],
  large_data: [
    {
      screen: 'NoteList',
      title: 'List stutters badly with 10k notes',
      repro_steps: 'Seed 10,000 notes → scroll → frame drops and jank.',
      severity: 'high',
    },
    {
      screen: 'Search',
      title: 'Search freezes the UI on large datasets',
      repro_steps: 'With 10k notes → type in search → UI frozen for several seconds.',
      severity: 'high',
    },
  ],
  auth_expiry: [
    {
      screen: 'NoteList',
      title: 'Expired session shows raw error instead of re-login',
      repro_steps: 'Let session expire → resume app → raw 401 text shown, no re-auth flow.',
      severity: 'critical',
    },
    {
      screen: 'Sync',
      title: 'Stuck on blank screen after token expiry',
      repro_steps: 'Background for 30 min → resume → blank screen, no recovery.',
      severity: 'high',
    },
  ],
};
