'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Persona, Simulator } from '@swarm/shared';
import { personaEmoji } from '../lib/personaVisuals.ts';

export function SimulatorTile({
  simulator,
  persona,
  findingCount,
}: {
  simulator: Simulator;
  persona: Persona | undefined;
  findingCount: number;
}) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(findingCount);

  useEffect(() => {
    if (findingCount > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      prev.current = findingCount;
      return () => clearTimeout(t);
    }
    prev.current = findingCount;
  }, [findingCount]);

  const status = simulator.status;
  const name = persona?.display_name ?? simulator.persona_id;
  const key = persona?.key ?? '';

  return (
    <motion.div
      className={`tile tile--${status} ${flash ? 'tile--flash' : ''}`}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="tile__bar">
        <span className="tile__emoji">{personaEmoji(key)}</span>
        <span className="tile__name">{name}</span>
        <span className={`tile__status tile__status--${status}`}>{status}</span>
      </div>

      <div className="tile__screen">
        {status === 'down' ? (
          <div className="tile__down">⚠ simulator down</div>
        ) : status === 'booting' ? (
          <div className="tile__boot">booting iOS…</div>
        ) : (
          <div className="tile__phone">
            <div className="tile__scan" />
            <div className="tile__glyph">{personaEmoji(key)}</div>
            <div className="tile__sub">exploring</div>
          </div>
        )}
        {findingCount > 0 && status !== 'down' && (
          <div className="tile__bugs">🐛 {findingCount}</div>
        )}
      </div>
    </motion.div>
  );
}
