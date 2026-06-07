'use client';

import { motion } from 'motion/react';
import { Bug, CheckCircle2, Smartphone, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Persona, Simulator } from '@swarm/shared';
import { personaIcon } from '../lib/personaVisuals.ts';

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

  const name = persona?.display_name ?? simulator.persona_id;
  const Icon = personaIcon(persona?.key ?? '');

  // The persona's lifecycle drives the tile state, not just the sim's.
  const done = persona?.status === 'done';
  const crashed = persona?.status === 'crashed' || simulator.status === 'down';
  const booting = !done && !crashed && simulator.status === 'booting';
  const exploring = !done && !crashed && !booting; // persona still working

  const phase = crashed ? 'down' : done ? 'done' : booting ? 'booting' : 'live';

  // Live device frames: poll the real simulator screenshot while exploring; freeze
  // the last frame once done.
  const realSim = /^ios_[a-z0-9_]+$/i.test(simulator.lim_handle);
  const [tick, setTick] = useState(0);
  const [frameOk, setFrameOk] = useState(true);
  useEffect(() => {
    if (!exploring || !realSim) return;
    const id = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(id);
  }, [exploring, realSim]);
  const showFrame = realSim && frameOk && (exploring || done);

  return (
    <motion.div
      className={`tile tile--${phase} ${flash ? 'tile--flash' : ''}`}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="tile__bar">
        <span className="tile__avatar"><Icon size={16} strokeWidth={1.9} /></span>
        <span className="tile__name">{name}</span>
        <span className={`tile__status tile__status--${phase}`}>
          {phase === 'done' ? <CheckCircle2 size={12} /> : <span className="dot" />}
          {phase === 'done' ? 'done' : phase === 'down' ? 'down' : phase === 'booting' ? 'booting' : 'live'}
        </span>
      </div>

      <div className="tile__screen">
        {crashed ? (
          <span className="tile__down-label"><TriangleAlert size={14} /> simulator down</span>
        ) : booting ? (
          <div className="tile__device"><Smartphone className="ph" size={26} strokeWidth={1.5} /><span className="sub">booting iOS…</span></div>
        ) : showFrame ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="tile__frame"
              src={`/api/frame/${simulator.lim_handle}?t=${tick}`}
              alt={`${name} live screen`}
              onError={() => setFrameOk(false)}
            />
            {exploring && <div className="tile__scan" />}
          </>
        ) : (
          <>
            {exploring && <div className="tile__scan" />}
            <div className="tile__device">
              <Icon className="ph" size={30} strokeWidth={1.5} />
              <span className="sub">{done ? 'done' : 'exploring'}</span>
            </div>
          </>
        )}
        {findingCount > 0 && !crashed && (
          <span className="tile__bugs"><Bug size={12} /> {findingCount}</span>
        )}
      </div>
    </motion.div>
  );
}
