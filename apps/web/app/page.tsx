import type { TimedEvent } from '@swarm/shared';
import timeline from '@swarm/shared/fixtures/run-timeline.json';
import Dashboard from '../components/Dashboard.tsx';

// Epic 2 runs on the Fake Swarm (C9). Swap this import for an InsForge realtime
// subscription when the real swarm lands — the reducer + UI are unchanged.
export default function Page() {
  return <Dashboard timeline={timeline as unknown as TimedEvent[]} />;
}
