'use client';

import { useEffect, useRef, useState } from 'react';
import { channels, insforgeConfigFromEnv, loadRunSnapshot } from '@swarm/shared';
import type { Finding, Persona, Run, Simulator } from '@swarm/shared';
import { applyEvent, hydrateFromSnapshot, initialRunState, type RunState } from './runReducer.ts';
import { insforgeClient } from './insforge.ts';

/**
 * Live data path (Epic 5 swap): subscribe to a run's InsForge realtime channels
 * (C5) and fold events into the SAME reducer the fixture replay uses. An initial
 * REST load hydrates any rows written before the subscription attached.
 */
export function useInsforgeRun(runId: string | null): RunState {
  const [state, setState] = useState<RunState>(initialRunState());
  const stateRef = useRef<RunState>(initialRunState());

  useEffect(() => {
    if (!runId) {
      stateRef.current = initialRunState();
      setState(stateRef.current);
      return;
    }
    let alive = true;
    const client = insforgeClient();
    const apply = (ev: Parameters<typeof applyEvent>[1]) => {
      stateRef.current = applyEvent(stateRef.current, ev);
      if (alive) setState(stateRef.current);
    };

    // Initial hydrate (rows already present).
    const cfg = insforgeConfigFromEnv({
      NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
      NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    });
    if (cfg) {
      loadRunSnapshot(cfg, runId)
        .then((snap) => {
          if (alive && snap) {
            stateRef.current = hydrateFromSnapshot(snap);
            setState(stateRef.current);
          }
        })
        .catch((e) => console.error('initial hydrate failed', e));
    }

    // InsForge delivers a SocketMessage: { meta, ...payload } (payload may be
    // top-level passthrough or nested under .payload). Normalize to the row and
    // strip meta before folding into the reducer.
    const row = <T,>(msg: unknown): T => {
      const m = (msg ?? {}) as Record<string, unknown>;
      if (m.payload && typeof m.payload === 'object') return m.payload as T;
      const { meta: _meta, ...rest } = m;
      return rest as T;
    };
    const onRun = (p: unknown) => apply({ kind: 'run', run: row<Run>(p) });
    const onPersona = (p: unknown) => apply({ kind: 'persona', persona: row<Persona>(p) });
    const onSimulator = (p: unknown) => apply({ kind: 'simulator', simulator: row<Simulator>(p) });
    const onFinding = (p: unknown) => apply({ kind: 'finding', finding: row<Finding>(p) });

    (async () => {
      try {
        await client.realtime.connect();
        if (!alive) return;
        await client.realtime.subscribe(channels.status(runId));
        if (!alive) return;
        await client.realtime.subscribe(channels.findings(runId));
        if (!alive) return; // don't attach orphaned handlers after cleanup ran
        client.realtime.on('run', onRun);
        client.realtime.on('persona', onPersona);
        client.realtime.on('simulator', onSimulator);
        client.realtime.on('finding', onFinding);
      } catch (e) {
        console.error('realtime subscribe failed', e);
      }
    })();

    return () => {
      alive = false;
      try {
        client.realtime.off('run', onRun);
        client.realtime.off('persona', onPersona);
        client.realtime.off('simulator', onSimulator);
        client.realtime.off('finding', onFinding);
        client.realtime.unsubscribe(channels.status(runId));
        client.realtime.unsubscribe(channels.findings(runId));
      } catch {
        /* noop */
      }
    };
  }, [runId]);

  return state;
}
