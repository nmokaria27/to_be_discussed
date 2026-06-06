import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyEvent,
  feedItems,
  findingCount,
  initialRunState,
  liveSimulators,
  personaList,
  replayUpTo,
} from './runReducer.ts';
import type { RealtimeEvent, TimedEvent } from '@swarm/shared';

function runEvent(status: 'provisioning' | 'running' | 'converged'): RealtimeEvent {
  return {
    kind: 'run',
    run: {
      id: 'run_1',
      app_id: 'notes-demo',
      status,
      swarm_size: 2,
      swarm_rating: status === 'converged' ? 3 : null,
      started_at: '2026-06-06T17:00:00.000Z',
      converged_at: status === 'converged' ? '2026-06-06T17:01:20.000Z' : null,
    },
  };
}

function simEvent(id: string, status: 'booting' | 'live' | 'down'): RealtimeEvent {
  return {
    kind: 'simulator',
    simulator: {
      id,
      run_id: 'run_1',
      persona_id: `p_${id}`,
      lim_handle: `lim_${id}`,
      stream_url: status === 'booting' ? null : `https://lim.run/stream/${id}`,
      status,
    },
  };
}

function personaEvent(id: string, status: 'provisioning' | 'exploring' | 'done', rating: number | null): RealtimeEvent {
  return {
    kind: 'persona',
    persona: {
      id,
      run_id: 'run_1',
      key: id,
      display_name: id.toUpperCase(),
      target_edge_cases: ['empty_state'],
      status,
      rating,
      review_text: rating == null ? null : 'ok',
    },
  };
}

function findingEvent(id: string, personaId: string, severity: 'critical' | 'high' | 'medium' | 'low', screenKey: string): RealtimeEvent {
  return {
    kind: 'finding',
    finding: {
      id,
      run_id: 'run_1',
      persona_id: personaId,
      simulator_id: `s_${personaId}`,
      edge_case: 'empty_state',
      severity,
      title: `issue ${id}`,
      repro_steps: 'do x',
      screenshot_url: `insforge://findings/run_1/${id}.png`,
      screen_key: screenKey,
      created_at: '2026-06-06T17:00:10.000Z',
    },
  };
}

test('initial state is empty', () => {
  const s = initialRunState();
  assert.equal(s.run, null);
  assert.equal(findingCount(s), 0);
  assert.equal(personaList(s).length, 0);
});

test('run status transitions are applied', () => {
  let s = initialRunState();
  s = applyEvent(s, runEvent('provisioning'));
  assert.equal(s.run?.status, 'provisioning');
  s = applyEvent(s, runEvent('running'));
  assert.equal(s.run?.status, 'running');
  s = applyEvent(s, runEvent('converged'));
  assert.equal(s.run?.status, 'converged');
  assert.equal(s.run?.swarm_rating, 3);
});

test('simulator upsert reflects booting -> live by id (no duplicates)', () => {
  let s = initialRunState();
  s = applyEvent(s, simEvent('a', 'booting'));
  s = applyEvent(s, simEvent('a', 'live'));
  assert.equal(Object.keys(s.simulators).length, 1);
  assert.equal(s.simulators['a']?.status, 'live');
  assert.equal(liveSimulators(s).length, 1);
});

test('persona upsert tracks status + rating by id', () => {
  let s = initialRunState();
  s = applyEvent(s, personaEvent('rage', 'exploring', null));
  s = applyEvent(s, personaEvent('rage', 'done', 4));
  assert.equal(personaList(s).length, 1);
  assert.equal(personaList(s)[0]?.status, 'done');
  assert.equal(personaList(s)[0]?.rating, 4);
});

test('findings increment the raw counter', () => {
  let s = initialRunState();
  s = applyEvent(s, findingEvent('f1', 'rage', 'high', 'rage:empty_state:NoteList'));
  s = applyEvent(s, findingEvent('f2', 'rage', 'low', 'rage:empty_state:NoteList'));
  assert.equal(findingCount(s), 2);
});

test('feed groups near-duplicate findings by screen_key with a count (FR-7)', () => {
  let s = initialRunState();
  s = applyEvent(s, findingEvent('f1', 'rage', 'high', 'rage:empty_state:NoteList'));
  s = applyEvent(s, findingEvent('f2', 'rage', 'high', 'rage:empty_state:NoteList'));
  s = applyEvent(s, findingEvent('f3', 'calm', 'low', 'calm:empty_state:Search'));
  const feed = feedItems(s);
  assert.equal(feed.length, 2, 'two groups');
  const dup = feed.find((i) => i.groupKey === 'rage:empty_state:NoteList');
  assert.equal(dup?.count, 2);
  // raw counter still counts all 3
  assert.equal(findingCount(s), 3);
});

test('feed is ordered most-severe first then most-recent (FR-8)', () => {
  let s = initialRunState();
  s = applyEvent(s, findingEvent('f1', 'a', 'low', 'a:empty_state:S1'));
  s = applyEvent(s, findingEvent('f2', 'b', 'critical', 'b:empty_state:S2'));
  s = applyEvent(s, findingEvent('f3', 'c', 'medium', 'c:empty_state:S3'));
  const feed = feedItems(s);
  assert.equal(feed[0]?.finding.severity, 'critical');
  assert.equal(feed[feed.length - 1]?.finding.severity, 'low');
});

test('resilience: a down simulator is excluded from live but state still progresses (NFR-6)', () => {
  let s = initialRunState();
  s = applyEvent(s, simEvent('a', 'live'));
  s = applyEvent(s, simEvent('b', 'down'));
  s = applyEvent(s, findingEvent('f1', 'a', 'high', 'a:empty_state:NoteList'));
  assert.equal(liveSimulators(s).length, 1);
  assert.equal(Object.keys(s.simulators).length, 2);
  assert.equal(findingCount(s), 1);
});

test('replayUpTo applies all timeline events with at_ms <= t', () => {
  const timeline: TimedEvent[] = [
    { at_ms: 0, event: runEvent('provisioning') },
    { at_ms: 1000, event: simEvent('a', 'live') },
    { at_ms: 5000, event: findingEvent('f1', 'a', 'high', 'a:empty_state:NoteList') },
    { at_ms: 80000, event: runEvent('converged') },
  ];
  const mid = replayUpTo(timeline, 6000);
  assert.equal(mid.run?.status, 'provisioning');
  assert.equal(findingCount(mid), 1);
  const end = replayUpTo(timeline, 999999);
  assert.equal(end.run?.status, 'converged');
});
