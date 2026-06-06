'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimedEvent } from '@swarm/shared';
import { initialRunState, replayUpTo, type RunState } from './runReducer.ts';

export interface Replay {
  state: RunState;
  elapsedMs: number;
  running: boolean;
  finished: boolean;
  start: () => void;
  reset: () => void;
}

/**
 * Drives the Live Grid by replaying a Fake Swarm timeline (C9) in wall-clock,
 * folding beats through the tested reducer. When the real swarm lands, the same
 * RunState is produced from InsForge realtime events instead — UI unchanged.
 */
export function useReplay(timeline: TimedEvent[], speed = 1): Replay {
  const maxAt = useMemo(
    () => timeline.reduce((m, b) => Math.max(m, b.at_ms), 0),
    [timeline],
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const e = (Date.now() - startedAt.current) * speed;
      if (e >= maxAt) {
        setElapsedMs(maxAt);
        setRunning(false);
      } else {
        setElapsedMs(e);
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, speed, maxAt]);

  const state = useMemo(() => {
    if (elapsedMs <= 0 && !running) return initialRunState();
    return replayUpTo(timeline, elapsedMs);
  }, [timeline, elapsedMs, running]);

  return {
    state,
    elapsedMs,
    running,
    finished: elapsedMs >= maxAt && maxAt > 0,
    start: () => {
      startedAt.current = Date.now();
      setElapsedMs(0);
      setRunning(true);
    },
    reset: () => {
      setRunning(false);
      setElapsedMs(0);
    },
  };
}
