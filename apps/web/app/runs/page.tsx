import Link from 'next/link';
import { ArrowLeft, FileText, MonitorPlay } from 'lucide-react';
import type { Run } from '@swarm/shared';
import { insforgeConfigFromEnv, loadRuns } from '@swarm/shared';

export const dynamic = 'force-dynamic';

// Previous runs + reports (persisted in InsForge). Each run's report lives at
// /r/<id>; live re-watch at /?run=<id>.
async function getRuns(): Promise<Run[]> {
  const cfg = insforgeConfigFromEnv(process.env);
  if (!cfg) return [];
  try {
    return await loadRuns(cfg, 40);
  } catch (err) {
    console.error('loadRuns failed:', err);
    return [];
  }
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function RunsPage() {
  const runs = await getRuns();
  return (
    <div className="report">
      <div className="report__crumb">
        <Link href="/" className="report__back"><ArrowLeft size={15} /> Dashboard</Link>
        <span className="report__runid">{runs.length} run{runs.length === 1 ? '' : 's'} · InsForge</span>
      </div>
      <h1>Run history</h1>
      <p className="report__app">Every swarm run and its beta-test report, stored in InsForge.</p>

      {runs.length === 0 ? (
        <div className="psection" style={{ marginTop: 24 }}>No runs yet — unleash the swarm from the dashboard.</div>
      ) : (
        <div className="runs">
          {runs.map((r) => (
            <div key={r.id} className="runrow">
              <div className={`runrow__status runrow__status--${r.status}`}>{r.status}</div>
              <div className="runrow__main">
                <div className="runrow__title num">{r.swarm_rating != null ? `${r.swarm_rating} / 5` : '—'}<span className="runrow__sub"> · {r.swarm_size} personas · {r.app_id}</span></div>
                <div className="runrow__when">{when(r.started_at)} · <span className="num">{r.id}</span></div>
              </div>
              <div className="runrow__actions">
                <Link className="runrow__btn" href={`/r/${r.id}`}><FileText size={14} /> Report</Link>
                <Link className="runrow__btn" href={`/?run=${r.id}`}><MonitorPlay size={14} /> Watch</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="report__footer">Runs and reports are persisted in InsForge (Postgres); session frames/videos live in InsForge Storage.</footer>
    </div>
  );
}
