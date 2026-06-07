/**
 * WebDriver (Epic 7) — a DriverAgent over a real website via Playwright, so the
 * swarm can beta-test web apps, not just mobile. Same C7 interface as LimDriver
 * and FakeDriver, so PersonaAgent/orchestrator are unchanged.
 *
 * Playwright is imported lazily so this module loads (and the package builds)
 * without the dependency present; install `playwright` to run it for real. The
 * defect logic lives in the pure, tested `detectWebDefects`.
 */

import type { Action, DefectHint, DriverAgent, Observation, UiNode } from './driver.ts';
import { detectWebDefects, type WebSnapshot } from './webDefects.ts';

export interface WebDriverOpts {
  url: string;
  headless?: boolean;
  viewport?: { width: number; height: number };
}

// Minimal structural types so we don't hard-depend on Playwright's types.
interface PwPage {
  goto(url: string): Promise<unknown>;
  title(): Promise<string>;
  screenshot(): Promise<Buffer>;
  evaluate<T>(fn: () => T): Promise<T>;
  click(sel: string): Promise<void>;
  fill(sel: string, text: string): Promise<void>;
  on(event: string, cb: (arg: unknown) => void): void;
}

export class WebDriver implements DriverAgent {
  private opts: WebDriverOpts;
  private page: PwPage | null = null;
  private browser: { close(): Promise<void> } | null = null;
  private consoleErrors: string[] = [];
  private lastSnapshot: WebSnapshot | null = null;

  constructor(opts: WebDriverOpts) {
    this.opts = { headless: true, viewport: { width: 390, height: 844 }, ...opts };
  }

  private async ensure(): Promise<PwPage> {
    if (this.page) return this.page;
    const pw = (await import('playwright')) as unknown as {
      chromium: { launch(o: { headless?: boolean }): Promise<{ newPage(): Promise<PwPage>; close(): Promise<void> }> };
    };
    this.browser = await pw.chromium.launch({ headless: this.opts.headless });
    const page = await (this.browser as unknown as { newPage(): Promise<PwPage> }).newPage();
    page.on('console', (msg: unknown) => {
      const m = msg as { type?: () => string; text?: () => string };
      if (m.type?.() === 'error') this.consoleErrors.push(m.text?.() ?? 'console error');
    });
    page.on('pageerror', (err: unknown) => this.consoleErrors.push(String(err)));
    await page.goto(this.opts.url);
    this.page = page;
    return page;
  }

  async observe(): Promise<Observation> {
    const page = await this.ensure();
    const snapshot = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('img,button,a,input,select,textarea,h1,h2,h3,p')).map(
        (el) => {
          const tag = el.tagName.toLowerCase();
          const ariaLabel = el.getAttribute('aria-label') ?? undefined;
          const name = (ariaLabel || (el as HTMLElement).innerText || '').trim() || undefined;
          return {
            tag,
            role: el.getAttribute('role') ?? undefined,
            name,
            alt: tag === 'img' ? el.getAttribute('alt') : undefined,
            hasText: !!(el as HTMLElement).innerText?.trim(),
          };
        },
      );
      return {
        url: location.href,
        title: document.title,
        lang: document.documentElement.getAttribute('lang'),
        headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
        nodes,
      };
    });
    const snap: WebSnapshot = { ...snapshot, consoleErrors: [...this.consoleErrors] };
    this.lastSnapshot = snap;
    const a11yTree: UiNode[] = snap.nodes.map((n, i) => ({
      id: `${n.tag}-${i}`,
      role: n.role ?? n.tag,
      label: n.name,
      screen: snap.title,
    }));
    return { screen: snap.title || snap.url, screenshot: new Uint8Array(await page.screenshot()), a11yTree };
  }

  async act(action: Action): Promise<void> {
    const page = await this.ensure();
    try {
      if (action.kind === 'type') await page.fill('input,textarea', action.text);
      else if (action.kind === 'tap' || action.kind === 'gesture') await page.click('a,button');
    } catch {
      /* exploratory: actions are best-effort */
    }
  }

  async detectVisualDefects(): Promise<DefectHint[]> {
    const snap = this.lastSnapshot ?? (await this.observe(), this.lastSnapshot);
    return snap ? detectWebDefects(snap) : [];
  }

  async dispose(): Promise<void> {
    await this.browser?.close();
    this.page = null;
    this.browser = null;
  }
}
