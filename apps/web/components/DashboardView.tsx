'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Bug,
  CircleDot,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Square,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import {
  feedItems,
  findingCount,
  liveSimulators,
  simulatorList,
  type RunState,
} from '../lib/runReducer.ts';
import { SimulatorTile } from './SimulatorTile.tsx';
import { FindingsFeed } from './FindingsFeed.tsx';
import { RecordButton } from './RecordButton.tsx';

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
          <span className="brand__mark"><ScanSearch size={21} strokeWidth={2} /></span>
          <div>
            <div className="brand__name">AI Beta-Tester Swarm</div>
            <div className="brand__tag">{modeTag}</div>
          </div>
        </div>

        <div className="controls">
          <RecordButton />
          <span className={`livepill ${running ? 'livepill--on' : ''}`}>
            <span className="livepill__dot" />
            {running ? 'Live' : finished ? 'Converged' : 'Idle'}
          </span>
          {props.onSpeed && props.speeds && (
            <div className="seg">
              {props.speeds.map((s) => (
                <button
                  key={s}
                  className={`seg__btn ${props.speed === s ? 'is-active' : ''}`}
                  onClick={() => props.onSpeed?.(s)}
                  disabled={running}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
          {running && props.onStop ? (
            <button className="btn btn--ghost" onClick={props.onStop}>
              <Square size={15} /> Stop
            </button>
          ) : (
            <button className="btn" onClick={props.onPrimary} disabled={running}>
              {finished ? <RotateCcw size={16} /> : <Zap size={16} />}
              {props.primaryLabel}
            </button>
          )}
        </div>
      </header>

      <section className="stats">
        <Stat icon={<Bug size={14} />} label="Issues found" value={count} big accent />
        <Stat icon={<Activity size={14} />} label="Live simulators" value={live} big />
        <Stat icon={<Users size={14} />} label="Personas" value={Object.keys(state.personas).length} big />
        <Stat icon={<CircleDot size={14} />} label="Run status" value={status ?? 'idle'} text />
        {finished && state.run?.swarm_rating != null && (
          <Stat icon={<Star size={14} />} label="Swarm rating" value={`${state.run.swarm_rating} / 5`} text accent />
        )}
      </section>

      <div className="dash__body">
        <main>
          {idle ? (
            <div className="idle">
              <span className="idle__icon"><Sparkles size={26} strokeWidth={1.8} /></span>
              <div className="idle__big">“An AI agent built this app and said it’s done.”</div>
              <div className="idle__sub">
                Unleash {plannedCount} persona-diverse AI beta-testers onto real iOS simulators and watch
                them find what it missed — before a single real user does.
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
          <span className="banner__text">
            The agent said “done.” The swarm found <b>{count}</b> ways real users would’ve hit a wall —
            rating it <b>{state.run?.swarm_rating} / 5</b>.
          </span>
          {state.run && (
            <Link href={`/r/${state.run.id}`} className="banner__cta">
              View full report <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  big,
  text,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  big?: boolean;
  text?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${big ? 'stat--big' : ''} ${accent ? 'stat--accent' : ''}`}>
      <div className={`stat__value ${text ? 'stat__value--text' : 'num'}`}>{value}</div>
      <div className="stat__label">{icon} {label}</div>
    </div>
  );
}
