import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EDGE_CASES,
  SEVERITIES,
  channels,
  generateSnapshot,
  generateTimeline,
  MemoryWriter,
  PERSONA_CATALOG,
  writeSnapshot,
} from '../src/index.ts';
import type { Finding, Persona, RealtimeEvent } from '../src/index.ts';

test('snapshot has the requested swarm size and valid shapes', () => {
  const snap = generateSnapshot({ seed: 42, swarmSize: 8 });
  assert.equal(snap.personas.length, 8);
  assert.equal(snap.simulators.length, 8);
  assert.equal(snap.run.status, 'converged');

  for (const f of snap.findings) {
    assert.ok(EDGE_CASES.includes(f.edge_case), `bad edge_case ${f.edge_case}`);
    assert.ok(SEVERITIES.includes(f.severity), `bad severity ${f.severity}`);
    assert.ok(f.title.length > 0 && f.repro_steps.length > 0);
    assert.ok(f.screenshot_url.startsWith('insforge://'));
    // referential integrity
    assert.ok(snap.personas.some((p) => p.id === f.persona_id));
    assert.ok(snap.simulators.some((s) => s.id === f.simulator_id));
  }
});

test('every completed persona has a 1..5 rating and review (FR-12)', () => {
  const snap = generateSnapshot({ seed: 3, swarmSize: 12 });
  for (const p of snap.personas) {
    assert.equal(p.status, 'done');
    assert.ok(p.rating! >= 1 && p.rating! <= 5, `rating out of range: ${p.rating}`);
    assert.ok((p.review_text ?? '').length > 0, 'empty review');
  }
});

test('swarm_rating is the mean of persona ratings (FR-13)', () => {
  const snap = generateSnapshot({ seed: 99, swarmSize: 6 });
  const ratings = snap.personas.map((p) => p.rating as number);
  const mean = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  assert.equal(snap.run.swarm_rating, mean);
});

test('generation is deterministic for a given seed', () => {
  const a = JSON.stringify(generateSnapshot({ seed: 7, swarmSize: 10 }));
  const b = JSON.stringify(generateSnapshot({ seed: 7, swarmSize: 10 }));
  assert.equal(a, b);
});

test('timeline is ordered, ends converged, and only references known findings', () => {
  const timeline = generateTimeline({ seed: 42, swarmSize: 8 });
  for (let i = 1; i < timeline.length; i += 1) {
    assert.ok(timeline[i]!.at_ms >= timeline[i - 1]!.at_ms, 'timeline not sorted');
  }
  const last = timeline.at(-1)!.event as Extract<RealtimeEvent, { kind: 'run' }>;
  assert.equal(last.kind, 'run');
  assert.equal(last.run.status, 'converged');
  assert.ok(last.run.swarm_rating! > 0);

  const findingEvents = timeline.filter((t) => t.event.kind === 'finding');
  const snap = generateSnapshot({ seed: 42, swarmSize: 8 });
  assert.equal(findingEvents.length, snap.findings.length);
});

test('timeline finding count matches snapshot finding count', () => {
  const snap = generateSnapshot({ seed: 5, swarmSize: 12 });
  const timeline = generateTimeline({ seed: 5, swarmSize: 12 });
  const tlFindings = timeline.filter((t) => t.event.kind === 'finding').length;
  assert.equal(tlFindings, snap.findings.length);
});

test('writeSnapshot pushes everything through the SwarmWriter seam', async () => {
  const snap = generateSnapshot({ seed: 1, swarmSize: 5 });
  const w = new MemoryWriter();
  await writeSnapshot(w, snap);
  assert.equal(w.runs.length, 1);
  assert.equal(w.personas.length, 5);
  assert.equal(w.simulators.length, 5);
  assert.equal(w.findings.length, snap.findings.length);
});

test('persona catalog is large enough for a 12-tile grid with unique keys', () => {
  assert.ok(PERSONA_CATALOG.length >= 12);
  const keys = new Set(PERSONA_CATALOG.map((p) => p.key));
  assert.equal(keys.size, PERSONA_CATALOG.length);
});

// keep the imported types referenced for verbatimModuleSyntax friendliness
const _typeProbe: Array<Finding | Persona> = [];
void _typeProbe;
