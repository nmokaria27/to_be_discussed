# Demo Runbook — The AI Beta-Tester Swarm

The 90-second showpiece. Two ways to run it; **fixture mode** is the bulletproof
default for stage, **live mode** proves the real InsForge backend.

## Pre-flight
```bash
npm install            # once
npm run test:all       # 27 tests must be green
```

## Fixture mode (offline, deterministic — recommended for stage)
```bash
cd apps/web && npm run dev      # http://localhost:3000
```
Deterministic seed (42) → always 12 personas, 22 findings, 3/5 Swarm Rating.
Nothing external can fail mid-demo.

## Live mode (real InsForge realtime)
```bash
# apps/web/.env.local must have NEXT_PUBLIC_INSFORGE_URL + ANON_KEY + INSFORGE_API_KEY
# and NEXT_PUBLIC_DATA_SOURCE=insforge
cd apps/web && npm run build && npm start    # http://localhost:3000
```
Unleash → `POST /api/runs` streams a run into InsForge → grid + feed update live
over InsForge realtime → converged → **View full report** (`/r/[runId]`, reads InsForge).

## The 90-second script (PRD §10)
1. **0–10s** — "An AI agent built this Notes app and said it's done." Show the app.
2. **10–25s** — Click **Unleash Swarm**. 12 labeled iOS simulators light up.
3. **25–60s** — Personas explore in parallel; findings stream in, counter climbs.
4. **60–80s** — Swarm converges → report auto-builds with the Swarm Rating.
5. **80–90s** — "The agent said done. 12 AI testers gave it 2.8★ and found 14 ways
   real users would've hit a wall — in 90 seconds, before one human." Open the link.

## Real swarm (proven, bounded) — lim.run + InsForge
```bash
cd sample-native-app
npx lim xcode build .            # build the Notes app (App-Under-Test)
npx lim ios create --attach      # real iOS simulator
cd .. && node --env-file=.env services/orchestrator/scripts/smoke-lim.ts
# -> one persona drives the real simulator, writes a real run+finding to InsForge
```

## Teardown (cost guardrail — NFR-5)
```bash
cd sample-native-app
npx lim ios list                 # see running simulators
npx lim ios delete --id <id>     # release each after the demo
```
Replicas: `replicas list` then `replicas delete <name>` for any spawned workspaces.

## Determinism notes
- Fixture mode is fully deterministic (seed 42) — same numbers every run.
- The demo app ships realistic seeded bugs (empty_state, long-name, rapid-tap,
  tiny-screen, large-data, accessibility) so the real swarm reliably finds issues
  without looking staged (SM-C2).

## Live agentic mode (real swarm, agents decide flows, live device frames)
The strongest demo: real iOS simulators streaming live in the grid while LLM agents decide their own flows.

```bash
# 1. start the web app (live InsForge mode)
cd apps/web && PORT=3000 npm start          # http://localhost:3000

# 2. in another terminal, launch the real swarm (bounded; --keep leaves sims up for live frames)
node --env-file=.env services/orchestrator/scripts/live-swarm.ts --size 2 --keep

# 3. open the printed URL — the grid shows REAL device frames + the agents' findings
#    http://localhost:3000/?run=<run_id>
```
- Agents decide flows via a vision LLM through the **InsForge Model Gateway** (OpenRouter); no scripts, no seeded bugs.
- Tiles poll `/api/frame/[simId]` → real `lim ios screenshot` frames (a wall of live iOS phones).
- Findings + reviews are written to InsForge and stream into the dashboard live; the report reads them back.
- **Teardown after**: `cd sample-native-app && npx lim ios list` then `npx lim ios delete <id>` for each (or omit `--keep` so the script tears down automatically).

Sponsors, all load-bearing: **lim.run** (live simulators the agents drive), **InsForge** (Postgres + realtime + Model Gateway for the agent brain + report hosting), **Replicas** (`spike-2-ios-agent` VM hosts the same agent code, repo-linked).
