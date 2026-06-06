import type { TimedEvent } from '@swarm/shared';
import timeline from '@swarm/shared/fixtures/run-timeline.json';
import Dashboard from '../components/Dashboard.tsx';
import LiveDashboard from '../components/LiveDashboard.tsx';

// NEXT_PUBLIC_DATA_SOURCE=insforge -> live dashboard (realtime from InsForge).
// Otherwise -> fixture replay of the Fake Swarm timeline (no backend needed).
export default function Page() {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'insforge') {
    return <LiveDashboard />;
  }
  return <Dashboard timeline={timeline as unknown as TimedEvent[]} />;
}
