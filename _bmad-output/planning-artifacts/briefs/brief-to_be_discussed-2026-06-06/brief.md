---
title: "Product Brief: The AI Beta-Tester Swarm"
status: draft
created: 2026-06-06
updated: 2026-06-06
---

# Product Brief: The AI Beta-Tester Swarm

## Executive Summary

AI coding agents have made *building* a mobile app almost free — and *trusting* it nearly impossible. The agent confidently says "done," but it only ever exercised the happy path. The empty state, the offline subway ride, the 200-character name, the rage-tap, the tiny screen, the expired session — the places real users actually break — go untouched. The developer finds out from a one-star review.

**The AI Beta-Tester Swarm** closes that gap. Paste a build or preview link and the product spins up a swarm of autonomous AI beta-testers, each on its own real cloud simulator, each embodying a distinct kind of user. They don't run a script — they *explore*, the way a crowd of real beta testers would, hunting the UI/UX edge cases your coding agent never checked. Minutes later you get a ranked, evidence-backed beta-test report — screen recordings, repro steps, severity — before a single real user touches the app.

It is built natively on the three sponsor platforms: **lim.run** supplies the real iOS/Android simulators each tester drives, **Replicas** runs the swarm (each persona agent on its own VM), and **InsForge** is the backend — swarm database, realtime dashboard, and the hosted report site. The wedge is timely and validated: 84% of developers now use AI tools, but trust in their output is at an all-time low, and "almost right, but not quite" is developers' #1 frustration. We turn that distrust into a 90-second, lean-forward demonstration.

## The Problem

AI-assisted mobile developers ship the happy path and discover the unhappy paths in production.

- **The agent doesn't test what it built.** It writes the screen and declares success without ever running the unhappy paths — empty/overflow states, offline, slow network, long/RTL text, rapid input, accessibility, small screens, auth expiry.
- **Mobile is where this hurts most.** UI/UX breakage hides on real devices and screen sizes; it doesn't surface in a code diff or a unit test.
- **The cost is real and quantified** (validated, primary sources, 2025):
  - **66%** of ~49k developers say AI output being "almost right, but not quite" is their #1 frustration (Stack Overflow Dev Survey 2025).
  - **45%** say debugging AI-generated code is *more* time-consuming (SO 2025).
  - Only **~3%** highly trust AI accuracy — while **84%** use or plan to use it (SO 2025). DORA 2024: **39%** have little/no trust.
  - A Stanford RCT (CCS 2023) found developers using AI wrote *more* insecure code **and rated it more secure** — the "confidently wrong" effect, with statistical backing.
- **How they cope today:** click through it themselves, ship and pray, or wire up brittle scripted test flows that only check the cases they already thought of. None of these *discover* the edge cases nobody anticipated.

## The Solution

A standalone web product that beta-tests a mobile app the way a diverse crowd of humans would — autonomously, in parallel, before launch.

1. **Point it at the app** — paste a build or preview link into the dashboard.
2. **The swarm launches** — N real iOS simulators spin up (lim.run), one per tester. Each is a **persona agent** (Replicas) with a distinct disposition: the rage-tapper, the offline commuter, the 10k-item power user, the long-name / RTL user, the accessibility user, the tiny-screen user.
3. **They explore, not script** — each agent navigates the live app looking for UI/UX breakage characteristic of its persona, watching its own real screen.
4. **Findings stream live** — issues land in InsForge in realtime and surface on a grid dashboard: every simulator visible, a running issue counter, severity as it's found.
5. **A report is produced** — ranked UI/UX edge cases, grouped by persona and severity, each with a screen recording, repro steps, and a shareable hosted link (InsForge).

The experience is "hand it your app, get back the beta-test report you'd normally wait weeks and real users to get."

## What Makes This Different

- **A swarm that *discovers*, not a runner that *replays*.** Existing mobile-QA agents (minitap mobile-use, mobilerun, callstack agent-device, Appium-MCP) execute *scripted or described* test flows, or are device control-planes. Our defensible wedge is an **autonomous, persona-diverse swarm doing exploratory UI/UX discovery** — finding the unscripted, in parallel, on real devices. We pitch "a crowd of diverse testers," never "an automated test runner."
- **Honest competitive read.** "Verify AI code" generically is a *funded* category — CodeRabbit ($60M at $550M), Qodo ($50M), Devin ($1B) — and they all verify *code/diffs*, mostly for the web, mostly checking the agent's *own* work. None field a parallel persona-swarm doing *exploratory mobile UX discovery* on real devices. **Our originality is the angle and the execution, not the problem.** [ASSUMPTION] We treat this gap as holding as of mid-2026; worth a final prior-art re-check (via the `hackathon-judge` skill) before/at submission.
- **All three sponsor tools are load-bearing organs, not decoration** — removing any one breaks the product (see *How It Works*). That directly targets the Best-Use-of-Sponsor-Tool prize while strengthening the core.
- **The demo *is* the product.** A wall of live phones finding bugs in real time is inherently a lean-forward moment — differentiation you can *see*, not just claim.

## Who This Serves

**Primary user — the AI-assisted mobile developer.** Builds mobile apps with a coding agent (Cursor, Claude Code, Copilot, etc.). Ships fast, but privately doesn't trust that "done" means done, and has no fast way to find the UI/UX edge cases before users do. Success for them: catch the embarrassing breakage in minutes, before launch, without writing test scripts. They are the most acutely affected slice of the validated 84% AI-adoption base.

**Secondary (roadmap) — solo founders / vibe-coders** shipping AI-built apps who can't read a stack trace but understand "here's a video of your app breaking for this kind of user." [ASSUMPTION] Out of scope for MVP; noted as the natural expansion audience.

## How It Works (Sponsor Architecture)

- **lim.run — the testbed.** Real cloud iOS (Android stretch) simulators, one per tester, live-streamable, no Mac required. This is *how* the swarm sees and touches the actual running app. Remove it → no real-device truth, just guesses.
- **Replicas — the swarm.** Each persona beta-tester is an autonomous agent on its own VM, exploring in parallel. This is *what* makes it a swarm rather than one bot. Remove it → a single serial tester, not a crowd.
- **InsForge — the backend & delivery.** Stores sessions/findings/recordings (Postgres + storage), powers the realtime grid dashboard, hosts the shareable report site, and serves as the demo app's backend so the swarm can also hit auth/empty/large-data edge cases. Remove it → no live dashboard, no persisted report, no shareable result.

## Success Criteria

**Product value (the honest metric):**
- Number of real UI/UX edge cases surfaced that the coding agent missed, per run.
- Time from "paste link" to "ranked report in hand" (target: minutes, not days). [ASSUMPTION] concrete target TBD after a build spike.
- Signal of trust: a developer would run this before shipping rather than click through manually.

**Hackathon win (the rubric):**
- **Originality** — judges perceive the persona-swarm-discovery angle as novel ("never seen before").
- **Demo impact** — the live multi-simulator grid stops the room.
- **Technical execution** — the end-to-end run (link → swarm → live findings → report) completes flawlessly on stage.
- **Sponsor use** — all three tools visibly core to the build.

## Scope

**In (MVP / demo):**
- Paste-a-link input → launch run.
- iOS-first via lim.run; **4–6 persona testers across 4–6 parallel simulators.**
- Autonomous exploration (not user-authored scripts).
- Live grid dashboard (all simulators + running issue counter) on InsForge realtime.
- Generated, shareable beta-test report: ranked issues, per-persona, with screen recordings + repro steps.
- One polished demo app with genuine UI/UX edge cases to exercise on stage.

**Out (for now):**
- Android (stretch / roadmap).
- MCP/CLI integration as an in-agent "definition-of-done" gate (compelling, but heavier; roadmap).
- GitHub/CI integration (per-PR runs).
- Backend security/RLS auditing, web-app testing, performance/load testing.
- Auto-fixing the bugs it finds (we *report*, we don't repair — keeps scope and originality tight).
- Non-technical-founder UX polish.

## The Demo (90 seconds)

1. **(0–10s)** "An AI agent built this app and said it's done." App looks fine.
2. **(10–25s)** Click **Unleash Swarm.** A grid of ~6 live simulators lights up, each labeled with its persona.
3. **(25–60s)** They explore in parallel; bugs surface live — overlap on a small screen, crash on empty state, frozen offline, clipped long names. Counter climbs: "11 issues found."
4. **(60–80s)** Swarm converges → report site auto-builds with per-device clips.
5. **(80–90s)** "The agent said done. The swarm found 11 ways real users would've hit a wall — in 90 seconds, before one human." Mic drop.

> Build discipline: the live grid is the showpiece and the highest-risk element — build it first and rehearse it until bulletproof.

## Vision

Start as the pre-launch beta-test swarm for AI-built mobile apps. Grow into the **proof-before-handoff layer for any coding agent**: a neutral skeptic that a developer (or the agent itself, via MCP) invokes before declaring work done — expanding across platforms (Android, web), surfaces (backend edge cases, accessibility, performance), and integration points (CI, in-agent gate). The end state: no AI-built product reaches a real user without first surviving a swarm of synthetic ones.

---

## Open Questions / Assumptions to Resolve

- [ASSUMPTION] Prior-art gap (persona-swarm exploratory mobile-UX discovery) holds at mid-2026 — re-verify via `hackathon-judge` before submission.
- [ASSUMPTION] lim.run supports enough parallel simulators with live streaming for a 6-up grid within demo constraints — confirm in an early technical spike.
- [ASSUMPTION] Replicas swarm spawn + per-agent simulator binding is fast enough for a live 90s demo — confirm in spike.
- [ASSUMPTION] Concrete success targets (time-to-report, issues-per-run) — set after the first build spike.
- Open: do persona agents drive the simulator via accessibility tree, vision, or a hybrid? (architecture decision, next phase.)
- Open: real exploratory discovery vs. a few guaranteed seeded bugs in the demo app to ensure on-stage reliability — likely both.
