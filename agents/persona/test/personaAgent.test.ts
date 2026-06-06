import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FINDING_TEMPLATES, MemoryWriter, PERSONA_BY_KEY } from '@swarm/shared';
import type { EdgeCase, Persona, Simulator } from '@swarm/shared';
import { FakeDriver, type FakeScreen } from '../src/fakeDriver.ts';
import { runPersona } from '../src/personaAgent.ts';

function hint(edge: EdgeCase) {
  const t = FINDING_TEMPLATES[edge][0]!;
  return { edge_case: edge, severity: t.severity, title: t.title, repro_steps: t.repro_steps, screen: t.screen };
}

function setup(personaKey: string, screens: FakeScreen[]) {
  const spec = PERSONA_BY_KEY[personaKey]!;
  const persona: Persona = {
    id: `p_${personaKey}`,
    run_id: 'run_1',
    key: spec.key,
    display_name: spec.display_name,
    target_edge_cases: spec.target_edge_cases,
    status: 'provisioning',
    rating: null,
    review_text: null,
  };
  const simulator: Simulator = {
    id: `s_${personaKey}`,
    run_id: 'run_1',
    persona_id: persona.id,
    lim_handle: 'lim_1',
    stream_url: null,
    status: 'booting',
  };
  const writer = new MemoryWriter();
  let n = 0;
  const driver = new FakeDriver(screens);
  return { spec, persona, simulator, writer, driver, nextId: (p: string) => `${p}_${++n}` };
}

test('persona surfaces findings in its targeted edge cases and writes them', async () => {
  const target = PERSONA_BY_KEY['rage_tapper']!.target_edge_cases[0]!; // rapid_tap
  const ctx = setup('rage_tapper', [
    { name: 'NoteList', defects: [hint(target)] },
    { name: 'NoteDetail', defects: [] },
  ]);
  const res = await runPersona({ runId: 'run_1', ...ctx, stepBudget: 6 });
  assert.ok(res.findings.length >= 1, 'found at least one finding');
  assert.ok(res.findings.every((f) => ctx.persona.target_edge_cases.includes(f.edge_case)));
  assert.equal(ctx.writer.findings.length, res.findings.length);
  const personaRow = ctx.writer.personas.at(-1)!;
  assert.equal(personaRow.status, 'done');
  assert.ok(personaRow.rating! >= 1 && personaRow.rating! <= 5);
  assert.ok((personaRow.review_text ?? '').length > 0);
});

test('a clean persona (no defects) rates 5 and still writes a review', async () => {
  const ctx = setup('accessibility', [{ name: 'NoteList', defects: [] }]);
  const res = await runPersona({ runId: 'run_1', ...ctx, stepBudget: 4 });
  assert.equal(res.findings.length, 0);
  assert.equal(res.rating, 5);
  assert.ok(res.review.length > 0);
});

test('findings are deduped by (persona, edge_case, screen)', async () => {
  const target = PERSONA_BY_KEY['offline_commuter']!.target_edge_cases[0]!; // offline
  const dup = hint(target);
  const ctx = setup('offline_commuter', [
    { name: dup.screen, defects: [dup, dup] }, // same screen twice
  ]);
  const res = await runPersona({ runId: 'run_1', ...ctx, stepBudget: 6 });
  assert.equal(res.findings.length, 1, 'duplicate hints collapse to one finding');
});

test('simulator is marked live during exploration', async () => {
  const ctx = setup('tiny_screen', [{ name: 'NoteDetail', defects: [] }]);
  await runPersona({ runId: 'run_1', ...ctx, stepBudget: 2 });
  assert.ok(ctx.writer.simulators.some((s) => s.status === 'live'));
});
