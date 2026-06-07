/**
 * The agent brain (Epic: real agentic swarm) — the persona DECIDES its own flow.
 *
 * Each step, the brain sees the current screen (screenshot + a11y summary) and,
 * conditioned on its persona, returns the next action to take and any UI/UX
 * defects it observes — via a vision LLM through InsForge's Model Gateway
 * (OpenRouter, OpenAI-compatible). No scripted flows, no seeded bugs: the agent
 * reasons about what a real user of its kind would do next.
 *
 * The OpenAI client is injected, so this is unit-testable with a fake client.
 */

import type { EdgeCase, Severity } from '@swarm/shared';
import type { Action, DefectHint, Observation } from './driver.ts';
import type { PersonaSpec } from '@swarm/shared';

export interface ChatClient {
  chat: {
    completions: {
      create(args: unknown): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

export interface BrainDecision {
  action: Action;
  defects: DefectHint[];
  done: boolean;
  thought?: string;
}

const EDGE_CASES = [
  'empty_state', 'overflow', 'long_name_rtl', 'offline', 'slow_network',
  'rapid_tap', 'tiny_screen', 'accessibility', 'large_data', 'auth_expiry',
] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

function a11ySummary(obs: Observation): string {
  const nodes = obs.a11yTree ?? [];
  return nodes
    .slice(0, 40)
    .map((n) => `- ${n.role}${n.label ? ` "${n.label}"` : ''}`)
    .join('\n');
}

export function buildMessages(spec: PersonaSpec, obs: Observation, step: number, budget: number) {
  const sys =
    `You are "${spec.display_name}", an autonomous mobile beta-tester exploring an iOS app. ` +
    `Disposition: ${spec.disposition} You are biased to provoke these edge cases: ${spec.target_edge_cases.join(', ')}. ` +
    `Each turn, decide the SINGLE next action a user like you would take to stress the app, and report any UI/UX defect visible on THIS screen. ` +
    `Reply ONLY as compact JSON: {"thought": string, "action": {"kind": "tap"|"tapNode"|"type"|"gesture"|"setNetwork"|"navigate", ...args}, "defects": [{"edge_case": one of [${EDGE_CASES.join(', ')}], "severity": one of [${SEVERITIES.join(', ')}], "title": string, "repro_steps": string}], "done": boolean}. ` +
    `action args: tap{x,y} tapNode{id} type{text} gesture{name:"scroll"|"swipe"|"rapidTap"} setNetwork{state:"offline"|"slow"|"online"} navigate{screen}. ` +
    `Only report defects you can actually justify from the screen. Set done=true when you've explored enough (step ${step + 1}/${budget}).`;
  const user: Array<Record<string, unknown>> = [
    { type: 'text', text: `Current screen: ${obs.screen}\nAccessible elements:\n${a11ySummary(obs)}` },
  ];
  if (obs.screenshot && obs.screenshot.length > 0) {
    const b64 = Buffer.from(obs.screenshot).toString('base64');
    user.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

function coerceAction(a: unknown): Action {
  const o = (a ?? {}) as Record<string, unknown>;
  switch (o.kind) {
    case 'tap': return { kind: 'tap', x: Number(o.x) || 100, y: Number(o.y) || 200 };
    case 'tapNode': return { kind: 'tapNode', id: String(o.id ?? '') };
    case 'type': return { kind: 'type', text: String(o.text ?? '') };
    case 'setNetwork': return { kind: 'setNetwork', state: (o.state === 'offline' || o.state === 'slow' ? o.state : 'online') };
    case 'navigate': return { kind: 'navigate', screen: String(o.screen ?? '') };
    default: {
      const name = o.name === 'scroll' || o.name === 'swipe' || o.name === 'rapidTap' ? o.name : 'swipe';
      return { kind: 'gesture', name };
    }
  }
}

function coerceDefects(d: unknown, screen: string): DefectHint[] {
  if (!Array.isArray(d)) return [];
  return d
    .map((raw): DefectHint | null => {
      const o = (raw ?? {}) as Record<string, unknown>;
      if (!EDGE_CASES.includes(o.edge_case as EdgeCase)) return null;
      const severity = (SEVERITIES.includes(o.severity as Severity) ? o.severity : 'medium') as Severity;
      return {
        edge_case: o.edge_case as EdgeCase,
        severity,
        title: String(o.title ?? 'Issue').slice(0, 160),
        repro_steps: String(o.repro_steps ?? '').slice(0, 400),
        screen,
      };
    })
    .filter((x): x is DefectHint => x != null);
}

export function parseDecision(content: string | null, screen: string): BrainDecision {
  const fallback: BrainDecision = { action: { kind: 'gesture', name: 'swipe' }, defects: [], done: false };
  if (!content) return fallback;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    const j = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      action: coerceAction(j.action),
      defects: coerceDefects(j.defects, screen),
      done: j.done === true,
      thought: typeof j.thought === 'string' ? j.thought : undefined,
    };
  } catch {
    return fallback;
  }
}

export interface DecideOpts {
  client: ChatClient;
  model?: string;
  spec: PersonaSpec;
  observation: Observation;
  step: number;
  budget: number;
}

/** One real decision turn via the vision LLM. */
export async function decideStep(opts: DecideOpts): Promise<BrainDecision> {
  const res = await opts.client.chat.completions.create({
    model: opts.model ?? 'openai/gpt-4o-mini',
    messages: buildMessages(opts.spec, opts.observation, opts.step, opts.budget),
    temperature: 0.7,
    max_tokens: 500,
  });
  return parseDecision(res.choices[0]?.message?.content ?? null, opts.observation.screen);
}
