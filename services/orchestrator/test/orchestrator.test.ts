import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FINDING_TEMPLATES, MemoryWriter } from '@swarm/shared';
import type { EdgeCase, Persona } from '@swarm/shared';
import { FakeDriver } from '../../../agents/persona/src/fakeDriver.ts';
import { runSwarm } from '../src/orchestrator.ts';

function hint(edge: EdgeCase) {
  const t = FINDING_TEMPLATES[edge][0]!;
  return { edge_case: edge, severity: t.severity, title: t.title, repro_steps: t.repro_steps, screen: t.screen };
}

// Each persona's driver plants a defect on the screen matching its first target.
function driverFor(persona: Persona) {
  const edge = persona.target_edge_cases[0]!;
  const h = hint(edge);
  return new FakeDriver([{ name: h.screen, defects: [h] }, { name: 'Other', defects: [] }]);
}

test('runSwarm converges with all personas done and a swarm rating', async () => {
  const writer = new MemoryWriter();
  const run = await runSwarm({ writer, swarmSize: 6, makeDriver: driverFor, seed: 7, stepBudget: 4 });

  assert.equal(run.status, 'converged');
  assert.equal(writer.personas.filter((p) => p.run_id === run.id && p.status === 'done').length, 6);
  assert.equal(writer.simulators.length, 6);
  assert.ok(writer.findings.length >= 6, 'each persona found at least one defect');
  assert.ok(run.swarm_rating != null && run.swarm_rating >= 1 && run.swarm_rating <= 5);
  assert.ok(run.converged_at != null);
});

test('partial-swarm start: one crashing driver does not abort the run (FR-1, NFR-6)', async () => {
  const writer = new MemoryWriter();
  let first = true;
  const run = await runSwarm({
    writer,
    swarmSize: 4,
    seed: 3,
    stepBudget: 4,
    makeDriver: (p) => {
      if (first) {
        first = false;
        return {
          observe: async () => {
            throw new Error('simulator boot failed');
          },
          act: async () => {},
          detectVisualDefects: async () => [],
        };
      }
      return driverFor(p);
    },
  });

  assert.equal(run.status, 'converged', 'run still converges');
  assert.ok(writer.personas.some((p) => p.status === 'crashed'), 'failed persona marked crashed');
  assert.ok(writer.personas.filter((p) => p.status === 'done').length >= 1, 'others still ran');
  assert.ok(run.swarm_rating != null, 'rating computed from survivors');
});
