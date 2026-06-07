'use client';

import { useState } from 'react';
import type { TimedEvent } from '@swarm/shared';
import { useReplay } from '../lib/useReplay.ts';
import { DashboardView } from './DashboardView.tsx';

const SPEEDS = [1, 2, 4];

/** Fixture-mode controller: replays a local Fake Swarm timeline (no backend). */
export default function Dashboard({ timeline }: { timeline: TimedEvent[] }) {
  const [speed, setSpeed] = useState(2);
  const { state, running, finished, start, reset, elapsedMs } = useReplay(timeline, speed);
  const idle = !running && elapsedMs === 0;

  const plannedCount = new Set(
    timeline.filter((b) => b.event.kind === 'persona').map((b) => (b.event as { persona: { id: string } }).persona.id),
  ).size;

  return (
    <DashboardView
      state={state}
      idle={idle}
      running={running}
      finished={finished}
      modeTag="fixture replay"
      plannedCount={plannedCount}
      primaryLabel={finished ? 'Run again' : 'Unleash Swarm'}
      onPrimary={start}
      onStop={reset}
      speed={speed}
      speeds={SPEEDS}
      onSpeed={setSpeed}
    />
  );
}
