import Link from 'next/link';
import { ArrowLeft, Bug, CheckCircle2, Clock, ImageOff, Users } from 'lucide-react';
import type { RunSnapshot } from '@swarm/shared';
import { insforgeConfigFromEnv, loadRunSnapshot } from '@swarm/shared';
import snapshotJson from '@swarm/shared/fixtures/run-snapshot.json';
import { personaSections, reportSummary } from '../../../lib/report.ts';
import { personaIcon, SEVERITY } from '../../../lib/personaVisuals.ts';
import { Stars } from '../../../components/Stars.tsx';

const fixtureSnapshot = snapshotJson as unknown as RunSnapshot;

// Reads from InsForge when configured (NEXT_PUBLIC_DATA_SOURCE=insforge), else
// (or on miss) the Fake Swarm fixture. Identical shaping + markup either way.
async function getSnapshot(runId: string): Promise<{ snapshot: RunSnapshot; source: string }> {
  const cfg = insforgeConfigFromEnv(process.env);
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'insforge' && cfg) {
    try {
      const live = await loadRunSnapshot(cfg, runId);
      if (live) return { snapshot: live, source: 'insforge' };
    } catch (err) {
      console.error('InsForge read failed, falling back to fixture:', err);
    }
  }
  return { snapshot: fixtureSnapshot, source: 'fixture' };
}

function screenOf(screenKey: string | null, edge: string): string {
  if (!screenKey) return edge;
  return screenKey.split(':')[2] ?? edge;
}

export default async function ReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { snapshot, source } = await getSnapshot(runId);
  const summary = reportSummary(snapshot);
  const sections = personaSections(snapshot);

  return (
    <div className="report">
      <div className="report__crumb">
        <Link href="/" className="report__back"><ArrowLeft size={15} /> Dashboard</Link>
        <span className="report__runid">{summary.runId} · {source === 'insforge' ? 'live · InsForge' : 'fixture'}</span>
      </div>

      <h1>Beta-Test Report</h1>
      <p className="report__app">
        <b>{summary.appId}</b> · tested by a persona-diverse AI swarm before a single real user.
      </p>

      <div className="report__verdict">
        <div>
          <div className="verdict__num num">{summary.swarmRating ?? '–'}<span> / 5</span></div>
          <div style={{ marginTop: 8 }}><Stars value={summary.swarmRating ?? 0} size={20} /></div>
          <div className="verdict__caption">Swarm Rating · {summary.personaCount} testers</div>
        </div>
        <div className="verdict__chips">
          <Chip icon={<Bug size={15} />} value={summary.totalFindings} label="issues" accent />
          <Chip icon={<Users size={15} />} value={summary.personaCount} label="personas" />
          <Chip icon={<Clock size={15} />} value={`${summary.durationSec}s`} label="run time" />
        </div>
      </div>

      <main className="report__sections">
        {sections.map(({ persona, findings }) => {
          const PIcon = personaIcon(persona.key);
          return (
            <section key={persona.id} className="psection">
              <div className="psection__head">
                <span className="psection__avatar"><PIcon size={19} strokeWidth={1.8} /></span>
                <div className="psection__id">
                  <div className="psection__name">{persona.display_name}</div>
                  <Stars value={persona.rating ?? 0} />
                </div>
                <div className="psection__count num">
                  {findings.length} {findings.length === 1 ? 'issue' : 'issues'}
                </div>
              </div>

              {persona.review_text && <div className="psection__review">“{persona.review_text}”</div>}

              {findings.length === 0 ? (
                <div className="psection__clean"><CheckCircle2 size={16} /> No issues — clean run for this persona.</div>
              ) : (
                <ul className="findings">
                  {findings.map((f) => {
                    const sev = SEVERITY[f.severity];
                    const SevIcon = sev.Icon;
                    return (
                      <li key={f.id} className="rfinding">
                        <span className="rfinding__icon" style={{ background: `${sev.color}1a`, color: sev.color }}>
                          <SevIcon size={16} />
                        </span>
                        <div className="rfinding__main">
                          <div className="rfinding__top">
                            <span className="rfinding__title">{f.title}</span>
                            <span className="rfinding__sevtag" style={{ color: sev.color }}>{sev.label}</span>
                          </div>
                          <div className="rfinding__meta">
                            <span className="rfinding__chip">{f.edge_case}</span>
                            <span className="rfinding__chip">{screenOf(f.screen_key, f.edge_case)}</span>
                          </div>
                          <div className="rfinding__repro">{f.repro_steps}</div>
                        </div>
                        <div className="rfinding__shot" title={f.screenshot_url}>
                          <ImageOff size={16} />
                          <span>{screenOf(f.screen_key, f.edge_case)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </main>

      <footer className="report__footer">
        Shareable report · anyone with this link can view it. Generated by the AI Beta-Tester Swarm.
      </footer>
    </div>
  );
}

function Chip({ icon, value, label, accent }: { icon: React.ReactNode; value: number | string; label: string; accent?: boolean }) {
  return (
    <div className={`rchip ${accent ? 'rchip--accent' : ''}`}>
      <div className="rchip__value num">{value}</div>
      <div className="rchip__label">{icon} {label}</div>
    </div>
  );
}
