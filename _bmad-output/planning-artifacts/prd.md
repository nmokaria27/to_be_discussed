# PRD: AI Beta-Tester Swarm

## Product Vision

Autonomous AI beta-testing swarm for mobile apps. Paste a GitHub repo URL → swarm of persona agents on real iOS simulators discovers UI/UX edge cases the coding agent never exercised → ranked evidence-backed report in minutes.

## Problem

AI-assisted mobile developers ship the happy path and discover the unhappy paths in production. 66% of developers say AI output being "almost right, but not quite" is their #1 frustration (SO Dev Survey 2025). Only ~3% highly trust AI accuracy. No fast way to discover UI/UX edge cases before real users hit them.

## Target Users

- **Primary**: AI-assisted mobile developers using Cursor, Claude Code, Copilot, etc.
- **Secondary (roadmap)**: Solo founders / vibe-coders shipping AI-built apps

## Functional Requirements

FR1: User submits a GitHub repository URL to launch a swarm test run from the dashboard
FR2: System clones the repo and builds an iOS app remotely via lim.run (no local macOS required)
FR3: System uploads the build artifact to lim.run Asset Storage for simulator installation
FR4: System spawns 4–6 persona agents in parallel, each running on its own Replicas VM
FR5: Each persona agent creates its own lim.run iOS simulator instance and captures its stream URL
FR6: Each persona agent explores the app autonomously using accessibility tree (lim ios element-tree) AND screenshot vision for hybrid redundancy
FR7: Each persona agent records video evidence (lim ios record) around detected UI/UX issues
FR8: Findings (title, severity, description, repro steps, screenshot URL, video URL, persona) are persisted to InsForge in real-time as they are discovered
FR9: Dashboard displays a live grid of all simulator streams (one cell per persona, labeled by persona name)
FR10: Dashboard shows a running issue counter that increments in real-time via WebSocket/InsForge realtime
FR11: Live issue feed surfaces findings with severity tags (critical / major / minor) as they stream in
FR12: System generates a shareable, ranked beta-test report when the swarm completes or times out
FR13: Report organizes findings by persona and severity, includes screenshots, video clips, and repro steps
FR14: Report is accessible via a shareable hosted URL (InsForge hosted)
FR15: Demo iOS app (Swift) ships with seeded UI/UX edge cases guaranteeing on-stage findings

### Persona Definitions

The 6 personas the swarm deploys:

1. **rage-tapper** — rapid repeated taps, double-taps, stress-tapping every button
2. **offline-commuter** — connects, browses, drops network mid-flow, reconnects
3. **power-user** — injects large datasets (10k+ items), scrolls to bottom, heavy search usage
4. **text-edge** — 200-character names, RTL text (Arabic/Hebrew), emoji, special characters
5. **accessibility** — navigates via accessibility tree only (no coordinates), tests VoiceOver labels
6. **tiny-screen** — iPhone SE form factor, detects clipped/overlapping UI elements

### Demo App Edge Cases (seeded for FR15)

- TodoListScreen: blank white screen when list is empty (no empty state)
- AddTodoScreen: no max-length on text input → 200-char name breaks layout
- TodoListScreen: no offline error handling → spinner runs forever with no network
- LoginScreen: expired auth token not checked → broken state instead of re-login
- ProfileScreen: username overflows on iPhone SE (buttons overlap)
- TodoListScreen: 10k item injection → janky scroll / freeze

## Non-Functional Requirements

NFR1: Time from "Unleash Swarm" to first finding appearing on dashboard ≤ 90 seconds
NFR2: Full run (paste URL → complete ranked report) ≤ 5 minutes total
NFR3: Minimum 4 parallel simulator streams running simultaneously for live demo grid display
NFR4: System must run entirely from Linux/cloud (no local macOS or Xcode required) via lim.run
NFR5: Dashboard WebSocket connection must handle reconnection without missing findings
NFR6: Each persona agent operates independently with no shared lim CLI state
NFR7: All three sponsor tools (lim.run, Replicas, InsForge) must be visibly load-bearing — removing any one breaks the product
NFR8: Build and simulator spin-up must be repeatable and deterministic for on-stage demo reliability

## Out of Scope (MVP)

- Android support
- MCP/CLI integration
- GitHub/CI per-PR integration
- Backend security/RLS auditing
- Web app testing
- Performance/load testing
- Auto-fixing found bugs
- Non-technical-founder UX polish
