---
stepsCompleted: [1, 2, 3]
mode: fast-draft
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-to_be_discussed-2026-06-06/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/build-plan.md
project_name: 'The AI Beta-Tester Swarm'
devs: ['Dev A (swarm & sponsors)', 'Claude (frontend, data, demo app)']
---

# The AI Beta-Tester Swarm - Epic Breakdown

## Overview

This document decomposes the PRD requirements and Architecture decisions into implementable epics and stories for a **2-dev hackathon build** (Dev A = swarm/sponsor integration; Claude = frontend/data/demo-app). Ordering is **demo-first**: the Live Swarm Grid showpiece and the report are built early against the **Fake Swarm (C9)**, so they progress without waiting on the real lim.run + Replicas integration. Every story is tagged with its **Owner**. Contracts referenced as C1–C9 are defined in `architecture.md` §9.

> No UX Design document exists; UX requirements are folded into the relevant frontend stories.

## Requirements Inventory

### Functional Requirements

- **FR-1:** Operator can Unleash a Swarm — launch a Run against the selected App-Under-Test with a chosen persona set via a single action (partial-swarm start OK).
- **FR-2:** Operator can watch the Live Grid — all simulators of a Run side by side, updating live, each labeled with its persona, with a live findings counter.
- **FR-3:** Operator can select Tester Personas from a defined library (≥ canonical 6 + enough to reach 8–12); each declares its target edge-case classes.
- **FR-4:** Each Persona autonomously explores the App-Under-Test (non-scripted), selecting actions at runtime to provoke its target edge cases; budget-bounded.
- **FR-5:** The system classifies each Finding into a named Edge-Case Battery class (empty_state, overflow, long_name_rtl, offline, slow_network, rapid_tap, tiny_screen, accessibility, large_data, auth_expiry).
- **FR-6:** A Persona captures a Finding (persona, edge_case, severity, screenshot, repro, timestamp, simulator, run) at the moment of detection.
- **FR-7:** Operator sees Findings appear in the Dashboard in realtime (≤ ~2s), with basic dedup/grouping so the feed stays readable.
- **FR-8:** Each Finding carries a severity on a fixed scale; the Report orders Findings by severity.
- **FR-9:** The system generates a Report from a completed Run's Findings (per-finding screenshot/persona/edge-case/severity/repro; grouped by persona).
- **FR-10:** Operator can share the Report via a single public URL (no viewer auth).
- **FR-11:** The curated demo app (Notes/Tasks) presents the UI/UX conditions the swarm discovers, with ≥1 reliably reproducible issue per headline persona, on an InsForge backend.
- **FR-12:** Each Persona produces one Persona Review (lens-appropriate written verdict + 1–5 Rating) at the end of its exploration.
- **FR-13:** The system computes and displays a Swarm Rating (mean of persona ratings) in the Report header.

### NonFunctional Requirements

- **NFR-1 (Demo reliability):** The end-to-end happy path (Unleash → Grid live → Findings stream → Report) runs to completion within the ~90s demo window, repeatably.
- **NFR-2 (Parallelism):** 8–12 simulators + agents run concurrently without the Grid stalling.
- **NFR-3 (Latency):** Screen frames and Findings surface within ~2s (perceived "live").
- **NFR-4 (Quota guardrail):** A Run respects lim.run/Replicas quotas; if swarm size exceeds quota, cap gracefully and inform the operator.
- **NFR-5 (Cost containment):** Simulators and VMs are torn down at Run convergence.
- **NFR-6 (Resilience):** One persona/simulator crashing does not take down the Grid or the Run.
- **NFR-7 (Grid performance):** The Grid stays responsive and legible with up to 12 concurrent tiles on a standard laptop browser at demo resolution.

### Additional Requirements

*From Architecture (`architecture.md`). These are technical enablers, not user-facing FRs.*

- **Starter / foundation:** npm-workspaces monorepo, Node ≥ 23.6 native TS (no build step), `@swarm/shared` package — **already built** (Epic 1).
- **C1 schema** applied to InsForge (Postgres) + storage bucket `findings/` + realtime channels (C5).
- **C9 Fake Swarm** seeder + deterministic fixtures — **already built**.
- **SwarmWriter seam:** real `InsForgeWriter` implementation so agents (fake or real) write identical shapes.
- **C7 DriverAgent interface:** hybrid (a11y-tree nav + vision defect-detection) with vision-only fallback, chosen by SPIKE-1.
- **C2 Orchestrator** `POST /runs` (stub Day 0, real provisioning later) on Replicas + lim.run.
- **De-risk spikes:** SPIKE-1 (lim.run), SPIKE-2 (Replicas), SPIKE-3 (InsForge realtime latency) — gate swarm size and drive mechanism.
- **Frontend:** Next.js (App Router) on Vercel; **Demo app:** SwiftUI iOS; **Persona agents:** TS (reuse shared types).

### UX Design Requirements

None — no UX Design document was provided. UX concerns (live-grid legibility, loading/empty/error states, shareable report layout) are folded into the relevant frontend stories.

### FR Coverage Map

- **FR-1:** Epic 2 (Unleash UX + trigger) → made real in Epic 5 (real provisioning)
- **FR-2:** Epic 2 (Live Grid)
- **FR-3:** Epic 5 (persona library wired into agents); catalog data shipped in Epic 1
- **FR-4:** Epic 5 (autonomous exploration loop)
- **FR-5:** Epic 5 (edge-case classification); enum/templates shipped in Epic 1
- **FR-6:** Epic 5 (capture finding)
- **FR-7:** Epic 2 (realtime feed + counter)
- **FR-8:** Epic 2 (severity in feed) + Epic 3 (severity ranking in report)
- **FR-9:** Epic 3 (report generation)
- **FR-10:** Epic 3 (shareable URL)
- **FR-11:** Epic 4 (demo app + seeded edge cases)
- **FR-12:** Epic 5 (persona produces review) → displayed in Epic 3
- **FR-13:** Epic 3 (swarm rating); computed on converge in Epic 5
- **NFR-1, NFR-4, NFR-5:** Epic 6 (hardening) + Epic 5 (teardown)
- **NFR-2, NFR-3, NFR-6, NFR-7:** Epic 2 (grid) + Epic 5 (parallel agents)

## Epic List

### Epic 1: Foundation & De-Risk
A working backend, frozen contracts, and spike verdicts so both devs build in parallel against stable seams and known sponsor capabilities.
**Covers:** Additional requirements (foundation, C1, C5, C9, SwarmWriter, spikes).

### Epic 2: The Live Swarm Grid (showpiece)
The operator unleashes a swarm and watches N labeled simulators run live with findings streaming in and a counter ticking — the jaw-drop demo moment, built on Fake Swarm data first.
**FRs covered:** FR-1 (UX+trigger), FR-2, FR-7, FR-8 (feed), NFR-2/3/6/7.

### Epic 3: The Beta-Test Report
A converged run produces a ranked, shareable report led by the Swarm Rating, grouped by persona with reviews and screenshots.
**FRs covered:** FR-9, FR-10, FR-13, FR-8 (ranking), FR-12 (display).

### Epic 4: The Demo App (App-Under-Test)
A polished Notes/Tasks iOS app on an InsForge backend, carrying realistic UI/UX edge cases for the swarm to discover.
**FRs covered:** FR-11.

### Epic 5: Autonomous Persona Testing (the real swarm)
Real persona agents on real simulators explore the demo app, discover edge cases, capture findings, and leave reviews — the actual product substance.
**FRs covered:** FR-1 (real provisioning), FR-3, FR-4, FR-5, FR-6, FR-12, NFR-2/4/5/6.

### Epic 6: Demo Hardening
The end-to-end run becomes bulletproof on stage: guaranteed determinism, quota/cost guardrails, rehearsals, and an originality re-check.
**Covers:** NFR-1, NFR-4, NFR-5, SM-1, SM-5.

---

## Epic 1: Foundation & De-Risk

Establish the contracts, a live backend, and de-risk the sponsor integration so Dev A and Claude can build without blocking each other. Several stories are already complete (Phase 0).

### Story 1.1: Monorepo and shared contracts package — **[Owner: Claude] ✅ DONE**

As a developer on this project,
I want a zero-install monorepo with a shared contracts package,
So that both devs code against one source of truth for all data shapes.

**Acceptance Criteria:**

**Given** a clean checkout with Node ≥ 23.6
**When** I run `npm test`
**Then** the `@swarm/shared` contract tests pass with no install or build step
**And** `packages/shared/src/types.ts` defines the C1 model (Run, Persona, Simulator, Finding), enums, realtime channels (C5), and `POST /runs` shapes (C2).

### Story 1.2: Fake Swarm seeder and fixtures (C9) — **[Owner: Claude] ✅ DONE**

As a frontend developer,
I want a Fake Swarm that emits realistic runs in the exact real shapes,
So that I can build the Dashboard and Report before the real swarm exists.

**Acceptance Criteria:**

**Given** the shared package
**When** I run `npm run seed`
**Then** deterministic `run-snapshot.json` (converged run) and `run-timeline.json` (ordered live beats) are written to `packages/shared/fixtures/`
**And** the fake data validates against the same types the real agents will write (C3/C4)
**And** `generateSnapshot()` and `generateTimeline()` are importable from `@swarm/shared`.

### Story 1.3: InsForge schema, storage, and realtime live — **[Owner: Claude]**

As a developer,
I want the C1 schema applied to InsForge with storage and realtime enabled,
So that the app has a real backend to read and write.

**Acceptance Criteria:**

**Given** an InsForge project and credentials
**When** the migration `packages/shared/sql/schema.sql` is applied
**Then** the `runs`, `personas`, `simulators`, `findings` tables exist with the documented CHECK constraints and indexes
**And** a storage bucket `findings/` exists for screenshots
**And** realtime is enabled so subscribers receive row changes mapped to `run:{id}:status` and `run:{id}:findings` (C5)
**And** the demo app's auth + data tables are provisioned on the same backend.

### Story 1.4: InsForgeWriter implementation of the SwarmWriter seam — **[Owner: Dev A]**

As a persona agent (and the Fake Swarm),
I want an InsForgeWriter implementing the SwarmWriter interface,
So that anything producing findings writes identical shapes to the live backend.

**Acceptance Criteria:**

**Given** the `SwarmWriter` interface in `@swarm/shared`
**When** `InsForgeWriter` is used to upsert a run/persona/simulator and insert a finding with a screenshot
**Then** the rows appear in InsForge matching the C1 schema and the screenshot resolves at its stored URL
**And** the same `writeSnapshot(writer, snapshot)` helper works with both `MemoryWriter` and `InsForgeWriter` unchanged.

### Story 1.5: SPIKE-1 — lim.run simulator capability — **[Owner: Dev A]**

As the team,
I want to know lim.run's real capabilities,
So that we can set the final swarm size and the drive mechanism.

**Acceptance Criteria:**

**Given** lim.run access
**When** the spike runs
**Then** we have documented answers for: max concurrent iOS simulators on our plan, how to install/launch the demo app build, the live-view type exposed (stream vs periodic frames) and its latency, and whether the accessibility/UI tree is queryable
**And** a verdict is recorded setting swarm size (≤12) and drive mechanism (hybrid vs vision-only) in `architecture.md` §13.

### Story 1.6: SPIKE-2 — Replicas swarm capability — **[Owner: Dev A]**

As the team,
I want to confirm Replicas can spawn and bind the swarm fast enough,
So that a live 90s demo is feasible.

**Acceptance Criteria:**

**Given** Replicas access
**When** the spike runs
**Then** we have documented: VM spawn latency for 8–12 VMs, how to inject persona config + simulator binding into a VM, and that VMs have outbound network to InsForge and lim.run
**And** a go/no-go for the target swarm size is recorded.

### Story 1.7: SPIKE-3 — InsForge realtime latency — **[Owner: Claude]**

As a frontend developer,
I want to confirm realtime is fast enough to feel "live,"
So that the grid and feed update within the ~2s budget (NFR-3).

**Acceptance Criteria:**

**Given** the live InsForge backend
**When** a finding row is inserted
**Then** a subscribed browser client receives it in ≤ ~2s in a representative test
**And** if latency exceeds budget, a mitigation (polling fallback / batching) is recorded.

---

## Epic 2: The Live Swarm Grid (showpiece)

The demo's money shot. Built first and rehearsed hardest, driven by the Fake Swarm timeline so it works end-to-end with no real swarm.

### Story 2.1: Unleash a Swarm — **[Owner: Claude]** (FR-1 UX + trigger)

As an operator,
I want to launch a run with one click after picking an app and persona set,
So that I can start a beta-test without any setup.

**Acceptance Criteria:**

**Given** the Dashboard with the demo app registered and a persona set selected
**When** I click "Unleash Swarm"
**Then** a `POST /runs {app_id, swarm_size, persona_keys[]}` is sent and a `run_id` is returned (real Orchestrator or Day-0 stub)
**And** the UI transitions to the Live Grid view subscribed to that run's realtime channels
**And** selecting fewer/more personas changes `swarm_size` accordingly (8–12).

### Story 2.2: Render the Live Grid — **[Owner: Claude]** (FR-2, NFR-7)

As an operator,
I want to see every simulator side by side, each labeled with its persona,
So that I can watch the whole swarm work in parallel.

**Acceptance Criteria:**

**Given** a running run with N simulator rows
**When** the Grid renders
**Then** one tile appears per simulator, each labeled with its persona display name and status
**And** each tile shows its current screen surface (`stream_url`) refreshed within ~2s (stream or periodic frame per SPIKE-1)
**And** the Grid stays responsive and legible with up to 12 tiles at demo resolution (NFR-7)
**And** replaying `fixtures/run-timeline.json` drives the Grid with no real backend.

### Story 2.3: Realtime findings feed and live counter — **[Owner: Claude]** (FR-7)

As an operator,
I want findings to appear live with a running count,
So that I can see bugs being discovered in real time.

**Acceptance Criteria:**

**Given** a running run
**When** a finding is written (fake or real)
**Then** it appears in the feed and increments the visible counter within ~2s
**And** near-duplicate findings (same persona + edge_case + screen) are grouped so the feed stays readable
**And** each feed item shows persona, edge-case class, severity, and a screenshot thumbnail.

### Story 2.4: Severity surfaced in the feed — **[Owner: Claude]** (FR-8 feed half)

As an operator,
I want findings visually ranked by severity in the feed,
So that the worst issues stand out immediately.

**Acceptance Criteria:**

**Given** findings of mixed severity
**When** they render in the feed
**Then** severity is shown on a fixed scale (critical/high/medium/low) with clear visual weight
**And** critical/high findings are visually distinguishable at a glance.

### Story 2.5: Grid resilience and graceful degrade — **[Owner: Claude]** (NFR-6)

As an operator,
I want a crashed simulator to not break the whole grid,
So that the demo survives a single failure.

**Acceptance Criteria:**

**Given** a run where one simulator reports `down`
**When** the Grid updates
**Then** that tile shows an error state while all other tiles and the feed keep updating
**And** the run continues and can still converge with the remaining personas.

---

## Epic 3: The Beta-Test Report

The shareable takeaway. Built against the Fake Swarm snapshot, so it is complete before real runs exist.

### Story 3.1: Generate the Report from a converged run — **[Owner: Claude]** (FR-9)

As an operator,
I want a report page that lays out every finding with evidence,
So that I can act on what the swarm discovered.

**Acceptance Criteria:**

**Given** a converged run in InsForge (or `fixtures/run-snapshot.json`)
**When** I open `/r/{run_id}`
**Then** the page lists every finding with its screenshot, persona, edge-case class, severity, and repro steps
**And** findings are grouped by persona
**And** a header summary shows total findings, personas run, and run duration.

### Story 3.2: Swarm Rating header — **[Owner: Claude]** (FR-13)

As an operator,
I want a headline rating summarizing the swarm's verdict,
So that I get the gist in one number.

**Acceptance Criteria:**

**Given** a converged run with persona ratings
**When** the report header renders
**Then** it shows the Swarm Rating as the mean of persona ratings with the tester count (e.g., "2.8/5 · 12 testers")
**And** the value matches `runs.swarm_rating`.

### Story 3.3: Per-persona reviews and severity-ranked findings — **[Owner: Claude]** (FR-12 display, FR-8 ranking)

As an operator,
I want each persona's review and rating beside its findings, worst first,
So that the report reads like real beta-tester feedback.

**Acceptance Criteria:**

**Given** a converged run
**When** a persona section renders
**Then** it shows that persona's 1–5 rating and written review alongside its findings
**And** findings within the section are ordered by severity (critical → low)
**And** a persona with no findings still shows its review and rating.

### Story 3.4: Shareable public report URL — **[Owner: Claude]** (FR-10)

As an operator,
I want to share the report with a single link,
So that anyone can see it without logging in.

**Acceptance Criteria:**

**Given** a converged run's report
**When** I copy its URL and open it in a logged-out browser
**Then** the full report renders (public read)
**And** the URL is stable for that run.

---

## Epic 4: The Demo App (App-Under-Test)

The curated app the swarm exercises on stage. Built by Claude; its screen names match the finding templates in `@swarm/shared`.

### Story 4.1: Notes/Tasks core app on InsForge — **[Owner: Claude]** (FR-11 base)

As a demo operator,
I want a working Notes/Tasks iOS app backed by InsForge,
So that there is a real app for the swarm to test.

**Acceptance Criteria:**

**Given** the demo app built for an iOS simulator
**When** a user creates, edits, lists, and searches notes
**Then** the core flows work against an InsForge backend (auth + data)
**And** the screens are named NoteList, NoteDetail, Search, Auth, Sync (matching `screen_key` values).

### Story 4.2: Seeded UI/UX edge cases per headline persona — **[Owner: Claude]** (FR-11)

As a demo operator,
I want at least one reliably reproducible issue per headline persona,
So that the swarm has real breakage to discover on stage.

**Acceptance Criteria:**

**Given** the demo app
**When** the relevant condition is triggered
**Then** each headline persona has ≥1 reproducible defect: empty_state (blank/crash first run), long_name_rtl (title clipped, no ellipsis), offline (infinite spinner / silent edit loss), tiny_screen (control off-screen), rapid_tap (duplicate note on double-tap)
**And** each defect occurs on the screen named in the corresponding finding template.

### Story 4.3: Auth and large-data paths — **[Owner: Claude]** (FR-11 auth_expiry/large_data)

As a demo operator,
I want auth and large-data conditions in the demo app,
So that the swarm can exercise auth-expiry and large-data edge cases.

**Acceptance Criteria:**

**Given** the demo app with lightweight auth
**When** a session expires and the app resumes
**Then** the auth-expiry edge case is reproducible (e.g., raw 401 instead of re-login)
**And** the app can be seeded with 10k+ notes so the large-data case (list stutter / search freeze) is reproducible.

---

## Epic 5: Autonomous Persona Testing (the real swarm)

Dev A's workstream — the real lim.run + Replicas integration. Writes the same shapes the Fake Swarm uses, so the frontend swaps over with minimal change.

### Story 5.1: Provision and bind one simulator + one VM — **[Owner: Dev A]** (FR-1 real)

As the system,
I want to provision a real simulator and a real agent VM and bind them,
So that one persona can drive the real app.

**Acceptance Criteria:**

**Given** a created run
**When** the Orchestrator provisions for one persona
**Then** a lim.run iOS simulator boots with the demo app installed and a `simulators` row is set `live` with a `stream_url`
**And** a Replicas VM is spawned, bound 1:1 to that simulator, running the Persona Agent
**And** the run transitions `provisioning → running`.

### Story 5.2: DriverAgent interface with FakeDriver then real impl — **[Owner: Dev A]** (C7)

As a persona agent developer,
I want a DriverAgent abstraction with a FakeDriver,
So that persona logic is testable before the real simulator works.

**Acceptance Criteria:**

**Given** the `DriverAgent` interface (observe / act / detectVisualDefects)
**When** persona logic runs against a `FakeDriver` of scripted screens
**Then** it observes, acts, and flags defects with no real simulator
**And** the real implementation (hybrid a11y+vision, or vision-only per SPIKE-1) satisfies the same interface with no change to persona logic.

### Story 5.3: Persona library wired into agents — **[Owner: Dev A]** (FR-3)

As the system,
I want each agent to embody a selected persona from the catalog,
So that the swarm is persona-diverse.

**Acceptance Criteria:**

**Given** the persona catalog (C8) in `@swarm/shared`
**When** an agent starts with a `persona_key`
**Then** it loads that persona's disposition and target edge cases
**And** the selected persona set for a run matches `persona_keys` from `POST /runs`.

### Story 5.4: Autonomous exploration loop — **[Owner: Dev A]** (FR-4)

As a persona agent,
I want to choose my own actions to provoke my target edge cases,
So that I discover the unscripted (not replay a script).

**Acceptance Criteria:**

**Given** a bound simulator and a persona
**When** the agent explores
**Then** it issues a runtime-selected sequence of interactions (not a fixed pre-authored script) biased toward its target edge cases
**And** two runs of the same persona may differ
**And** exploration terminates on a per-persona wall-clock budget and reports completion.

### Story 5.5: Capture and classify a Finding — **[Owner: Dev A]** (FR-6, FR-5)

As a persona agent,
I want to record a finding with evidence when I hit a defect,
So that it surfaces live and in the report.

**Acceptance Criteria:**

**Given** the agent detects a UI/UX defect
**When** it captures a finding
**Then** it uploads a screenshot and inserts a `findings` row via `InsForgeWriter` with persona, edge_case (one of the battery enum), severity, title, repro_steps, screen_key, timestamps, and ids (C3)
**And** the finding appears in the Dashboard feed within ~2s.

### Story 5.6: Produce a Persona Review and Rating — **[Owner: Dev A]** (FR-12)

As a persona agent,
I want to leave a lens-appropriate review and rating when I finish,
So that the report reads like real beta-tester feedback.

**Acceptance Criteria:**

**Given** an agent completing its exploration
**When** it finishes
**Then** it writes a 1–5 rating and a non-empty review reflecting its persona lens to its `personas` row (C4)
**And** the review references its findings where relevant.

### Story 5.7: Scale to N, partial-swarm start, and teardown — **[Owner: Dev A]** (FR-1, NFR-2/5/6)

As the system,
I want to run the full swarm in parallel and clean up after,
So that the demo is impressive and not wasteful.

**Acceptance Criteria:**

**Given** a run of swarm size N (8–12 or SPIKE-capped)
**When** the Orchestrator provisions
**Then** N personas run concurrently; if some simulators fail to provision, the run still starts with the rest (partial-swarm start)
**And** when all personas are done/crashed the run is set `converged` and `swarm_rating` is computed
**And** all simulators and VMs are torn down on convergence.

---

## Epic 6: Demo Hardening

Make the on-stage run bulletproof.

### Story 6.1: Wire the 90-second demo path end-to-end — **[Owner: Claude + Dev A]** (NFR-1)

As a presenter,
I want the full Unleash → Grid → Findings → Report path to run as one smooth flow,
So that the demo lands in ~90 seconds.

**Acceptance Criteria:**

**Given** the integrated system
**When** the presenter runs the demo script (PRD §10)
**Then** each beat (boot grid, findings tick up, report auto-builds, shareable link opens) happens in order within the ~90s window
**And** there are no manual recovery steps in the happy path.

### Story 6.2: Guaranteed determinism bugs — **[Owner: Claude]** (FR-11, SM-C2)

As a presenter,
I want a small set of guaranteed-reproducible bugs,
So that the demo never falls flat — while still looking realistic.

**Acceptance Criteria:**

**Given** the demo app and swarm
**When** a demo run executes
**Then** a known minimum set of findings is reliably produced across rehearsals
**And** the guaranteed bugs remain realistic (no obviously staged behavior, per counter-metric SM-C2).

### Story 6.3: Quota and cost guardrails — **[Owner: Dev A]** (NFR-4, NFR-5)

As an operator,
I want the swarm to respect quotas and clean up,
So that the demo doesn't fail mid-run or overspend.

**Acceptance Criteria:**

**Given** a requested swarm size
**When** it exceeds available lim.run/Replicas quota
**Then** the system caps the size gracefully and tells the operator rather than failing mid-demo
**And** no simulators/VMs are left running after convergence.

### Story 6.4: Rehearsal and originality re-check — **[Owner: Claude + Dev A]** (SM-1, SM-5)

As the team,
I want repeated clean rehearsals and an originality gut-check,
So that we are confident on stage and on the rubric.

**Acceptance Criteria:**

**Given** the hardened system
**When** we rehearse
**Then** at least 3 consecutive demo runs complete cleanly within the window (SM-1)
**And** the `hackathon-judge` skill is run on the built product and its originality verdict is favorable or its gaps are addressed (SM-5).

---

## Epic 7: Beta-test websites too (Playwright)

Extend the swarm beyond mobile: the same persona agents test **web apps** via a
Playwright-driven `WebDriver`, surfacing findings in the same Edge-Case Battery
vocabulary. Same `DriverAgent` (C7) seam → no change to PersonaAgent/orchestrator/UI.

### Story 7.1: Web defect analyzer — **[Owner: Claude] ✅ DONE**
As the swarm, I want to turn a captured web page snapshot into edge-case findings,
so a web app gets the same treatment as a mobile app.
**Acceptance Criteria:**
**Given** a page snapshot (nodes, title, lang, console errors)
**When** `detectWebDefects` runs
**Then** it flags images without alt, controls without an accessible name, missing
`lang`, blank/empty render, and network/console errors — each as a battery-classed
DefectHint. **(6 tests passing.)**

### Story 7.2: Playwright WebDriver — **[Owner: Claude] ✅ DONE (real run needs `playwright` installed)**
As a persona agent, I want to drive a real website,
so I can explore and capture findings like I do on a simulator.
**Acceptance Criteria:**
**Given** a target URL
**When** the `WebDriver` observes
**Then** it navigates via Playwright, captures a screenshot + a11y snapshot +
console errors, and feeds `detectWebDefects` — implementing the same `DriverAgent`
interface as `LimDriver`/`FakeDriver` (Playwright imported lazily).
