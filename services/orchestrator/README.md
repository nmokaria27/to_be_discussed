# services/orchestrator — Swarm & Sponsors (Dev A)

Provisions and binds the swarm; owns the riskiest sponsor integration.

**Responsibilities**
- `POST /runs` (contract C2): `{app_id, swarm_size, persona_keys[]}` → `{run_id}`. Create the `runs` + `personas` rows, return immediately, then provision async.
- Per persona: provision a lim.run iOS simulator (§3.1), spawn a Replicas VM running the Persona Agent (§3.2), bind 1:1, set `simulators.stream_url`.
- Track run lifecycle (`provisioning`→`running`→`converged`), compute `swarm_rating` on converge (FR-13), tear down sims+VMs (cost guardrail).
- Partial-swarm start: degrade, don't abort (FR-1).

**Do first**
- SPIKE-1 (lim.run): concurrency, app-install path, live-view type+latency, a11y-tree availability.
- SPIKE-2 (Replicas): VM spawn latency, persona+sim-binding injection, outbound net.
- Provide a `POST /runs` **stub** Day 0 so the Dashboard can call it.

**Contracts:** import shapes from `@swarm/shared` (C1/C2). Findings/reviews are written by the Persona Agent through `SwarmWriter` (C3/C4) — see `agents/persona`.
