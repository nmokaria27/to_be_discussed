---
title: Build Plan — The AI Beta-Tester Swarm (2 devs: Dev A + Claude)
status: draft
created: 2026-06-06
updated: 2026-06-06
related: architecture.md, prds/prd-to_be_discussed-2026-06-06/prd.md
---

# Build Plan — 2 Devs

Demo-first. Contracts (C1–C9) live in `architecture.md` §9 and are frozen. The **Fake Swarm (C9)** lets the frontend/data work proceed without waiting on the sponsor integration.

## Who owns what

| Dev | Workstream | Why |
|-----|------------|-----|
| **Dev A** (human) | **Swarm & Sponsors** — Orchestrator, Replicas, lim.run, Persona Agents, DriverAgent, `InsForgeWriter` | The one uncertain thing: real agents driving real simulators via two unfamiliar sponsor APIs. Owns SPIKE-1/2. |
| **Claude** (AI) | **Everything else** — shared pkg + Fake Swarm (done), InsForge schema/realtime/data layer, Dashboard (Live Grid + feed), Report Site, demo app | Broad, well-specified surface fully unblocked by frozen contracts + fixtures. |

## Phase 0 — Contracts & Spikes (Day 0) → milestone M1

**Claude** ✅ shipped (this commit)
- [x] pnpm/npm monorepo scaffold (`packages/shared`, `apps/web`, `services/orchestrator`, `agents/persona`, `demo-app/`)
- [x] `packages/shared`: TS types (C1), persona catalog (C8), InsForge writer seam, **Fake Swarm seeder (C9)** + deterministic fixtures
- [x] `packages/shared/sql/schema.sql` — C1 as Postgres DDL (the migration to apply)
- [x] Contract tests (8/8 green): `npm test`

**Claude** (next)
- [ ] Apply InsForge migration (`schema.sql`); create storage bucket `findings/`; wire realtime channels (C5)
- [ ] SPIKE-3: write→realtime→browser latency; confirm "live" feel
- [ ] Implement `InsForgeWriter implements SwarmWriter` (Dev A consumes it from the agents)

**Dev A**
- [ ] SPIKE-1 (lim.run): max concurrent sims, app-install path, live-view type+latency, a11y tree availability
- [ ] SPIKE-2 (Replicas): VM spawn latency for 8–12, persona config + sim-binding injection, outbound net to InsForge+lim.run
- [ ] Post spike verdicts → set final **swarm size** and **drive mechanism** (hybrid vs vision-only)
- [ ] Provide a `POST /runs` **stub** so the Dashboard can call it Day 0

## Phase 1 — Parallel Verticals → milestone M2

**Claude** (build the showpiece first, rehearse it)
- [ ] Dashboard shell + Unleash button → `POST /runs` (C2)
- [ ] **Live Grid**: N tiles from `simulators` rows, render `stream_url` (type per SPIKE-1)
- [ ] Realtime findings feed + ticking counter (C5) — driven by **Fake Swarm timeline**
- [ ] Report Site `/r/[runId]`: Swarm Rating header + per-persona reviews + ranked findings + screenshots (C6) — against seeded snapshot
- [ ] Demo app (Notes/Tasks, SwiftUI): core screens + InsForge auth/data; seed edge cases

**Dev A** (N=1 real vertical slice)
- [ ] Orchestrator: create run → provision 1 sim + 1 VM → bind → launch 1 Persona Agent
- [ ] DriverAgent impl (per SPIKE-1) behind interface (C7); test vs FakeDriver first
- [ ] One persona drives the real demo app, captures **1 real Finding** via `InsForgeWriter` (C3)

## Phase 2 — Scale the Swarm → milestone M3

- [ ] **Dev A**: 1→N personas; all explore; real Reviews+Ratings (C4); tune vision defect-detection; partial-swarm start (FR-1); teardown on converge
- [ ] **Claude**: swap Fake Swarm → live InsForge client (same shapes; minimal change); Swarm Rating computed on converge (FR-13)

## Phase 3 — Demo Hardening → milestone M4

- [ ] Wire the 90s demo script (PRD §10)
- [ ] Seed guaranteed bugs (FR-11) for on-stage determinism (keep realistic — SM-C2)
- [ ] 3 clean consecutive rehearsal runs (SM-1)
- [ ] Quota/cost check for demo-day swarm size (OQ-1)
- [ ] Run `hackathon-judge` on the built product (SM-5)

## Milestones
- **M1** (end P0): seeded run in Dashboard + Report; spike verdicts set swarm size + drive mechanism
- **M2** (end P1): N=1 real persona finds a real bug end-to-end; grid live; report renders
- **M3** (end P2): full swarm, real findings + reviews, fake→real swapped
- **M4** (end P3): bulletproof 90s demo, 3 clean rehearsals, judge check passed

## Hard dependencies
- Everything ← C1 (schema) + C9 (Fake Swarm): **shipped.**
- Dashboard `POST /runs` ← Orchestrator C2 stub (Dev A provides Day 0).
- Real swarm integration ← SPIKE-1/2 verdicts; consumed via the `SwarmWriter` seam.
