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

    const onRun = (p: Run) => apply({ kind: 'run', run: p });
    const onPersona = (p: Persona) => apply({ kind: 'persona', persona: p });
    const onSimulator = (p: Simulator) => apply({ kind: 'simulator', simulator: p });
    const onFinding = (p: Finding) => apply({ kind: 'finding', finding: p });

    (async () => {
      try {
        await client.realtime.connect();
        await client.realtime.subscribe(channels.status(runId));
        await client.realtime.subscribe(channels.findings(runId));
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
