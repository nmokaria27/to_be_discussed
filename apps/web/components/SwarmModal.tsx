'use client';

import { FileText, Video, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Finding, Persona, Simulator } from '@swarm/shared';
import { personaIcon, SEVERITY } from '../lib/personaVisuals.ts';
import { Stars } from './Stars.tsx';

export function SwarmModal({
  simulator,
  persona,
  findings,
  onClose,
}: {
  simulator: Simulator;
  persona: Persona | undefined;
  findings: Finding[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const Icon = personaIcon(persona?.key ?? '');
  const name = persona?.display_name ?? simulator.persona_id;

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__avatar"><Icon size={18} strokeWidth={1.9} /></span>
          <div className="modal__title">
            {name}
            <div className="modal__sub">Session recording · {findings.length} finding{findings.length === 1 ? '' : 's'}</div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal__body">
          <div>
            {simulator.video_url ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video className="modal__video" src={simulator.video_url} controls autoPlay muted playsInline />
            ) : (
              <div className="modal__novideo">
                <Video size={22} />
                <span>No session recording for this simulator.</span>
              </div>
            )}
            {simulator.log_url && (
              <a className="modal__loglink" href={simulator.log_url} target="_blank" rel="noreferrer">
                <FileText size={14} /> View agent log
              </a>
            )}
          </div>

          <div>
            {persona && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Stars value={persona.rating ?? 0} />
                  {persona.rating != null && <span className="num" style={{ fontWeight: 600 }}>{persona.rating}/5</span>}
                </div>
                {persona.review_text && <div className="modal__review">“{persona.review_text}”</div>}
              </>
            )}
            <div className="findings">
              {findings.length === 0 && <div className="feed__empty">No findings.</div>}
              {findings.map((f) => {
                const sev = SEVERITY[f.severity];
                const SevIcon = sev.Icon;
                return (
                  <div key={f.id} className="rfinding">
                    <span className="rfinding__icon" style={{ background: `${sev.color}1a`, color: sev.color }}>
                      <SevIcon size={15} />
                    </span>
                    <div className="rfinding__main">
                      <div className="rfinding__top">
                        <span className="rfinding__title">{f.title}</span>
                        <span className="rfinding__sevtag" style={{ color: sev.color }}>{sev.label}</span>
                      </div>
                      <div className="rfinding__meta">
                        <span className="rfinding__chip">{f.edge_case}</span>
                      </div>
                      <div className="rfinding__repro">{f.repro_steps}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
