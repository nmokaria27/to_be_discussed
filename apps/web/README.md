# apps/web — Dashboard + Report Site (Claude)

Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. One app, two surfaces.

**`/` Dashboard** — the showpiece. Build + rehearse first.
- Register app + persona selection → **Unleash Swarm** → `POST /runs` (C2).
- **Live Grid**: one tile per `simulators` row, render `stream_url` (type per SPIKE-1).
- Realtime findings feed + ticking counter via InsForge realtime (C5).
- Dev with **zero backend**: replay `@swarm/shared` `generateTimeline()` / `fixtures/run-timeline.json`, dispatching each beat by `at_ms`.

**`/r/[runId]` Report Site** — shareable, public read (FR-10).
- Reads a converged run (C6): header = Swarm Rating + totals + duration; per-persona sections = Review + Rating + that persona's findings (severity-ranked) with screenshots.
- Dev against `fixtures/run-snapshot.json` / `generateSnapshot()`.

**Going live:** swap the fixture/replay source for the InsForge realtime client + queries. Shapes are identical (C1), so components don't change.

**Contracts:** `@swarm/shared` (C1, C5, C6, C8).
