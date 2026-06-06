'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { FeedItem } from '../lib/runReducer.ts';
import { personaEmoji, SEVERITY_COLOR } from '../lib/personaVisuals.ts';

export function FindingsFeed({
  items,
  personaOf,
}: {
  items: FeedItem[];
  personaOf: (personaId: string) => { name: string; key: string };
}) {
  return (
    <aside className="feed">
      <div className="feed__head">
        <h2>Findings</h2>
        <span className="feed__sub">most severe first</span>
      </div>
      <div className="feed__list">
        {items.length === 0 && <div className="feed__empty">No findings yet…</div>}
        <AnimatePresence initial={false}>
        {items.map((item) => {
          const p = personaOf(item.finding.persona_id);
          return (
            <motion.div
              key={item.groupKey}
              className="finding"
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <span
                className="finding__sev"
                style={{ background: SEVERITY_COLOR[item.finding.severity] }}
                title={item.finding.severity}
              />
              <div className="finding__body">
                <div className="finding__title">{item.finding.title}</div>
                <div className="finding__meta">
                  <span>
                    {personaEmoji(p.key)} {p.name}
                  </span>
                  <span className="finding__edge">{item.finding.edge_case}</span>
                  {item.count > 1 && <span className="finding__count">×{item.count}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </aside>
  );
}
