'use client';

import { useEffect, useState } from 'react';
import { useInsforgeRun } from '../lib/useInsforgeRun.ts';
import { DashboardView } from './DashboardView.tsx';

const SWARM_SIZE = 12;

/**
 * Live-mode controller: Unleash hits POST /api/runs (the stand-in Orchestrator,
 * C2) which streams a run into InsForge; this view subscribes to that run over
 * InsForge realtime (C5) and renders it live. Same DashboardView as fixture mode.
 */
export default function LiveDashboard() {
  const [runId, setRunId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const state = useInsforgeRun(runId);

  // Subscribe to a real run launched by the orchestrator (e.g. live-swarm script):
  // open /?run=<id> to watch real lim simulators stream live.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('run');
    if (id) setRunId(id);
  }, []);

  const status = state.run?.status;
  const finished = status === 'converged';
  const running = runId != null && !finished;
  const idle = runId == null;

  const unleash = async () => {
    setLaunching(true);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: 'notes-demo', swarm_size: SWARM_SIZE }),
      });
      const json = (await res.json()) as { run_id?: string; error?: string };
      if (json.run_id) setRunId(json.run_id);
      else console.error('unleash failed', json.error);
    } catch (e) {
      console.error('unleash error', e);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <DashboardView
      state={state}
      idle={idle}
      running={running || launching}
      finished={finished}
      modeTag="live · InsForge"
      plannedCount={SWARM_SIZE}
      primaryLabel={launching ? 'Launching…' : finished ? 'Run again' : 'Unleash Swarm'}
      onPrimary={finished ? () => setRunId(null) : unleash}
    />
  );
}
