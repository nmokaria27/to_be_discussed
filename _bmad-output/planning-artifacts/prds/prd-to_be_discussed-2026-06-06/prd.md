---
title: The AI Beta-Tester Swarm
status: draft
created: 2026-06-06
updated: 2026-06-06
---

# PRD: The AI Beta-Tester Swarm
*Working title — confirm.*

## 0. Document Purpose

This PRD formalizes the locked hackathon concept (see `_bmad-output/brainstorming/brainstorming-session-2026-06-06-102104.md`) into buildable requirements for a **demo-first prototype**. It is for the builder (Sri) and any collaborators, and it feeds the next phases: architecture (de-risk the lim.run + Replicas + InsForge wiring), then epics/stories, then build. It is deliberately lean (days of runway, ruthless MVP cut). Vocabulary is Glossary-anchored; features are grouped with globally numbered FRs nested; assumptions are tagged inline as `[ASSUMPTION]` and indexed in §11. Deep technical wiring and rejected alternatives live in `addendum.md`, not here.

## 1. Vision

An AI coding agent builds a mobile app, says "done," and hands it over. It built the happy path. It never tested the unhappy ones — the empty state, the 200-character note title, the offline subway ride, the rage-tap, the tiny screen, the expired session. Real users hit those walls in the first five minutes. The data is brutal: 66% of developers say AI output is "almost right, but not quite" (Stack Overflow 2025), 45% of AI-generated code fails a security test, and agents systematically over-report success (predicting 73% vs a true 35%).

**The AI Beta-Tester Swarm** is the proof-before-handoff gate that closes that gap for mobile UI/UX. Point it at a mobile app and it spins up a grid of real iOS simulators in the cloud (lim.run), one per autonomous **Tester Persona** running on its own VM (Replicas) — the rage-tapper, the offline commuter, the 10k-item power user, the long-name/RTL user, the accessibility user, the tiny-screen user, and more. They don't run a script. They *explore*, hunting the UI/UX edge cases the coding agent never thought to check, and every Finding streams live to a dashboard backed by an agent-native backend (InsForge), which also auto-builds a shareable beta-test Report site.

The wedge — and the thing that makes it "never seen before" — is the **stance**, not the problem. Generic "verify AI code" is a venture-funded category (CodeRabbit, Qodo, Devin). What is unclaimed is a **persona-diverse swarm doing exploratory UI/UX *discovery* (not scripted regression) in parallel on real devices**, as a neutral gate downstream of whatever agent built the app. The room watches a dozen simulators light up and find fourteen real bugs in ninety seconds, before a single human touched the app. That is the product.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** "Before I ship/hand off a mobile app an agent (or I) just built, find the UI/UX edge cases I didn't test — without me writing test scripts."
- **Emotional:** "Stop me from looking foolish when a user instantly breaks the thing I was confident in. Replace false confidence with earned proof."
- **Social (demo/hackathon context):** "Make the room lean forward — show something that visibly does what no tool I've seen does."
- **Contextual:** "I don't have a Mac farm, a QA team, or time to hand-test on ten device configs. Give me a crowd of testers on demand."

### 2.2 Non-Users (v1)

- Teams wanting **scripted regression suites** or CI gating across every commit (we do exploratory discovery, not deterministic regression — see §5).
- **Web-only or backend-only** apps (v1 is mobile UI/UX; the swarm drives simulators). `[ASSUMPTION: web app coverage is explicitly out for the prototype.]`
- Non-technical end users (the operator is a developer/builder).

### 2.3 Key User Journeys

*Single operator role (the developer running the swarm), so journeys are kept light. They double as the demo beats — see §10.*

- **UJ-1. Maya unleashes the swarm on the app her agent called "done."**
  - **Persona + context:** Maya, a solo dev who vibe-coded a Notes app with a coding agent that reported success. She doesn't fully trust it.
  - **Entry state:** On the Swarm web dashboard, demo app already registered (preview build + InsForge backend wired).
  - **Path:** Selects the app → picks the persona set → clicks **Unleash Swarm**. A grid of 8–12 iOS simulators boots, each labeled with its persona.
  - **Climax:** Within seconds the grid is live — every simulator is actively driving the app in parallel. Maya did nothing but click once.
  - **Resolution:** Swarm is exploring; the live Findings counter starts ticking.

- **UJ-2. Maya watches real bugs surface live.**
  - **Entry state:** Swarm running, grid live.
  - **Path:** Findings stream into the feed in realtime — "button overlaps on tiny screen," "frozen on offline," "title clipped at 40 chars," "crash on empty list." Each carries a screenshot, persona, and severity. The counter climbs ("14 issues found").
  - **Climax:** She sees a bug she genuinely did not know existed, caught by a persona she didn't think to be.
  - **Resolution:** Swarm converges; run marked complete.

- **UJ-3. Maya reads and shares the report.**
  - **Path:** The Report site auto-builds: edge cases ranked by severity, grouped by persona, each with a screenshot and repro steps. She opens the shareable link.
  - **Climax:** A single URL tells the whole story of how her "done" app would have failed real users.
  - **Resolution:** She fixes the top issues (or hands the link to whoever/whatever built it) before any real user arrives.

## 3. Glossary

*Downstream artifacts and readers must use these terms verbatim. No synonyms elsewhere in the PRD.*

- **Swarm** — the full set of Tester Personas dispatched against one App-Under-Test in a single Run.
- **Tester Persona** (or **Persona**) — an autonomous testing agent embodying one distinct user archetype (e.g., Rage-Tapper) with characteristic behaviors and the edge cases it is biased to provoke. Runs on its own VM (Replicas) bound to one Simulator.
- **Simulator** — one cloud iOS simulator instance (lim.run) on which a Persona drives the App-Under-Test. One Persona : one Simulator.
- **App-Under-Test** — the mobile app the Swarm exercises. In the MVP, the curated Notes/Tasks demo app.
- **Run** — one execution of a Swarm against an App-Under-Test, from Unleash to convergence; produces a set of Findings and one Report.
- **Edge-Case Battery** — the named, fixed catalog of UI/UX failure classes the Swarm hunts (empty/overflow/long-name/RTL/offline/slow-network/rapid-tap/tiny-screen/accessibility/large-data; auth-expiry where applicable).
- **Exploratory Discovery** — autonomous, unscripted interaction in which a Persona decides its own actions to provoke edge cases — as opposed to replaying a predefined test script.
- **Finding** — one discovered UI/UX issue: persona, edge-case class, severity, screenshot, repro steps, timestamp, simulator.
- **Persona Review** — one Tester Persona's qualitative, first-person verdict on the App-Under-Test at the end of its exploration: a short written review plus a **Rating** — written from that persona's viewpoint (e.g., the Accessibility User rates accessibility harshly). Distinct from a Finding: subjective UX opinion, not a single defect.
- **Rating** — a fixed-scale score (1–5) a Persona assigns the App-Under-Test in its Persona Review.
- **Swarm Rating** — the aggregate of all Persona Ratings for a Run (e.g., mean across testers), shown at the top of the Report.
- **Live Grid** — the dashboard view showing all Simulators of a Run side by side, streaming live.
- **Report** — the auto-generated, shareable hosted site summarizing a Run's Findings, ranked and grouped.
- **Dashboard** — the operator-facing web app: register app, select personas, Unleash, watch the Live Grid + Findings feed.

## 4. Features

*FRs numbered globally for stable downstream reference. Sponsor tools named at capability level; deep wiring is in `addendum.md`.*

### 4.1 Swarm Launch & Live Grid *(the showpiece)*

**Description:** The operator selects the App-Under-Test and a persona set, then clicks **Unleash Swarm**. The system provisions one Simulator per Persona (lim.run) and one agent VM per Persona (Replicas), binds them, and renders the Live Grid — every Simulator visible and streaming in parallel, each labeled with its Persona. This single screen is the demo's jaw-drop and must be bulletproof. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Unleash a Swarm
The operator can launch a Run against the selected App-Under-Test with a chosen persona set via a single action.

**Consequences (testable):**
- A single click on **Unleash Swarm** provisions N Simulators and N Persona agents (N = selected swarm size, 8–12 in MVP) and transitions the Run to `running`.
- Each Persona is bound 1:1 to exactly one Simulator before exploration begins.
- If provisioning of any Simulator fails, the Run still starts with the successfully provisioned Personas and the failure is surfaced (degrade, don't abort). `[ASSUMPTION: partial-swarm start is acceptable for the demo rather than all-or-nothing.]`

#### FR-2: Render the Live Grid
The operator can watch all Simulators of a Run side by side, updating live.

**Consequences (testable):**
- The Grid displays one tile per active Simulator, each labeled with its Persona name.
- Each tile reflects the Simulator's current screen with end-to-end latency under ~2s. `[ASSUMPTION: near-live screenshot streaming (periodic frames) is sufficient; full video streaming is not required for MVP.]`
- A live Findings counter increments visibly as Findings arrive.

**Feature-specific NFRs:**
- The Grid must remain responsive and legible with up to 12 concurrent tiles on a standard laptop browser at demo resolution.

**Notes:** `[NOTE FOR PM]` This feature is the showpiece (40% of rubric is demo+execution). Build and rehearse it first and most.

### 4.2 Persona-Driven Exploratory Discovery

**Description:** Each Persona autonomously drives its Simulator, choosing its own actions to provoke the edge cases it is biased toward — not replaying a script. The MVP ships a defined Persona Library; the operator selects 8–12 for a Run. Realizes UJ-2.

**Functional Requirements:**

#### FR-3: Persona Library
The operator can select Tester Personas from a defined library for a Run.

**Consequences (testable):**
- The library contains at least the canonical set: Rage-Tapper, Offline Commuter, 10k-Item Power User, Long-Name/RTL User, Accessibility User, Tiny-Screen User, plus enough additional personas to reach a 12-tile grid. `[ASSUMPTION: additional personas to fill 8-12 include e.g. Slow-Network User, Rapid-Switcher, Empty-State User, Permission-Denier, Background/Resume User, Deep-Link Visitor — final list to confirm.]`
- Each Persona declares the edge-case class(es) it primarily targets (maps to §4.3 Edge-Case Battery).

#### FR-4: Autonomous exploration (not scripted)
Each Persona can interact with the App-Under-Test by deciding its own next action toward provoking its target edge cases.

**Consequences (testable):**
- A Persona issues a sequence of UI interactions (taps, typing, gestures, network/condition changes) that it selects at runtime, not from a fixed pre-authored script. `[ASSUMPTION: action selection is driven by a vision/UI-state model interpreting the current screen — mechanism detailed in addendum.]`
- Two Runs of the same Persona on the same app may produce different interaction sequences (discovery, not deterministic replay).
- A Persona terminates its exploration on a time/step budget and reports completion.

**Out of Scope:**
- Deterministic, repeatable regression scripts (explicit non-goal — see §5).

### 4.3 Edge-Case Battery

**Description:** The fixed catalog of UI/UX failure classes the Swarm hunts, giving the product a named spine and ensuring coverage breadth. Personas are biased toward specific classes; collectively the Swarm sweeps the Battery.

**Functional Requirements:**

#### FR-5: Named edge-case coverage
The system can classify each Finding into a named Edge-Case Battery class.

**Consequences (testable):**
- The Battery includes at minimum: empty-state, content overflow, long-name/RTL, offline, slow-network, rapid-tap, tiny-screen, accessibility (e.g., large text / contrast / labels), large-data (10k+ items). Auth-expiry included where the App-Under-Test has auth. `[ASSUMPTION: Notes/Tasks demo app includes lightweight auth so auth-expiry is demonstrable; confirm.]`
- Every Finding is tagged with exactly one primary Battery class.

### 4.4 Finding Capture & Realtime Feed

**Description:** When a Persona detects a UI/UX issue, it captures a Finding — screenshot, persona, edge-case class, severity, repro steps, timestamp, simulator — and persists it. Findings stream to the Dashboard live (counter + feed). Backed by InsForge (Postgres + storage + realtime). Realizes UJ-2.

**Functional Requirements:**

#### FR-6: Capture a Finding
A Persona can record a Finding with its full metadata and a screenshot at the moment of detection.

**Consequences (testable):**
- Each persisted Finding contains: persona, edge-case class, severity, screenshot reference, repro steps, timestamp, simulator id, run id.
- The screenshot is stored and retrievable for display in the feed and Report.

#### FR-7: Realtime Findings feed
The operator can see Findings appear in the Dashboard in realtime as they are captured.

**Consequences (testable):**
- A new Finding appears in the feed and increments the live counter within ~2s of capture. `[ASSUMPTION: realtime delivery via InsForge realtime channel.]`
- Findings are de-duplicated or grouped enough that the feed stays readable (not 200 near-identical rows). `[ASSUMPTION: basic dedup/grouping by (persona, edge-case class, screen) is in scope; sophisticated clustering is not.]`

#### FR-8: Severity ranking
Each Finding can carry a severity used to rank it.

**Consequences (testable):**
- Severity is one of a small fixed scale (e.g., critical / high / medium / low).
- The Report (§4.6) orders Findings by severity.

### 4.5 Persona Reviews & Ratings

**Description:** Beyond hard Findings, each Tester Persona ends its exploration by leaving a **Persona Review** — a short, first-person UX verdict plus a 1–5 **Rating**, written from that persona's viewpoint (the Accessibility User judges accessibility, the Rage-Tapper judges responsiveness, etc.). The Report aggregates these into a headline **Swarm Rating**. This is what makes the output read like real beta-tester feedback, not just a bug list. Realizes UJ-3.

**Functional Requirements:**

#### FR-12: Persona produces a Review + Rating
Each Persona can produce one Persona Review (short written verdict + 1–5 Rating) for the App-Under-Test at the end of its exploration.

**Consequences (testable):**
- Each completed Persona contributes exactly one Persona Review with a non-empty written verdict and a Rating in {1,2,3,4,5}.
- The Review reflects the persona's lens (e.g., the Accessibility User's Review references accessibility; the Rage-Tapper's references responsiveness/jank). `[ASSUMPTION: the persona's lens is enforced via its prompt/role; review quality is best-effort generative text.]`
- A Persona that produced Findings references them in its Review where relevant (the Review is informed by what it found).

#### FR-13: Swarm Rating aggregate
The system can compute and display a Swarm Rating from all Persona Ratings in a Run.

**Consequences (testable):**
- The Swarm Rating is the mean of all Persona Ratings for the Run, shown with the count of testers (e.g., "2.8/5 · 12 testers").
- The Report (§4.6) shows the Swarm Rating in its header and each Persona Review in the per-persona grouping.

### 4.6 Auto-Generated Report Site

**Description:** On Run convergence, the system generates a shareable hosted Report: the headline **Swarm Rating**, then Findings ranked by severity and grouped by Persona, each persona section showing its **Persona Review + Rating** alongside its Findings (screenshot + repro steps), plus a one-line Run summary ("N issues across M personas in T seconds"). Hosted on InsForge (edge functions + hosting). Realizes UJ-3.

**Functional Requirements:**

#### FR-9: Generate the Report
The system can generate a Report from a completed Run's Findings.

**Consequences (testable):**
- The Report header shows the Swarm Rating (FR-13) and a summary: total Findings, personas run, Run duration.
- The Report lists every Finding with its screenshot, persona, edge-case class, severity, and repro steps.
- Findings are ranked by severity and grouped by Persona; each Persona group shows that persona's Review + Rating (FR-12).

#### FR-10: Shareable Report link
The operator can share the Report via a single URL.

**Consequences (testable):**
- The Report is reachable at a stable hosted URL without the viewer needing to authenticate. `[ASSUMPTION: public unauthenticated read for the demo is acceptable; no sensitive data in demo app.]`

**Out of Scope:**
- Per-Finding video/GIF clips (deferred — see §6.2 and §9 ambition stretch).

### 4.7 Curated Demo App (App-Under-Test)

**Description:** A single polished Notes/Tasks iOS app, built for the demo, with genuine and a few guaranteed UI/UX edge cases the Swarm will reliably find. Its backend is InsForge (so the Swarm also exercises auth/empty/large-data paths against a real backend).

**Functional Requirements:**

#### FR-11: Demo app with seeded edge cases
The demo app can present the UI/UX conditions the Swarm is designed to discover.

**Consequences (testable):**
- The app contains at least one reliably reproducible issue per headline persona used in the demo (e.g., title clips for Long-Name, crash/blank for Empty-State, frozen for Offline, overlap for Tiny-Screen). `[ASSUMPTION: a small number of guaranteed bugs are intentionally present to make the demo deterministic-enough; this is acceptable and disclosed internally.]`
- The app uses InsForge for auth and data so large-data and auth-expiry cases are exercisable.

**Notes:** `[NOTE FOR PM]` The guaranteed bugs are a demo-reliability device, not a product feature. Keep them realistic so the demo doesn't feel staged.

## 5. Non-Goals (Explicit)

- **Not a scripted/regression test runner.** No record-and-replay, no deterministic CI gate, no assertion DSL. We do Exploratory Discovery. (This is the originality line — protect it.)
- **Not a self-healing/fixing tool.** We discover and report; we do not auto-fix the app (that's the Devin/Cursor lane — out of scope, see brainstorming C3).
- **Not a general device control-plane or Appium replacement.**
- **Not web or backend functional testing** in v1 (mobile UI/UX only; backend is touched only as the demo app's dependency).
- **Not a multi-tenant SaaS** — no accounts, billing, orgs, or team management in the prototype.
- **Not Android or cross-platform** in the MVP (iOS only).

## 6. MVP Scope

### 6.1 In Scope
- One curated Notes/Tasks iOS demo app with seeded edge cases, backed by InsForge.
- Swarm of 8–12 Tester Personas, each on its own Replicas VM bound to one lim.run iOS Simulator.
- One-click **Unleash Swarm** → Live Grid of all Simulators streaming in parallel.
- Persona-driven Exploratory Discovery against the Edge-Case Battery.
- Finding capture (screenshot + metadata + severity) persisted to InsForge.
- Realtime Findings feed + live counter on the Dashboard.
- Per-persona Reviews + Ratings and an aggregate Swarm Rating.
- Auto-generated, shareable hosted Report (Swarm Rating header, ranked + grouped Findings, per-persona Reviews, screenshots, repro).

### 6.2 Out of Scope for MVP
- Per-Finding video/GIF clips. *Deferred — capture/encoding/storage risk; revisit as ambition stretch if time allows.* `[NOTE FOR PM]` highest-wow deferred item.
- Android / cross-platform grid. *De-risk by single platform.*
- Bring-your-own arbitrary app ingestion. *Curated app only for demo reliability.*
- Accounts, billing, multi-tenant, persistence of historical Runs beyond the demo session.
- Sophisticated Finding clustering / triage / AI severity reasoning beyond a simple scale.
- Auto-fix / re-test loop.

## 7. Sponsor Roles *(all three load-bearing — 15% of rubric, core not bolted-on)*

- **lim.run** — the cloud iOS Simulators every Persona drives; supplies the Live Grid's streamable surfaces. The mobile-UX testbed. *Core to FR-1, FR-2, FR-4.*
- **Replicas** — the Swarm itself: each Persona is a coding agent on its own VM that autonomously drives a Simulator. The parallel-orchestration engine. *Core to FR-1, FR-3, FR-4.*
- **InsForge** — the Swarm's backend (Postgres + storage for Findings/screenshots), the realtime channel powering the live feed, the host for the Report site, *and* the backend of the demo app (so the Swarm hits real auth/empty/large-data paths). *Core to FR-6, FR-7, FR-9–FR-13.*

*Detailed wiring, API/transport choices, and orchestration mechanics live in `addendum.md`.*

## 8. Cross-Cutting NFRs & Guardrails

- **Demo reliability (paramount):** the end-to-end happy path (Unleash → Grid live → Findings stream → Report builds) must run to completion within the ~90s demo window, repeatably, on the rehearsal setup.
- **Parallelism:** 8–12 Simulators + agents must run concurrently without the Grid stalling.
- **Latency:** screen frames and Findings surface within ~2s (perceived "live").
- **Cost/Quota guardrail:** a Run must respect lim.run Simulator and Replicas VM quotas; if the swarm size exceeds available quota, cap gracefully and tell the operator rather than failing mid-demo. `[ASSUMPTION: quotas/credits sufficient for a 12-simulator run confirmed before demo day — see OQ-1.]`
- **Cost containment:** Simulators and VMs are torn down at Run convergence (no runaway spend).
- **Resilience:** one Persona/Simulator crashing must not take down the Grid or the Run (degrade, isolate).

## 9. Originality Positioning *(25% of rubric — defend this line)*

The defensible wedge is **stance + sponsor-native execution**, not the problem (generic "verify AI code" is a funded category: CodeRabbit, Qodo, Devin). Three things together appear unclaimed:
1. An autonomous, **persona-diverse Swarm doing exploratory UI/UX *discovery*** (not scripted regression) — existing mobile-QA agents (minitap, mobilerun, callstack agent-device, Appium-MCP) run described/scripted flows.
2. **Proof-before-handoff on real devices in parallel** as a neutral gate downstream of whatever agent built the app.
3. **All three sponsor tools load-bearing** as organs of one product.

**Pitch discipline:** always "a crowd of diverse testers discovering the unscripted," never "an automated test runner." **Ambition stretch (if time):** per-Finding video clips; a second platform; bring-your-own app. Re-run the `hackathon-judge` skill against this PRD before build to confirm the originality line still holds.

## 10. Demo Narrative *(the 90-second showpiece — build toward this)*

- **0–10s:** "An AI agent built this Notes app and said it's done." Show it looking fine.
- **10–25s:** Click **Unleash Swarm**. A grid of 8–12 live iOS simulators boots, each labeled with its Persona.
- **25–60s:** They explore in parallel; bugs surface live — overlap on tiny screen, crash on empty state, frozen offline, title clipped for long names. Counter ticks: "14 issues found."
- **60–80s:** Swarm converges → Report site auto-builds: a headline **Swarm Rating ("2.8/5 · 12 testers")**, ranked issues with screenshots grouped by persona, each persona's one-line review ("Rage-Tapper: double-tap made dup notes — janky").
- **80–90s:** "The agent said done. 12 AI beta-testers gave it 2.8 stars and found 14 ways real users would've hit a wall — in 90 seconds, before one human." Open the shareable link. Mic drop.

## 11. Success Metrics

*Hackathon-flavored: success = winning the room, not retention.*

**Primary**
- **SM-1 (Demo completion):** the full demo path (UJ-1→UJ-3) runs to a built Report within the 90s window on demo day, with zero fatal failures. Target: 3 clean consecutive rehearsal runs. Validates FR-1, FR-2, FR-7, FR-9.
- **SM-2 (Visible discovery):** the Swarm surfaces ≥ 8 distinct, real-looking Findings across ≥ 5 personas during the demo. Validates FR-4, FR-5, FR-6.

**Secondary**
- **SM-3 (Grid wow):** ≥ 8 Simulators visibly live and labeled simultaneously on the Grid. Validates FR-2.
- **SM-4 (Shareable proof):** the Report link opens and renders for someone not at the laptop, with a Swarm Rating and per-persona Reviews. Validates FR-10, FR-12, FR-13.
- **SM-5 (Originality holds):** `hackathon-judge` scores originality favorably against the §9 wedge pre-build.
- **SM-6 (Reviews land):** every completed persona contributes a lens-appropriate Review + Rating that reads like a real beta-tester, not boilerplate. Validates FR-12.

**Counter-metrics (do not optimize)**
- **SM-C1 (Don't chase Finding count):** raw Finding volume should not be inflated with near-duplicates — readability of the feed/Report (FR-7 dedup) outranks a bigger counter. Counterbalances SM-2/SM-3.
- **SM-C2 (Don't over-stage):** guaranteed demo bugs (FR-11) should stay realistic; an obviously staged demo loses originality/credibility points. Counterbalances SM-1.

## 12. Open Questions

1. **OQ-1 (quota/credits):** Are lim.run Simulator and Replicas VM quotas/credits sufficient for a 12-Simulator concurrent Run on demo day? Confirm before committing to 12. *(Blocks swarm-size decision; see Risk.)*
2. **OQ-2 (streaming fidelity):** Does lim.run expose a live screen stream/frames suitable for the Grid, and at what latency? Determines FR-2 approach. *(Architecture de-risk.)*
3. **OQ-3 (exploration mechanism):** What drives autonomous action selection (FR-4) — vision model on screenshots, accessibility tree, or hybrid? *(Architecture; addendum.)*
4. **OQ-4 (auth in demo app):** Include lightweight auth in the Notes app to make auth-expiry demonstrable, or drop auth-expiry from the demo Battery? *(Scope.)*
5. **OQ-5 (final persona list):** Confirm the exact 8–12 personas and each one's targeted edge-case class.
6. **OQ-6 (convergence):** What signals "Run complete" — time budget, step budget, or coverage of the Battery?

## 13. Assumptions Index

- §2.1/2.2 — Web app coverage explicitly out for the prototype.
- §4.1 FR-1 — Partial-swarm start acceptable (degrade, don't abort) rather than all-or-nothing.
- §4.1 FR-2 — Near-live periodic screenshot frames suffice; full video streaming not required.
- §4.2 FR-3 — Additional personas to fill 8–12 grid (Slow-Network, Rapid-Switcher, Empty-State, Permission-Denier, Background/Resume, Deep-Link) — final list to confirm (OQ-5).
- §4.2 FR-4 — Action selection driven by a vision/UI-state model (mechanism in addendum; OQ-3).
- §4.3 FR-5 — Notes/Tasks demo app includes lightweight auth so auth-expiry is demonstrable (OQ-4).
- §4.4 FR-7 — Realtime delivery via InsForge realtime channel; basic dedup/grouping in scope, sophisticated clustering out.
- §4.5 FR-12 — Persona lens enforced via prompt/role; review text is best-effort generative output.
- §4.5 FR-10 — Public unauthenticated read of the Report acceptable for the demo.
- §4.6 FR-11 — A few guaranteed bugs intentionally present for demo determinism; acceptable and disclosed internally.
- §8 — lim.run/Replicas quotas sufficient for a 12-Simulator run, confirmed before demo day (OQ-1).
