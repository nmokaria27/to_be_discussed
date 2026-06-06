import assert from 'node:assert/strict';
import { test } from 'node:test';

import { personaSections, reportSummary } from './report.ts';
import type { Finding, Persona, RunSnapshot } from '@swarm/shared';

function persona(id: string, rating: number | null, review: string | null): Persona {
  return {
    id,
    run_id: 'run_1',
    key: id,
    display_name: id.toUpperCase(),
    target_edge_cases: ['empty_state'],
    status: 'done',
    rating,
    review_text: review,
  };
}

function finding(id: string, personaId: string, severity: Finding['severity']): Finding {
  return {
    id,
    run_id: 'run_1',
    persona_id: personaId,
    simulator_id: `s_${personaId}`,
    edge_case: 'empty_state',
    severity,
    title: `issue ${id}`,
    repro_steps: 'do x',
    screenshot_url: `insforge://findings/run_1/${id}.png`,
    screen_key: `${personaId}:empty_state:NoteList`,
    created_at: '2026-06-06T17:00:10.000Z',
  };
}

function snapshot(personas: Persona[], findings: Finding[]): RunSnapshot {
  return {
    run: {
      id: 'run_1',
      app_id: 'notes-demo',
      status: 'converged',
      swarm_size: personas.length,
      swarm_rating: 2.8,
      started_at: '2026-06-06T17:00:00.000Z',
      converged_at: '2026-06-06T17:01:20.000Z',
    },
    personas,
    simulators: [],
    findings,
  };
}

test('summary reports totals, persona count, duration, and rating', () => {
  const s = snapshot(
    [persona('a', 3, 'ok'), persona('b', 2, 'meh')],
    [finding('f1', 'a', 'high'), finding('f2', 'a', 'low'), finding('f3', 'b', 'critical')],
  );
  const sum = reportSummary(s);
  assert.equal(sum.totalFindings, 3);
  assert.equal(sum.personaCount, 2);
  assert.equal(sum.durationSec, 80);
  assert.equal(sum.swarmRating, 2.8);
});

test('findings within a persona section are severity-ranked (FR-8)', () => {
  const s = snapshot(
    [persona('a', 2, 'ok')],
    [finding('f1', 'a', 'low'), finding('f2', 'a', 'critical'), finding('f3', 'a', 'medium')],
  );
  const sections = personaSections(s);
  assert.equal(sections.length, 1);
  assert.deepEqual(
    sections[0]!.findings.map((f) => f.severity),
    ['critical', 'medium', 'low'],
  );
});

test('a persona with no findings still appears with its review + rating (FR-12)', () => {
  const s = snapshot([persona('a', 5, 'clean!'), persona('b', 2, 'rough')], [finding('f1', 'b', 'high')]);
  const sections = personaSections(s);
  const clean = sections.find((sec) => sec.persona.id === 'a');
  assert.ok(clean, 'clean persona present');
  assert.equal(clean!.findings.length, 0);
  assert.equal(clean!.persona.review_text, 'clean!');
  assert.equal(clean!.persona.rating, 5);
});

test('sections are ordered worst-first (most pain leads)', () => {
  const s = snapshot(
    [persona('mild', 4, 'ok'), persona('bad', 1, 'awful')],
    [
      finding('f1', 'mild', 'low'),
      finding('f2', 'bad', 'critical'),
      finding('f3', 'bad', 'high'),
    ],
  );
  const sections = personaSections(s);
  assert.equal(sections[0]!.persona.id, 'bad', 'most painful persona first');
});
