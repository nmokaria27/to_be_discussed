/**
 * FakeDriver — a scripted device for testing persona logic with no simulator.
 *
 * Each screen can carry planted DefectHints that the persona's targeted edge
 * cases will surface, so PersonaAgent can be tested deterministically. The real
 * LimDriver implements the same interface against a lim.run simulator.
 */

import type { DefectHint, DriverAgent, Observation, Action } from './driver.ts';

export interface FakeScreen {
  name: string;
  defects?: DefectHint[];
}

export class FakeDriver implements DriverAgent {
  private screens: FakeScreen[];
  private index = 0;
  actions: Action[] = [];

  constructor(screens: FakeScreen[]) {
    if (screens.length === 0) throw new Error('FakeDriver needs at least one screen');
    this.screens = screens;
  }

  private current(): FakeScreen {
    return this.screens[this.index] as FakeScreen;
  }

  async observe(): Promise<Observation> {
    const s = this.current();
    return {
      screen: s.name,
      screenshot: new Uint8Array(),
      a11yTree: [{ id: `${s.name}-root`, role: 'screen', screen: s.name }],
    };
  }

  async act(action: Action): Promise<void> {
    this.actions.push(action);
    // Navigation/scroll advances through the scripted screens (wraps).
    if (action.kind === 'navigate') {
      const i = this.screens.findIndex((s) => s.name === action.screen);
      if (i >= 0) this.index = i;
    } else if (action.kind === 'gesture' || action.kind === 'tapNode' || action.kind === 'tap') {
      this.index = (this.index + 1) % this.screens.length;
    }
  }

  async detectVisualDefects(obs: Observation): Promise<DefectHint[]> {
    const s = this.screens.find((x) => x.name === obs.screen);
    return s?.defects ?? [];
  }

  async dispose(): Promise<void> {
    /* nothing to release */
  }
}
