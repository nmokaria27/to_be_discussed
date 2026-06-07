# The AI Beta-Tester Swarm

Persona-diverse AI agents beta-test a mobile app on parallel real iOS simulators, hunt the UI/UX edge cases your coding agent missed, and hand you a ranked beta-test report with a Swarm Rating — before a single real user touches it.

Built on three sponsor platforms (all load-bearing): **lim.run** (simulators), **Replicas** (the swarm), **InsForge** (backend + realtime + report hosting).

- **Product:** `_bmad-output/planning-artifacts/prds/prd-to_be_discussed-2026-06-06/prd.md`
- **Architecture + contracts:** `_bmad-output/planning-artifacts/architecture.md`
- **Build plan (3 devs):** `_bmad-output/planning-artifacts/build-plan.md`

## Requirements
- Node **>= 23.6** (runs TypeScript natively via type-stripping — no build step). Verify: `node -v`.
- npm (workspaces). No `pnpm` required.

## Quickstart (zero install)
```bash
npm test          # run @swarm/shared contract tests
npm run seed      # regenerate Fake Swarm fixtures (deterministic)
```

## Run the web app
```bash
cd apps/web && npm install && npm run dev   # http://localhost:3000
```
- **Fixture mode (default, no backend):** the dashboard replays the local Fake Swarm timeline; the report reads the seeded snapshot. Works offline.
- **Live mode (InsForge):** copy `apps/web/.env.example` → `apps/web/.env.local` and fill creds from the InsForge dashboard (Install → Direct Connect → API Keys). Set `NEXT_PUBLIC_DATA_SOURCE=insforge`. Then **Unleash Swarm** calls `POST /api/runs` (the stand-in Orchestrator, contract C2), which streams a run into InsForge; the dashboard renders it live over InsForge **realtime** (C5), and the report reads it back (C6).

### InsForge backend
- Schema lives in `migrations/` (applied with `npx @insforge/cli db migrations up --all`) and mirrors `packages/shared/sql/schema.sql` (C1) plus realtime channels + publish triggers (C5).
- `InsForgeWriter` (`packages/shared/src/insforge-writer.ts`) is the real `SwarmWriter`; seed a live converged run with:
  ```bash
  node --env-file=.env packages/shared/scripts/seed-insforge.ts
  ```
- Credentials are never committed: app reads `apps/web/.env.local`, CLI reads `.insforge/project.json` (both gitignored).

## Workspace map
```
packages/shared/      @swarm/shared — contracts (C1,C5,C8), writer seam, Fake Swarm (C9)  [Claude]
  src/types.ts        C1 data model (single source of truth)
  src/personas.ts     C8 persona catalog (12 personas)
  src/fake-swarm.ts   C9 generator: generateSnapshot() + generateTimeline()
  src/writer.ts       SwarmWriter seam (fake -> real swap)
  sql/schema.sql      C1 as Postgres DDL (Dev B's first migration)
  fixtures/*.json     seeded data the Dashboard + Report build against
apps/web/             Next.js Dashboard (Live Grid) + Report Site                          [Dev B / Claude]
services/orchestrator/ Replicas + lim.run orchestration                                    [Dev A]
agents/persona/       Persona Agent + DriverAgent                                          [Dev A]
demo-app/             curated Notes/Tasks iOS app (seeded edge cases)                       [Claude]
```

## The unblocking idea
The **Fake Swarm** (`packages/shared/src/fake-swarm.ts`) emits the *exact shapes* the real Persona Agents emit (contracts C3/C4). So the Dashboard and Report Site build fully against `fixtures/` and the `SwarmWriter` seam **before** the real lim.run + Replicas integration exists. Going live is a swap, not a rewrite.

- Report Site reads `fixtures/run-snapshot.json` (a converged run).
- Dashboard replays `fixtures/run-timeline.json` (ordered live beats) to demo the Live Grid without a real swarm.

## Contracts
All cross-workstream contracts (C1–C9) are defined in `architecture.md` §9. Freeze them before diverging.

## Design
The web UI is a refined, Apple-grade minimalist system: light and airy, near-monochrome neutrals with a single blue accent, **Geist** type with tabular mono numerals, real **lucide-react** iconography (no emoji), and subtle **motion** spring animations. Components live in `apps/web/components`; tokens + styles in `apps/web/app/globals.css`.

## Web testing (Epic 7)
The swarm also tests **websites**, not just mobile. `agents/persona/src/webDriver.ts` is a Playwright-backed `DriverAgent` (same C7 interface as `LimDriver`); `webDefects.ts` is the pure, tested analyzer (alt text, accessible names, `lang`, blank render, console/network errors → battery-classed findings). Install `playwright` to run it against a live URL; the analyzer is unit-tested with no browser.
