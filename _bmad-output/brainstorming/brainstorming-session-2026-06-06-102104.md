---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Problems worth solving in the AI agents / automation space for a hackathon'
session_goals: 'Find the single problem worth solving that maps to a "never seen before" agentic product, with natural sponsor-tool fit (Replicas, lim.run, InsForge). Originality-first per judging rubric.'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Anti-Solution', 'Alien Anthropologist', 'First Principles Thinking', 'What If Scenarios']
ideas_generated: ['C0 The AI Beta-Tester Swarm (WINNER)', 'C1 Proof Receipts / nutrition label', 'C2 Edge-Case Bounty Swarm', 'C3 Self-Healing Handoff', 'C4 Non-Technical Guardian']
winning_concept: 'The AI Beta-Tester Swarm — autonomous persona-diverse agents beta-test a mobile app on parallel real simulators (lim.run), discover UI/UX edge cases (Replicas swarm), and produce a detailed report (InsForge backend + report site) before real users arrive.'
session_active: false
workflow_completed: true
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Sri (with Carson, Elite Brainstorming Specialist)
**Date:** 2026-06-06

## Session Overview

**Topic:** Problems worth solving in the AI agents / automation space for a hackathon

**Goals:** Find the single problem worth solving that maps to a "never seen before" agentic product, with natural sponsor-tool fit. Originality is the #1 weighted criterion (25%); demo impact + technical execution add another 40%.

### Context Guidance

Open agentic-products hackathon. Two prizes: Most Interesting Product, Best Use of a Sponsor Tool.
Sponsor tools (all agent/automation infra):
- Replicas — fleets of coding agents, each on its own VM (shell, browser, filesystem, internet, MCP). Wire to Slack/GitHub/webhooks. Multi-agent parallel work.
- lim.run — cloud Xcode + iOS/Android simulators; agents build/test native mobile apps end-to-end, shareable preview links, no Mac.
- InsForge — agent-native backend (auth, Postgres, storage, edge functions, model gateway, realtime, vector, payments); fully agent-operable via CLI.

Strategic read: win = novel agentic concept + flawless demo + a sponsor tool core (not bolted on). Combining two sponsor tools maxes both prizes.

### Session Setup

_Phase 1: divergent problem discovery. Goal 100+ ideas before any organization. Domain-shift every ~10 ideas to fight semantic clustering._

## Phase 1 — Question Storming (question pile)

**Carson seeds:**
- Q1 Why does every multi-agent demo end with a human babysitting all the agents?
- Q2 Why can't I point an agent at the physical world and have it just handle it?
- Q3 What can a fleet of 50 agents do that one agent fundamentally cannot — that nobody's built?
- Q4 Why do agents have no memory of the last 100 things they did for me?
- Q5 Why does an agent say "done!" when it never once watched its own work run?
- Q6 If an agent can spawn subagents, why doesn't it spawn a skeptic whose only job is to break the work?
- Q7 Why is "verify on a real device" the one thing agents can't do — where mobile bugs hide?
- Q8 What would it mean for an agent to be structurally incapable of claiming unproven success?

**Sri's questions (the hot thread — agents ship unverified, under-thought work with false confidence):**
- Q9 Why can't my agent do something like Playwright, but for mobile?
- Q10 Why can't my agent run multiple sub-agents and perform true orchestration? What's the limitation?
- Q11 Why doesn't the agent verify — run multiple agents, develop, check the solution works, build, do everything — before coming back instead of returning with baseless confidence?
- Q12 Why doesn't it use the internet to verify and ground all information?
- Q13 In backends, why does my agent miss obvious edge cases for the user?

**Emerging nerve:** Agents are confident generalists with no instinct for the unhappy path. They build the demo-happy version, never run/verify it, miss edge cases across backend + mobile + frontend, and report success they never earned. Maps cleanly to all three sponsors (Replicas = skeptic/builder fleet, lim.run = real-device verification, InsForge = real backend to test edge cases against).

## Grounded Research (web-verified, 2026-06-06)

### InsForge — confirmed gap
- YC-backed, ~11.4k GitHub stars, Apache 2.0, agent-native backend (auth, Postgres+pgvector, storage, edge functions, model gateway, realtime, CLI+MCP). Agents operate it via JSON-output CLI / MCP tools.
- **Biggest documented hole = NO testing/verification capability.** No test-data seeding, schema validation, RLS-policy testing, contract testing, or edge-case testing. Agents can *read* state (logs/schemas/metadata) but cannot *prove correctness*.
- Industry-corroborated: Supabase's own blog ("AI Agents Know About Supabase. They Don't Always Use It Right.") documents agents skipping RLS, creating `security_invoker`-less views, mismatched policies → silently broken/insecure backends. Conclusion: "the bottleneck is context, not capability."
- InsForge actively sponsors hackathons; founders market it as the anti-"backend-frustration-at-hackathons" play. Building a verification layer fits their narrative.

### Verification / skeptic-agent prior art — what's crowded vs white space
- **Crowded (commodity):** self-test loops, "run tests before done" (Claude Code hooks, Devin 2.2 "comes back with proof", Cursor Cloud Agents, Qodo Cover), LLM-as-judge, AI test generation, PBT/mutation+LLM.
- **Contested:** "comes back with proof / artifacts" (Devin owns premium end; Cloudflare Artifacts generalizing receipts); adversarial test generation (early research/products).
- **Genuine WHITE SPACE (defensible):**
  1. **Model-agnostic skeptic *layer*** that sits downstream of whatever agent the user already runs (Claude Code / Cursor / Copilot / Devin) and is hostile-by-default to the builder's self-report — verifies using outcomes the builder did NOT author. (Existing tools verify *themselves*; an independent skeptic verifying *someone else's* agent is open.)
  2. **A named edge-case battery as the product spine** — null / empty / boundary / concurrency / **auth-expiry** / large-input. Auth-expiry + concurrency under-served everywhere.
  3. **Anti-overfitting verification** — generate oracles from *intent/spec*, not from the agent's own implementation (counters documented test-overfitting), prove via mutation survival.
  4. **Unified web + real-mobile-device proof-before-handoff** — everyone does one or the other; gating handoff on BOTH a passing web run AND a real-device (lim.run) run appears unclaimed.

### Crystallizing concept (the "never seen before" one-liner)
An **adversarial verification layer that any coding agent plugs into**, which refuses to let that agent claim "done" until it has independently broken-tested the *running artifact* — on a real backend (InsForge) and a real mobile device (lim.run), in parallel via a skeptic fleet (Replicas) — against a fixed edge-case battery, using oracles derived from intent rather than the agent's own code. Each ingredient exists; the **combination + neutral-skeptic-layer positioning** does not.

**Sponsor fit (all three, core not bolted-on):** Replicas = parallel skeptic/adversary fleet each on its own VM; lim.run = real-device verification step; InsForge = the live backend the skeptic provisions + attacks (and fills InsForge's own #1 gap).

## Problem Validation (web-verified, 2026-06-06) — VALIDATED, LARGE

### The pain is real and quantified (primary sources)
- **66%** of ~49k developers say "AI solutions almost right, but not quite" is their #1 frustration (Stack Overflow Dev Survey 2025).
- **45%** say debugging AI-generated code is *more* time-consuming (SO 2025).
- Trust at all-time low: only **~3% highly trust** AI accuracy; **~46% actively distrust** — even as **84%** use/plan to use AI (SO 2025). DORA 2024: **39%** little/no trust.
- **45% of AI-generated code fails security tests / introduces an OWASP Top-10 vuln**, across 100+ LLMs; flat regardless of model size/recency (Veracode 2025 GenAI Code Security Report). Java 72% fail; XSS 86% fail.
- Stanford RCT (ACM CCS 2023): devs with AI wrote **more** insecure code (36% vs 7% SQLi) AND rated their insecure code as *more* secure — statistically significant "confidently wrong."
- METR RCT (2025): experienced OSS devs were **19% slower** with AI while *believing* they were 20% faster. (Narrow n=16, handle carefully — but the perception gap is the point.)
- SWE-Bench Pro (Scale AI 2025): frontier models >70% on SWE-bench Verified but **≤23%** on real/enterprise tasks — benchmark-vs-reality gap = edge-case-miss, quantified.
- Agentic overconfidence preprint (2026): agents predicted **73%** success vs true **35%** — systematic over-reporting (emerging source).

### Market is large, growing, monetizable
- ~**25–40M** developers already use AI coding tools (84–85% of ~30M+ global devs); Gartner: **90%** enterprise adoption by 2028. Agentic sub-segment ~**31%** and fastest-growing.
- AI code tools market ≈ **$7B (2025) → ~$24–26B (2030), ~26% CAGR** (Mordor/Grand View, convergent). Adjacent AI-testing pool +$1–4.6B.

### CRITICAL strategic finding — the wedge is already venture-funded
- **CodeRabbit** (AI code review / "quality gates for AI coding"): **$60M Series B at $550M val**, ~20%/mo growth, NVIDIA-backed.
- **Qodo** (ex-CodiumAI, "code integrity" / AI test gen): **$50M raised, 1M+ devs.**
- **Devin/Cognition** ("comes back with proof"): **$1B raised at ~$26B val.** Snyk AI security >$100M ARR.

**Implication:** Problem validation = A+. But "verify AI code" generically is NOT original — it's a funded category. **Our originality must come from the specific angle**, not the problem:
1. Neutral, **model-agnostic skeptic LAYER** that audits *someone else's* agent (incumbents verify themselves).
2. **Proof-before-handoff on BOTH web AND a real mobile device** (lim.run) — unclaimed combination.
3. **Oracles derived from intent/spec, not the agent's own code** (counters documented test-overfitting).
4. **Adversarial skeptic fleet** (Replicas) executing the running artifact to break it — not just reviewing the diff.
5. Edge-case battery spine incl. under-served **auth-expiry + concurrency**.

**Verdict:** Build it. The problem is proven huge; the white space is in the *stance + sponsor-native execution*, which is exactly where we can score "never seen before."

## Phase B — Rival Concepts (pressure-test the Skeptic Layer)

All solve the same validated pain (AI ships unverified, edge-case-blind, over-confident work). Goal: confirm the front-runner isn't tunnel vision.

**[C0] The Skeptic Layer** (front-runner)
_Concept_: A neutral, model-agnostic adversarial verification gate. Plugs in downstream of ANY coding agent; refuses "done" until it has independently broken the running artifact on a real backend (InsForge) + real mobile device (lim.run), via a parallel adversary fleet (Replicas), using intent-derived oracles + an edge-case battery (null/empty/boundary/concurrency/auth-expiry/large-input).
_Novelty_: Audits *someone else's* agent (incumbents verify themselves); web+mobile proof-before-handoff combined; intent oracles beat test-overfitting.

**[C1] Proof Receipts / "Nutrition Label" for AI work**
_Concept_: A trust-protocol layer. Every agent task emits a signed, auditable receipt of what was actually verified — "ran on real iPhone ✓, 6 edge cases tested ✓, RLS checked ✓, 2 vulns found ✗." A standard + dashboard, not a gate. Ships with a shareable "nutrition label" badge.
_Novelty_: Reframes the problem as trust *infrastructure / credentialing* for agent output — nobody has a portable proof standard. InsForge stores receipts; Replicas runs checks; lim.run = device proof line item.

**[C2] Edge-Case Bounty Swarm**
_Concept_: Gamified adversarial discovery. Spawn a Replicas fleet of diverse "attacker personas" — the rage-tapper, the offline commuter, the 10k-row power user, the script kiddie — that swarm the app live and file bug "bounties" in real time on a leaderboard. lim.run runs the mobile personas on real devices.
_Novelty_: Persona-driven adversarial swarm + live leaderboard = highest *demo impact* (room watches bugs get found in real time). Replicas is the literal star.

**[C3] Self-Healing Handoff**
_Concept_: Don't just catch — fix. A loop that verifies, finds failures, spawns parallel fix attempts (Replicas), re-verifies on real device (lim.run) + real backend (InsForge), and delivers a *working* app + shareable preview link instead of a verdict.
_Novelty_: Outcome (a shipped, proven-working app) over a report. Risk: closest to Devin/Cursor — weakest originality of the four.

**[C4] Non-Technical Guardian** (audience-shift variant)
_Concept_: A guardian between a vibe-coding agent and a non-technical founder. Translates "7 ways your users will break this" into plain English, shows it failing on a real phone, fixes it before launch.
_Novelty_: Audience shift to non-devs (the most over-confident, least-protected users); emotional demo. Sponsor fit strong but problem framing overlaps C0/C3.

## Phase A — LOCKED & SHARPENED: "The AI Beta-Tester Swarm" (C0, mobile-focused)

**Decision (Sri):** Lock C0, narrow to mobile UI/UX. Simple, buildable, demo-gorgeous.

### One-liner
A swarm of autonomous AI beta-testers that exercise your mobile app on dozens of real simulators in parallel, hunt the UI/UX edge cases your coding agent never checked, and hand you a detailed beta-test report — before a single real user touches it.

### Problem it nails (validated)
AI agents (and humans) ship the happy-path mobile UI and never test the unhappy paths — small screens, empty/overflow states, offline, slow network, long names/RTL, rapid taps, accessibility. The agent says "done"; real users hit walls. (66% "almost right but not quite"; mobile bugs hide on real devices — SO 2025.)

### How it works (all 3 sponsors load-bearing)
1. **Point it at an app** (build/preview link or repo). 
2. **lim.run** spins up N cloud simulators (iOS/Android), one per tester instance — live, streamable, no Mac.
3. **Replicas** spawns the swarm: each agent gets its own VM + a simulator and embodies a distinct **beta-tester persona** (rage-tapper, offline commuter, 10k-item power user, long-name/RTL user, accessibility user, tiny-screen user). They *explore* — not run a script — looking for UI/UX breakage.
4. **InsForge** is the swarm's backend: stores findings/sessions/screenshots (Postgres + storage), powers the live dashboard (realtime), and hosts the **beta-test report website** (edge functions + hosting). Also serves as the demo app's backend so the swarm can hit auth/empty/large-data edge cases.
5. **Detailed report** generated for the user: ranked UI/UX edge cases, per-persona, with screenshots/video clips + repro steps + a shareable link.

### The 90-second demo (the jaw-drop)
- (0–10s) "An AI agent built this app and said it's done." Show the app looking fine.
- (10–25s) Click **Unleash Swarm**. A grid of ~6–12 live simulators lights up, each labeled with its persona.
- (25–60s) They interact in parallel; bugs surface live — button overlaps on small screen, crash on empty state, frozen on offline, text clipped for long names. A counter ticks: "14 issues found."
- (60–80s) Swarm converges → report website auto-builds: ranked issues with device clips.
- (80–90s) "The agent said done. The swarm found 14 ways real users would've hit a wall — in 90 seconds, before one human." Mic drop.

### MVP scope (flawless happy path = 20% technical execution)
- 1 polished demo app with genuine (and a few guaranteed) UI/UX edge cases.
- 4–6 personas × 4–6 lim.run simulators in parallel.
- Orchestrator (Replicas) → findings to InsForge → live grid dashboard → generated report site.
- The **live multi-simulator grid** is the showpiece; rehearse it until bulletproof.

### Originality guard (stay "never seen before")
Existing mobile-QA agents (minitap mobile-use, callstack agent-device, mobilerun, Appium-MCP) run *scripted/described* test flows or are device control-planes. Our wedge: an **autonomous, persona-diverse SWARM doing exploratory UI/UX *discovery* (not regression), in parallel on real devices, as a proof-before-handoff gate.** Keep the pitch on *crowd of diverse testers discovering the unscripted* — never "automated test runner." (Verify this gap holds at scoring time.)

## Idea Organization and Prioritization

**Thematic organization (the question pile → 3 themes):**
- **Theme 1 — The trust/verification gap:** agents claim "done" without proof (Q5, Q8, Q11). Root nerve of the session.
- **Theme 2 — Orchestration & swarms:** true multi-agent parallel work nobody has nailed (Q1, Q3, Q6, Q10).
- **Theme 3 — Real-world / mobile verification:** agents can't see/test on real devices; backend edge cases missed (Q7, Q9, Q12, Q13).

The winning concept sits at the **intersection of all three**: a swarm (T2) that verifies (T1) on real mobile devices (T3).

**Prioritization result — WINNER (locked):**
**The AI Beta-Tester Swarm** — autonomous persona-diverse agents beta-test a mobile app on parallel real simulators, discover unscripted UI/UX edge cases, and produce a detailed report before real users arrive. Beat rivals C1–C4 on the combination of originality + demo impact + all-3-sponsor fit + buildability.

**Action plan / next steps:**
1. Next BMad phase → Product Brief (or PRFAQ) to formalize the concept, users, scope, success metrics.
2. Then PRD → architecture → epics/stories → build.
3. Technical de-risk early: confirm lim.run parallel-simulator orchestration + Replicas swarm spawn + InsForge realtime dashboard wiring.
4. Pre-build originality re-check: run `hackathon-judge` on the final concept once the brief exists.
5. Demo-first build discipline: the live multi-simulator grid is the showpiece — build and rehearse it until bulletproof.

## Session Summary and Insights

**Key achievements:**
- Diverged across 17+ questions, then converged on a validated, grounded problem.
- Web-verified BOTH the problem (huge: 66% "almost right", 45% AI code fails security, trust at all-time low) AND the competitive landscape (CodeRabbit/Qodo/Devin funded → originality must come from the angle, not the problem).
- Pressure-tested 5 rival concepts; locked the strongest and grafted the best of the others.
- Sharpened into a simple, demo-gorgeous product with all three sponsors load-bearing.

**Key insight:** The win isn't solving "AI doesn't verify" (funded category) — it's the *stance + sponsor-native execution*: a persona-diverse swarm doing exploratory mobile-UX discovery on real devices, as a proof-before-handoff gate.

**Session status:** Brainstorming complete. Concept locked. Ready for Product Brief.
