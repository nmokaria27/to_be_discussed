'use client';

import { useMemo, useState } from 'react';
import type { TimedEvent } from '@swarm/shared';
import { useReplay } from '../lib/useReplay.ts';
import {
  feedItems,
  findingCount,
  liveSimulators,
  simulatorList,
} from '../lib/runReducer.ts';
import { SimulatorTile } from './SimulatorTile.tsx';
import { FindingsFeed } from './FindingsFeed.tsx';

const SPEEDS = [1, 2, 4];

export default function Dashboard({ timeline }: { timeline: TimedEvent[] }) {
  const [speed, setSpeed] = useState(2);
  const { state, running, finished, start, reset, elapsedMs } = useReplay(timeline, speed);

  const sims = simulatorList(state);
  const feed = feedItems(state);
  const count = findingCount(state);
  const live = liveSimulators(state).length;

  const findingsPerSim = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of state.findings) m[f.simulator_id] = (m[f.simulator_id] ?? 0) + 1;
    return m;
  }, [state.findings]);

  const personaOf = (personaId: string) => {
    const p = state.personas[personaId];
    return { name: p?.display_name ?? personaId, key: p?.key ?? '' };
  };

  const idle = !running && elapsedMs === 0;
  const status = state.run?.status;

  return (
    <div className="dash">
      <header className="dash__header">
        <div className="brand">
          <span className="brand__dot" />
          <div>
            <div className="brand__name">The AI Beta-Tester Swarm</div>
            <div className="brand__tag">persona-diverse exploratory UI/UX discovery · live</div>
          </div>
        </div>

        <div className="controls">
          <div className="speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`speed__btn ${speed === s ? 'is-active' : ''}`}
                onClick={() => setSpeed(s)}
                disabled={running}
              >
                {s}×
              </button>
            ))}
          </div>
          {idle || finished ? (
            <button className="unleash" onClick={start}>
              {finished ? '↻ Run again' : '⚡ Unleash Swarm'}
            </button>
          ) : (
            <button className="unleash unleash--stop" onClick={reset}>
              ◼ Stop
            </button>
          )}
        </div>
      </header>

      <section className="stats">
        <Stat label="Issues found" value={count} big accent />
        <Stat label="Live simulators" value={live} />
        <Stat label="Personas" value={Object.keys(state.personas).length} />
        <Stat
          label="Run status"
          value={status ? status : 'idle'}
          text
        />
        {finished && state.run?.swarm_rating != null && (
          <Stat label="Swarm rating" value={`${state.run.swarm_rating}/5`} text accent />
        )}
      </section>

      <div className="dash__body">
        <main className="grid-wrap">
          {idle ? (
            <div className="idle">
              <div className="idle__big">“An AI agent built this app and said it’s done.”</div>
              <div className="idle__sub">
                Click <b>Unleash Swarm</b> to send {countPersonas(timeline)} AI beta-testers onto real iOS
                simulators and watch them find what it missed.
              </div>
            </div>
          ) : (
            <div className="grid">
              {sims.map((sim) => (
                <SimulatorTile
                  key={sim.id}
                  simulator={sim}
                  persona={state.personas[sim.persona_id]}
                  findingCount={findingsPerSim[sim.id] ?? 0}
                />
              ))}
            </div>
          )}
        </main>

        <FindingsFeed items={feed} personaOf={personaOf} />
      </div>

      {finished && (
        <div className="banner">
          The agent said “done.” The swarm found <b>{count}</b> ways real users would’ve hit a wall —
          rating it <b>{state.run?.swarm_rating}/5</b>.{' '}
          <span className="banner__note">(Report site — Epic 3 — coming next.)</span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  big,
  text,
  accent,
}: {
  label: string;
  value: number | string;
  big?: boolean;
  text?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${big ? 'stat--big' : ''} ${accent ? 'stat--accent' : ''}`}>
      <div className={`stat__value ${text ? 'stat__value--text' : ''}`}>{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

function countPersonas(timeline: TimedEvent[]): number {
  const ids = new Set<string>();
  for (const b of timeline) if (b.event.kind === 'persona') ids.add(b.event.persona.id);
  return ids.size;
}
