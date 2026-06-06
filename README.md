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
