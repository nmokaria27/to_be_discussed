---
stepsCompleted: [1]
mode: fast-draft
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-to_be_discussed-2026-06-06/prd.md
  - _bmad-output/planning-artifacts/briefs/brief-to_be_discussed-2026-06-06/brief.md
  - _bmad-output/brainstorming/brainstorming-session-2026-06-06-102104.md
workflowType: 'architecture'
project_name: 'The AI Beta-Tester Swarm'
user_name: 'Sri'
date: '2026-06-06'
---

# Architecture Decision Document — The AI Beta-Tester Swarm

> Fast-draft for a days-runway hackathon prototype. Decisions are pragmatic and demo-first. `[ASSUMPTION]` and `[SPIKE]` tags flag what must be confirmed. The build plan (§12) divides work across **2 devs (Dev A + Claude)**, with explicit contracts (§9) so both build in parallel from day one.

## 1. Architecture at a Glance

A single-page web **Dashboard** (Next.js/Vercel) triggers a **Run**. An **Orchestrator** provisions, per persona, one **lim.run iOS simulator** and one **Replicas VM** running a **Persona Agent**. Each agent drives its bound simulator (hybrid: accessibility-tree navigation + vision defect-detection), captures **Findings** and a final **Persona Review+Rating**, and writes them to **InsForge** (Postgres + storage). The Dashboard subscribes to InsForge **realtime** to render the **Live Grid** + findings feed. On convergence the **Report Site** (Next.js/Vercel, reads InsForge) renders the shareable, ranked report with the headline **Swarm Rating**.

```
                    ┌─────────────────────────────────────────────┐
                    │  Dashboard (Next.js/Vercel)                  │
   operator ─────▶  │  • register app • Unleash Swarm              │
                    │  • Live Grid (N tiles) • findings counter    │
                    └───────┬─────────────────────▲────────────────┘
                            │ POST /runs           │ realtime subscribe
                            ▼                       │ (findings, run status)
                    ┌───────────────┐        ┌──────┴───────────────────┐
                    │ Orchestrator  │        │  InsForge                 │
                    │ (Replicas API)│───────▶│  Postgres: runs, personas │
                    │ provision+bind│ writes │   simulators, findings,   │
                    └───┬───────┬───┘ status │   reviews                 │
          spawn VM /    │       │ provision  │  Storage: screenshots     │
          bind sim      │       │ simulator  │  Realtime: channels       │
                        ▼       ▼            │  Hosting/Edge: (option)   │
              ┌─────────────┐ ┌────────────┐ └──────────▲────────────────┘
              │ Replicas VM │ │ lim.run    │            │ writes findings+reviews
              │ Persona     │─│ iOS sim    │────────────┘
              │ Agent       │ │ (1 per     │
              │ (DriverAgent│ │  persona)  │   ┌──────────────────────────┐
              └─────────────┘ └─────┬──────┘   │ Report Site (Next.js)    │
                                    │ drives   │ reads InsForge → ranked  │
                          ┌─────────▼────────┐ │ report, Swarm Rating,    │
                          │ Demo App (iOS,   │ │ per-persona reviews,     │
                          │ InsForge backend)│ │ shareable URL            │
                          └──────────────────┘ └──────────────────────────┘
```

## 2. Components & Responsibilities

| Component | Responsibility | Tech | Owner (§12) |
|-----------|----------------|------|-------------|
| **Dashboard** | Register app, Unleash Swarm, render Live Grid + realtime findings feed + counter | Next.js, Vercel, InsForge realtime client | Claude |
| **Orchestrator** | On run create: provision N simulators (lim.run) + N VMs (Replicas), bind 1:1, launch agents, track run lifecycle, teardown | Node/TS service (Replicas API + lim.run API) | Dev A |
| **Persona Agent** | Embody one persona; explore the app via DriverAgent; capture Findings + final Review; write to InsForge | Python or TS agent on Replicas VM | Dev A |
| **DriverAgent** | Abstraction: perceive screen (a11y tree + screenshot), choose+execute actions, detect visual defects | Interface + impl; pluggable | Dev A |
| **InsForge data layer** | Schema, storage buckets, realtime channels, `InsForgeWriter`, RLS/access for demo | InsForge (Postgres/storage/realtime) | Claude |
| **Report Site** | Render ranked, grouped report from InsForge data; shareable URL | Next.js, Vercel | Claude |
| **Demo App** | Curated Notes/Tasks iOS app w/ seeded edge cases; InsForge backend | SwiftUI (or RN) iOS app + InsForge | Claude |
| **Glue/SDK/mocks** | Shared TS types, InsForge client wrapper, the Fake Swarm seeder, env/secrets scaffold | TS package | Claude (done) |

## 3. Sponsor Integration Design (load-bearing)

### 3.1 lim.run — the simulators
- Orchestrator calls lim.run to spin up **N iOS simulators** per run; installs/launches the demo app build on each.
- Each simulator exposes: a **live screen surface** (frames/stream) for the Grid, and an **input channel** (tap/type/gesture by coordinate, and ideally the **accessibility tree**).
- `[SPIKE-1]` Confirm: max concurrent simulators on our plan; how to load the app build; what live-view the API exposes (stream vs periodic screenshot) and its latency; whether the a11y/UI hierarchy is queryable. **This spike gates the swarm size and the drive mechanism — do it first.**

### 3.2 Replicas — the swarm
- Orchestrator uses Replicas API to spawn **N VMs**, one per persona. Each VM runs the Persona Agent code, holds the persona prompt/config, and is bound to exactly one lim.run simulator (pass the simulator handle as VM env/arg).
- Agents write directly to InsForge (preferred) using the InsForge SDK + a run-scoped key, OR post to a thin Orchestrator collector endpoint that writes to InsForge. **Decision: agents write directly to InsForge** (fewer hops, realtime-native). `[ASSUMPTION: InsForge issues a usable write credential the agent VM can hold for the run.]`
- `[SPIKE-2]` Confirm: VM spawn latency for 8–12 VMs, how to inject persona config + simulator binding, outbound network from VM to InsForge + lim.run.

### 3.3 InsForge — backend, realtime, delivery
- **Postgres** stores the data model (§4). **Storage** holds screenshots. **Realtime** channels push findings/run-status to the Dashboard. **Auth + Postgres** also back the **demo app** (so the swarm hits real auth/empty/large-data paths).
- Report site reads InsForge (via SDK or REST). Hosting/edge functions on InsForge are optional since the frontend is on Vercel; we use InsForge for data/realtime/storage. (Keeps the all-sponsor story while using the faster frontend path.)

## 4. Data Model (InsForge / Postgres)

Shared contract — **Dev B owns the migration; everyone codes to these shapes.**

```
runs
  id            uuid pk
  app_id        text            -- which App-Under-Test (MVP: 'notes-demo')
  status        text            -- 'pending'|'provisioning'|'running'|'converged'|'failed'
  swarm_size    int
  swarm_rating  numeric null    -- mean of persona ratings, set on converge
  started_at    timestamptz
  converged_at  timestamptz null

personas            -- catalog (static seed) + per-run instances
  id            uuid pk
  run_id        uuid fk -> runs.id
  key           text            -- 'rage_tapper','offline_commuter','power_user_10k',
                                --  'long_name_rtl','accessibility','tiny_screen', ...
  display_name  text
  target_edge_cases text[]      -- battery classes this persona targets
  status        text            -- 'provisioning'|'exploring'|'done'|'crashed'
  rating        int null        -- 1..5, set when review produced
  review_text   text null

simulators
  id            uuid pk
  run_id        uuid fk
  persona_id    uuid fk
  lim_handle    text            -- lim.run instance id
  stream_url    text null       -- live-view surface for the Grid
  status        text            -- 'booting'|'live'|'down'

findings
  id            uuid pk
  run_id        uuid fk
  persona_id    uuid fk
  simulator_id  uuid fk
  edge_case     text            -- battery class (FR-5 enum)
  severity      text            -- 'critical'|'high'|'medium'|'low'
  title         text
  repro_steps   text
  screenshot_url text           -- InsForge storage
  screen_key    text null       -- for dedup grouping (persona,edge_case,screen)
  created_at    timestamptz
```

**Realtime channels:** `run:{run_id}:status` (run + persona + simulator status), `run:{run_id}:findings` (new findings). Dashboard subscribes to both.

**Edge-case enum (FR-5):** `empty_state | overflow | long_name_rtl | offline | slow_network | rapid_tap | tiny_screen | accessibility | large_data | auth_expiry`.

## 5. Key Flow — Unleash → Report

1. Operator clicks **Unleash Swarm** → Dashboard `POST /runs {app_id, swarm_size, persona_keys[]}`.
2. Orchestrator creates `runs` row (`provisioning`) + `personas` rows; returns `run_id`. Dashboard subscribes to realtime channels and navigates to the Grid.
3. Orchestrator, per persona: provision lim.run sim → create `simulators` row (`booting`→`live`, set `stream_url`) → spawn Replicas VM bound to that sim → launch Persona Agent. Partial success OK (FR-1).
4. Run → `running`. Grid renders one tile per `simulators` row using `stream_url`.
5. Persona Agent loop: perceive → decide → act → on defect, upload screenshot to storage + insert `findings` row (realtime pushes to Dashboard; counter ticks). Continues to time/step budget (OQ-6).
6. Agent end: write `personas.rating` + `review_text`. Mark persona `done`.
7. When all personas `done`/`crashed`: Orchestrator sets `runs.status='converged'`, computes `swarm_rating`, teardown sims+VMs.
8. Report Site reads the converged run → renders Swarm Rating + ranked/grouped findings + per-persona reviews at a shareable URL.

## 6. Persona Agent & DriverAgent Design

- **Persona Agent** = a loop with a persona config (system prompt + `target_edge_cases` + behavior knobs, e.g. rage-tapper taps fast/repeatedly; offline toggles network; power-user seeds 10k items).
- **DriverAgent interface** (decouples persona logic from lim.run — lets Claude/Dev A test personas against a fake driver without a real simulator):
  ```ts
  interface DriverAgent {
    observe(): Promise<{ screenshot: Buffer; a11yTree?: UiNode[] }>
    act(action: Action): Promise<void>   // tap(x,y)|tapNode(id)|type(text)|gesture|setNetwork(state)
    detectVisualDefects(obs): Promise<DefectHint[]>  // vision pass: overlap, clipping, contrast, blank
  }
  ```
- **Hybrid mechanism (chosen):** a11y tree drives reliable navigation/tapping; a vision pass on the screenshot flags visual defects (overlap/clipping/contrast/blank) → these become Findings. `[SPIKE-1 dependency]` if lim.run can't expose the a11y tree, fall back to **vision-only** (tap by coordinate) — the interface stays the same, only the impl changes.
- **Decision loop:** vision/LLM proposes the next action toward the persona's target edge cases (exploratory, non-deterministic — FR-4). Budget-bounded.

## 7. Live Grid & Realtime

- Grid = N tiles; each renders its simulator `stream_url`. `[SPIKE-1]` decides stream type: if true stream → `<video>`/canvas; if periodic frames → poll/refresh image at ~1–2s. Counter + feed driven by `run:{id}:findings` subscription.
- Degrade: a `simulators.status='down'` tile shows an error state but the Grid and run continue (NFR resilience).

## 8. Report Generation

- Static-ish Next.js page at `/r/{run_id}` reads converged run from InsForge. Renders: header (Swarm Rating, totals, duration), then per-persona sections (review + rating + that persona's findings, severity-ranked), screenshots from storage. Public read (FR-10). No video in MVP.

## 9. Interface Contracts (the parallelization backbone)

These freeze on **Day 0** so all three devs build against stable seams without waiting on each other.

| # | Contract | Producer → Consumer | Definition |
|---|----------|---------------------|------------|
| C1 | **InsForge schema** (§4) | Dev B → all | Tables, enums, channels. Migration committed first. |
| C2 | **`POST /runs`** | Dashboard (Dev B) → Orchestrator (Dev A) | `{app_id, swarm_size, persona_keys[]}` → `{run_id}`. |
| C3 | **Finding write shape** | Persona Agent (Dev A) → InsForge (C1) | Exact `findings` row + screenshot upload to storage bucket `findings/{run_id}/{finding_id}.png`. |
| C4 | **Review write shape** | Persona Agent (Dev A) → InsForge | `personas.rating` (1..5) + `review_text`, persona lens-appropriate. |
| C5 | **Realtime event shapes** | InsForge → Dashboard (Dev B) | Channel names + row payloads per §4. |
| C6 | **Report read contract** | InsForge → Report Site (Claude) | Query converged run + personas + findings; render shapes per §8. |
| C7 | **DriverAgent interface** (§6) | Dev A (+Claude) | Lets persona logic be tested against a FakeDriver. |
| C8 | **Persona catalog** | shared seed | `persona_keys` + display names + `target_edge_cases` (PRD FR-3). |
| C9 | **Shared TS types + InsForge client + Fake Swarm seeder** | Claude → all | npm-local package: types from C1, a client wrapper, and a seeder that writes synthetic runs/findings/reviews so Dashboard + Report can build with zero dependency on the real swarm. |

**Unblocking move:** C9's **Fake Swarm** is the keystone — once Claude ships it (Day 0–1), Dev B (dashboard/report-realtime) and Claude (report site) develop fully against seeded data while Dev A de-risks the real lim.run+Replicas path. Integration is then "swap the fake for the real writer," because both write the same C3/C4 shapes.

## 10. Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind, deployed on **Vercel**. Dashboard + Report Site (one app, two routes: `/` grid, `/r/[runId]` report).
- **Backend:** **InsForge** — Postgres, storage, realtime, auth (demo app).
- **Orchestrator:** Node/TS service (could run on a Replicas VM or a small host) using Replicas API + lim.run API.
- **Persona Agent:** TS (shared types) or Python on Replicas VMs; LLM for decision + vision (`[ASSUMPTION: use the latest Claude vision-capable model for observe→act + defect detection]`).
- **Demo app:** SwiftUI iOS app, InsForge backend. `[ASSUMPTION: SwiftUI over React Native for cleaner lim.run iOS build; confirm vs RN if team prefers JS.]`
- **Shared:** TS monorepo (pnpm workspaces) — `packages/shared` (C9), `apps/web`, `services/orchestrator`, `agents/persona`, `demo-app/`.

## 11. Risks & Spikes (do these first — demo-first de-risk)

| Risk | Spike | Owner |
|------|-------|-------|
| lim.run can't do N concurrent sims / no usable live view / no a11y tree | **SPIKE-1** (gates swarm size + drive mechanism) | Dev A |
| Replicas spawn too slow / can't bind sim / no outbound net | **SPIKE-2** | Dev A |
| InsForge realtime latency too high for "live" feel | **SPIKE-3** (write→dashboard round-trip) | Claude |
| Vision defect-detection too noisy/slow | tune in persona-agent build; FakeDriver first | Dev A (Claude assists) |
| 12-sim grid janks the browser | cap at proven N from SPIKE-1; virtualize tiles | Claude |

**Rule:** SPIKE-1 + SPIKE-2 results can force swarm size down from 12 and flip hybrid→vision-only. The DriverAgent interface (C7) and partial-swarm start (FR-1) absorb that without redesign.

## 12. Build Plan — 2 Devs (Dev A + Claude)

### Workstream ownership
- **Dev A (human) — Swarm & Sponsors:** Orchestrator, Replicas spawn/bind, lim.run integration, Persona Agents + DriverAgent (real impl), the `InsForgeWriter` impl of the `SwarmWriter` seam. Owns SPIKE-1/2. *The highest-risk, highest-judgment workstream — external sponsor integration.*
- **Claude (AI dev) — Everything else (App, Data & Experience):** shared package + Fake Swarm (C9, done), InsForge schema/realtime/data layer (SPIKE-3), the Next.js **Dashboard** (Live Grid + feed + Unleash → `POST /runs` client), the **Report Site**, and the curated Notes/Tasks **demo app**. High-volume, well-specified code suited to an AI dev.

*Two-dev split rationale: the human concentrates on the one genuinely uncertain thing — driving real simulators with a real agent swarm via two unfamiliar sponsor APIs. The AI dev takes the broad, well-specified surface (frontend, data layer, demo app) that's fully unblocked by the frozen contracts + Fake Swarm.*

### Sequencing (demo-first; the Live Grid is the showpiece)

**Phase 0 — Contracts & spikes (Day 0).** Contracts C1–C9 frozen (this doc). Claude has shipped C9 (shared types + Fake Swarm + fixtures + SQL schema) — **done**. Dev A starts SPIKE-1/2. Claude applies the InsForge schema migration + SPIKE-3. *Exit: schema live, fake data flowing, spike verdicts in.*

**Phase 1 — Parallel verticals (against contracts).**
- Claude: Dashboard renders Live Grid + realtime feed **from Fake Swarm data** (real-looking demo without the real swarm — the showpiece; build + rehearse first); Report Site renders a seeded converged run; demo app with seeded edge cases.
- Dev A: Orchestrator provisions 1 real sim + 1 real VM, one Persona Agent driving the real demo app, writing **one real Finding** via the `InsForgeWriter` (C3). Vertical slice on N=1.

**Phase 2 — Scale the swarm.** Dev A scales 1→N (8–12 or SPIKE-capped), all personas, real reviews (C4). Claude swaps Dashboard + Report from Fake Swarm to the live InsForge client (same shapes → minimal change). Tune vision defect-detection together.

**Phase 3 — Demo hardening.** Wire the 90s script (§10 PRD). Seed guaranteed bugs (FR-11) for determinism. 3 clean rehearsal runs (SM-1). Teardown/cost guardrails. Run `hackathon-judge` on the built product.

### Integration milestones
- **M1 (end P0):** seeded run visible in Dashboard + Report; spike verdicts set swarm size + drive mechanism.
- **M2 (end P1):** N=1 real persona finds a real bug end-to-end; Dashboard grid live; Report renders.
- **M3 (end P2):** full swarm, real findings+reviews, fake→real swapped.
- **M4 (end P3):** bulletproof 90s demo, 3 clean rehearsals, judge check passed.

### Parallelism guarantee
Claude's Dashboard + Report build against the **Fake Swarm (C9)** writing the **same shapes** Dev A's real agents use (C3/C4), so the two devs never block each other. The integration seam is the **`SwarmWriter` interface** (Dev A implements `InsForgeWriter`; Claude's consumers read the resulting C1 rows). Going live is a swap, not a rewrite.

## 13. Open Questions (architecture-level)
- OQ-3 resolved → **hybrid** (a11y nav + vision defects), pending SPIKE-1; vision-only fallback.
- Persona Agent language: TS (shares types) vs Python (richer vision libs)? `[ASSUMPTION: TS to reuse shared types; revisit if vision tooling pushes Python.]`
- Demo app: SwiftUI vs React Native (lim.run build path) — confirm with team.
- Convergence signal (OQ-6): time budget vs step budget vs battery-coverage — default **per-persona wall-clock budget** for demo predictability.
- Orchestrator hosting: Replicas VM vs small Vercel/edge function vs local during demo.
