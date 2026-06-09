# The AI Beta-Tester Swarm

Persona-diverse AI agents beta-test your mobile app on parallel iOS simulators in the cloud, hunt the UI/UX edge cases your coding agent missed, and hand you a ranked defect report with a **Swarm Rating** — before a single real user touches it.

Built on three load-bearing sponsor platforms: **[lim.run](https://lim.run)** (iOS simulators) · **[Replicas](https://replicas.dev)** (agent VMs) · **[InsForge](https://insforge.dev)** (backend, realtime, report hosting)

---

## How It Works

1. Submit your app target and click **Unleash Swarm**
2. The orchestrator provisions up to 12 parallel iOS simulators (**lim.run**) and 12 isolated agent VMs (**Replicas**) — one per persona
3. Each agent runs a continuous cognitive loop: **screenshot → LLM vision analysis → tap/type/gesture → log defect**
4. Findings stream over **InsForge Realtime** websockets into a live Next.js dashboard grid
5. When the swarm converges, it calculates an aggregated **Swarm Rating (1–5★)** and compiles a shareable, severity-ranked public audit report

---

## The 12 Personas

Each agent embodies a distinct real-world user profile designed to break fragile interfaces:

| Persona | Behavioral Bias | Targeted Edge Cases / Test Battery |
| :--- | :--- | :--- |
| **Rage-Tapper** | Double-fires buttons, never waits for spinners | `rapid_tap`, `overflow` |
| **Offline Commuter** | Drops connection mid-task to test state survival | `offline`, `slow_network` |
| **10k-Item Power User** | Loads thousands of items to stress lists and memory | `large_data`, `overflow` |
| **Long-Name / RTL** | 200-char titles, emoji, and right-to-left scripts | `long_name_rtl`, `overflow` |
| **Accessibility User** | Checks VoiceOver labels, font scales, contrast | `accessibility` |
| **Tiny-Screen User** | Runs smallest supported devices; watches for clipping | `tiny_screen`, `overflow` |
| **Slow-Network User** | 2G / lossy network; exposes missing spinners or silent timeouts | `slow_network` |
| **Empty-State Explorer** | Fresh launch with zero data; probes onboarding & first-run | `empty_state` |
| **Permission Denier** | Rejects camera/location/notification prompts | `auth_expiry`, `empty_state` |
| **Background Resumer** | Backgrounds app for minutes; checks session survival | `auth_expiry` |
| **Deep-Link Visitor** | Arrives at nested sub-routes; checks back-navigation | `empty_state`, `auth_expiry` |
| **Rapid Switcher** | Switches screens mid-load; stresses race conditions | `rapid_tap`, `slow_network` |

---

## Requirements

- **Node >= 23.6** — runs TypeScript natively via type-stripping (no build step). Verify: `node -v`
- **npm** (workspaces) — no `pnpm` required

---

## Quickstart

```bash
# Run shared contract types & seeder tests
npm test

# Regenerate Fake Swarm fixtures (deterministic seed 42)
npm run seed

# Start the Next.js web application
cd apps/web && npm install && npm run dev
# → http://localhost:3000
```

### 🔌 Fixture Mode (Default — Works Offline)

No backend connection or API keys required. The dashboard replays `fixtures/run-timeline.json` against the `SwarmWriter` seam and the report reads `fixtures/run-snapshot.json`. Perfect for evaluating and styling the UI locally.

### ⚡️ Live Mode (Real InsForge Backend)

To stream real-time runs through the database:

```bash
# 1. Copy and fill credentials from your InsForge dashboard
cp apps/web/.env.example apps/web/.env.local

# 2. Set the data source variable in apps/web/.env.local
NEXT_PUBLIC_DATA_SOURCE=insforge

# 3. Apply the Postgres database schema
npx @insforge/cli db migrations up --all

# 4. (Optional) Seed a converged run into InsForge for testing
node --env-file=.env packages/shared/scripts/seed-insforge.ts
```

With live mode active, **Unleash Swarm** calls `POST /api/runs`, which streams a real run into InsForge. The dashboard renders findings live over WebSockets, and the report reads them back once the swarm converges.

> [!IMPORTANT]
> Credentials are never committed. The app reads `apps/web/.env.local`; the CLI reads `.insforge/project.json` (both are gitignored).

---

## Workspace Map

```
packages/shared/          @swarm/shared — contracts, writer seam, Fake Swarm
  src/types.ts            C1 data model (single source of truth)
  src/personas.ts         C8 persona catalog (12 personas)
  src/fake-swarm.ts       C9 generator: generateSnapshot() + generateTimeline()
  src/writer.ts           SwarmWriter seam (fake → real swap)
  sql/schema.sql          C1 as Postgres DDL
  fixtures/*.json         seeded data the Dashboard + Report build against

apps/web/                 Next.js Dashboard (Live Grid) + Report Site
services/orchestrator/    Replicas + lim.run orchestration
agents/persona/           Persona Agent + DriverAgent (iOS + web)
demo-app/                 Notes/Tasks iOS app with pre-seeded edge cases
```

---

## Architecture & Integration Contracts

Full contracts (C1–C9) are defined in `_bmad-output/planning-artifacts/architecture.md §9`.

### 🔀 The Unblocking Seam
The **Fake Swarm** (`packages/shared/src/fake-swarm.ts`) emits the exact same JSON schemas as the real Persona Agents (contracts C3/C4). This allows the Dashboard and Report Site to be developed fully against local mock fixtures before the `lim.run` and `Replicas` physical APIs are fully wired. Moving from local mock to live operations is a single-line swap of the `SwarmWriter` seam, not a rewrite.

### 🛡️ InsForge BaaS Responsibilities

| Responsibility | Mechanism & Setup |
|---|---|
| **Database** | Postgres schema migrations located in `migrations/`; `InsForgeWriter` acts as the real `SwarmWriter`. |
| **Storage** | High-resolution defect screenshots captured by simulator cameras are uploaded directly to S3-compatible storage buckets. |
| **Realtime** | Subscription channels `run:{id}:status` and `run:{id}:findings` provide sub-second latency pushes directly to the React UI. |
| **LLM Gateway** | Proxies queries to vision-capable models (e.g., Claude Sonnet) with secure API key storage. |

---

## Web Testing (Epic 7)

The swarm also tests **websites**, not just native iOS applications:

- `agents/persona/src/webDriver.ts` — A Playwright-backed `DriverAgent` implementing the same C7 interface as `LimDriver`.
- `agents/persona/src/webDefects.ts` — A pure, testable analyzer: catches missing alt text, missing accessible names, missing `lang` attributes, blank renders, and console/network errors, cataloging them into standard battery-class findings.

Install `playwright` to run it live against any URL; the core analyzer is fully unit-tested with no active browser required.

---

## Live Agentic Mode

Beyond static fixtures, the swarm runs for real: `services/orchestrator/scripts/live-swarm.ts` provisions real cloud `lim.run` iOS simulators. Each agent dynamically determines its own flow via visual observation using an LLM through the InsForge Model Gateway — no hardcoded test scripts, no pre-seeded triggers.

The dashboard grid renders **live device frames** via `GET /api/frame/[simId]` (backed by `lim ios screenshot`), enabling you to watch real iOS devices navigate in parallel as telemetry streams in.

For detailed execution instructions, see `DEMO.md → Live agentic mode`.

---

## Design System & Aesthetics

The web UI follows an Apple-grade minimalist aesthetic: near-monochrome neutrals, a single high-contrast blue accent, the **Geist** typeface with tabular mono numerals for performance telemetry, pristine `lucide-react` line icons (no emojis in production UI), and spring animations.

- **Design tokens & styles:** `apps/web/app/globals.css`
- **Reusable components:** `apps/web/components/`

---

## Key Files Reference

| File | Purpose |
|---|---|
| `_bmad-output/planning-artifacts/prds/prd.md` | Product Requirements Document (PRD) |
| `_bmad-output/planning-artifacts/architecture.md` | Tech Architecture & cross-workstream contract schemas |
| `_bmad-output/planning-artifacts/build-plan.md` | Sprint epic schedule & build division |
| `packages/shared/src/types.ts` | Single source of truth for database schema types |
| `packages/shared/src/personas.ts` | Persona configurations & interactive review voices |
| `DEMO.md` | Live and mock simulation runbook |
