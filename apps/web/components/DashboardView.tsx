'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  feedItems,
  findingCount,
  liveSimulators,
  simulatorList,
  type RunState,
} from '../lib/runReducer.ts';
import { SimulatorTile } from './SimulatorTile.tsx';
import { FindingsFeed } from './FindingsFeed.tsx';

export interface DashboardViewProps {
  state: RunState;
  idle: boolean;
  running: boolean;
  finished: boolean;
  modeTag: string;
  plannedCount: number;
  primaryLabel: string;
  onPrimary: () => void;
  onStop?: () => void;
  speed?: number;
  speeds?: number[];
  onSpeed?: (n: number) => void;
}

export function DashboardView(props: DashboardViewProps) {
  const { state, idle, running, finished, modeTag, plannedCount } = props;
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

  const status = state.run?.status;

  return (
    <div className="dash">
      <header className="dash__header">
        <div className="brand">
          <span className="brand__dot" />
          <div>
            <div className="brand__name">The AI Beta-Tester Swarm</div>
            <div className="brand__tag">persona-diverse exploratory UI/UX discovery · {modeTag}</div>
          </div>
        </div>

        <div className="controls">
          {props.onSpeed && props.speeds && (
            <div className="speed">
              {props.speeds.map((s) => (
                <button
                  key={s}
                  className={`speed__btn ${props.speed === s ? 'is-active' : ''}`}
                  onClick={() => props.onSpeed?.(s)}
                  disabled={running}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
          {!running || !props.onStop ? (
            <button className="unleash" onClick={props.onPrimary} disabled={running}>
              {props.primaryLabel}
            </button>
          ) : (
            <button className="unleash unleash--stop" onClick={props.onStop}>
              ◼ Stop
            </button>
          )}
        </div>
      </header>

      <section className="stats">
        <Stat label="Issues found" value={count} big accent />
        <Stat label="Live simulators" value={live} />
        <Stat label="Personas" value={Object.keys(state.personas).length} />
        <Stat label="Run status" value={status ? status : 'idle'} text />
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
                Click <b>Unleash Swarm</b> to send {plannedCount} AI beta-testers onto real iOS simulators
                and watch them find what it missed.
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
          <span>
            The agent said “done.” The swarm found <b>{count}</b> ways real users would’ve hit a wall —
            rating it <b>{state.run?.swarm_rating}/5</b>.
          </span>
          {state.run && (
            <Link href={`/r/${state.run.id}`} className="banner__cta">
              View full report →
            </Link>
          )}
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
