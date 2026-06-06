/**
 * LimDriver — the real DriverAgent (C7) over a lim.run iOS simulator.
 *
 * Hybrid perception (SPIKE-1 result): `lim ios element-tree` for navigation +
 * `lim ios screenshot` for the frame; actions via `lim ios tap/type/scroll`.
 * Implements the same interface as FakeDriver, so PersonaAgent is unchanged.
 *
 * Shells the `lim` CLI (via npx) from the app directory. Defect detection here
 * is a lightweight, honest heuristic over the real a11y tree; the full vision
 * pass is a later Epic-5 item.
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import type { DefectHint, DriverAgent, Observation, Action, UiNode } from './driver.ts';

const exec = promisify(execFile);

export interface LimDriverOpts {
  iosId?: string; // lim ios instance id; defaults to last-created
  cwd: string; // app dir where `lim` is configured
  tmpDir?: string;
}

interface AxNode {
  AXLabel?: string | null;
  AXValue?: string | null;
  enabled?: boolean;
  custom_actions?: unknown[];
  frame?: { x: number; y: number; width: number; height: number };
  children?: AxNode[];
}

export class LimDriver implements DriverAgent {
  private opts: LimDriverOpts;
  private step = 0;

  constructor(opts: LimDriverOpts) {
    this.opts = { tmpDir: '/tmp', ...opts };
  }

  private idArgs(): string[] {
    return this.opts.iosId ? ['--id', this.opts.iosId] : [];
  }

  private async lim(args: string[]): Promise<string> {
    const { stdout } = await exec('npx', ['lim', 'ios', ...args, ...this.idArgs()], {
      cwd: this.opts.cwd,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  }

  async observe(): Promise<Observation> {
    const shotPath = `${this.opts.tmpDir}/lim-obs-${this.step}.png`;
    let screenshot = new Uint8Array();
    try {
      await this.lim(['screenshot', shotPath]);
      screenshot = new Uint8Array(await readFile(shotPath));
    } catch {
      /* screenshot best-effort */
    }
    let roots: AxNode[] = [];
    try {
      const treeJson = await this.lim(['element-tree', '--json']);
      roots = JSON.parse(treeJson) as AxNode[];
    } catch {
      /* tree best-effort */
    }
    const screen = roots[0]?.AXLabel || 'Screen';
    return { screen, screenshot, a11yTree: flatten(roots, screen) };
  }

  async act(action: Action): Promise<void> {
    this.step += 1;
    try {
      if (action.kind === 'tap') await this.lim(['tap', String(action.x), String(action.y)]);
      else if (action.kind === 'type') await this.lim(['type', action.text]);
      else if (action.kind === 'gesture' && action.name === 'scroll') await this.lim(['scroll', 'down']);
      else if (action.kind === 'gesture') await this.lim(['tap', '200', '430']); // poke UI
      // setNetwork/navigate: no-op on iOS sim for the smoke path
    } catch {
      /* actions are best-effort during exploratory discovery */
    }
  }

  async detectVisualDefects(obs: Observation): Promise<DefectHint[]> {
    const nodes = obs.a11yTree ?? [];
    const hints: DefectHint[] = [];
    // Honest heuristics over the real tree:
    const interactive = nodes.filter((n) => n.role === 'button' || n.role === 'interactive');
    const unlabeled = interactive.filter((n) => !n.label || n.label.trim() === '');
    if (unlabeled.length > 0) {
      hints.push({
        edge_case: 'accessibility',
        severity: 'high',
        title: `${unlabeled.length} interactive element(s) missing an accessibility label`,
        repro_steps: `Enable VoiceOver on ${obs.screen} → unlabeled control(s) announce as "button".`,
        screen: obs.screen,
      });
    }
    if (interactive.length <= 1) {
      hints.push({
        edge_case: 'empty_state',
        severity: 'low',
        title: 'Screen exposes minimal interactive content',
        repro_steps: `Open ${obs.screen} → only ${interactive.length} actionable element(s) present.`,
        screen: obs.screen,
      });
    }
    return hints;
  }

  async dispose(): Promise<void> {
    /* leave the simulator for inspection; teardown handled by the orchestrator */
  }
}

function flatten(roots: AxNode[], screen: string): UiNode[] {
  const out: UiNode[] = [];
  const walk = (n: AxNode) => {
    // A node is genuinely interactive only if it exposes custom actions (a
    // tappable control), not merely because a container is enabled.
    const isInteractive = !!(n.custom_actions && n.custom_actions.length > 0);
    out.push({
      id: n.AXLabel || 'node',
      role: isInteractive ? 'interactive' : 'static',
      label: n.AXLabel ?? undefined,
      screen,
    });
    (n.children ?? []).forEach(walk);
  };
  roots.forEach(walk);
  return out;
}
