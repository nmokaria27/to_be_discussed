import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PERSONA_BY_KEY } from '@swarm/shared';
import { decideStep, parseDecision, type ChatClient } from '../src/agentBrain.ts';
import type { Observation } from '../src/driver.ts';

const obs: Observation = {
  screen: 'NoteList',
  screenshot: new Uint8Array(),
  a11yTree: [{ id: 'add', role: 'button', label: 'Add', screen: 'NoteList' }],
};

test('parseDecision parses a valid JSON decision', () => {
  const d = parseDecision(
    '{"thought":"tap add","action":{"kind":"tap","x":50,"y":80},"defects":[{"edge_case":"accessibility","severity":"high","title":"unlabeled icon","repro_steps":"voiceover"}],"done":false}',
    'NoteList',
  );
  assert.equal(d.action.kind, 'tap');
  assert.equal(d.defects.length, 1);
  assert.equal(d.defects[0]!.edge_case, 'accessibility');
  assert.equal(d.done, false);
});

test('parseDecision tolerates prose around the JSON', () => {
  const d = parseDecision('Sure! {"action":{"kind":"gesture","name":"rapidTap"},"defects":[],"done":true} done', 'X');
  assert.equal(d.action.kind, 'gesture');
  assert.equal(d.done, true);
});

test('parseDecision drops invalid edge_case / severity and bad actions', () => {
  const d = parseDecision(
    '{"action":{"kind":"frobnicate"},"defects":[{"edge_case":"not_real","severity":"x","title":"t"}],"done":false}',
    'X',
  );
  assert.equal(d.action.kind, 'gesture'); // unknown kind -> safe default
  assert.equal(d.defects.length, 0); // invalid edge_case dropped
});

test('parseDecision falls back safely on garbage', () => {
  const d = parseDecision('not json at all', 'X');
  assert.equal(d.action.kind, 'gesture');
  assert.equal(d.defects.length, 0);
  assert.equal(d.done, false);
});

test('decideStep calls the injected client and returns a decision', async () => {
  const fake: ChatClient = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: '{"action":{"kind":"type","text":"hi"},"defects":[],"done":false}' } }],
        }),
      },
    },
  };
  const d = await decideStep({ client: fake, spec: PERSONA_BY_KEY['rage_tapper']!, observation: obs, step: 0, budget: 4 });
  assert.equal(d.action.kind, 'type');
});
