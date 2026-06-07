/**
 * Pure web-defect analyzer (Epic 7) — turns a captured page snapshot into
 * DefectHints in the same Edge-Case Battery vocabulary the mobile swarm uses.
 * Pure + tested; the WebDriver feeds it a real snapshot from Playwright.
 */

import type { DefectHint } from './driver.ts';

export interface WebNode {
  tag: string;
  role?: string;
  /** Accessible name (aria-label / text / alt). */
  name?: string;
  /** For <img>: the alt attribute (null if absent). */
  alt?: string | null;
  hasText?: boolean;
}

export interface WebSnapshot {
  url: string;
  title: string;
  lang?: string | null;
  nodes: WebNode[];
  consoleErrors?: string[];
  headings?: number; // count of h1-h6
}

const INTERACTIVE = new Set(['button', 'a', 'input', 'select', 'textarea']);

export function detectWebDefects(snap: WebSnapshot): DefectHint[] {
  const hints: DefectHint[] = [];
  const screen = snap.title?.trim() || new URL(snap.url, 'http://x').pathname;

  const imgsNoAlt = snap.nodes.filter((n) => n.tag === 'img' && (n.alt == null || n.alt.trim() === ''));
  if (imgsNoAlt.length > 0) {
    hints.push({
      edge_case: 'accessibility',
      severity: imgsNoAlt.length >= 5 ? 'high' : 'medium',
      title: `${imgsNoAlt.length} image(s) missing alt text`,
      repro_steps: `Open ${screen} with a screen reader → ${imgsNoAlt.length} image(s) announce nothing.`,
      screen,
    });
  }

  const unnamedControls = snap.nodes.filter(
    (n) => (INTERACTIVE.has(n.tag) || n.role === 'button' || n.role === 'link') && (!n.name || n.name.trim() === ''),
  );
  if (unnamedControls.length > 0) {
    hints.push({
      edge_case: 'accessibility',
      severity: 'high',
      title: `${unnamedControls.length} interactive control(s) without an accessible name`,
      repro_steps: `Tab through ${screen} → ${unnamedControls.length} control(s) have no label.`,
      screen,
    });
  }

  if (snap.lang == null || snap.lang.trim() === '') {
    hints.push({
      edge_case: 'accessibility',
      severity: 'low',
      title: 'Document missing a lang attribute',
      repro_steps: `Inspect <html> on ${screen} → no lang set; screen readers guess the language.`,
      screen,
    });
  }

  const hasContent = snap.nodes.some((n) => n.hasText) || (snap.headings ?? 0) > 0;
  if (!hasContent) {
    hints.push({
      edge_case: 'empty_state',
      severity: 'high',
      title: 'Page renders with no visible content or headings',
      repro_steps: `Load ${screen} → no headings/text content detected (blank or failed render).`,
      screen,
    });
  }

  const netErrors = (snap.consoleErrors ?? []).filter((e) => /network|fetch|failed to load|timeout/i.test(e));
  if (netErrors.length > 0) {
    hints.push({
      edge_case: 'slow_network',
      severity: 'medium',
      title: `${netErrors.length} network/console error(s) on load`,
      repro_steps: `Open ${screen} with the console → ${netErrors.length} failed request(s)/error(s).`,
      screen,
    });
  }

  return hints;
}
