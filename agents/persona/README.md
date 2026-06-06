# agents/persona — Persona Agent & DriverAgent (Dev A, Claude assists)

The autonomous beta-tester that runs on a Replicas VM bound to one lim.run simulator.

**Responsibilities**
- Load a persona config from the catalog (`@swarm/shared` C8): system prompt = `disposition`, biased toward `target_edge_cases`.
- Explore loop (FR-4, non-scripted): `observe → decide → act`, budget-bounded (default per-persona wall-clock; OQ-6).
- On a defect: upload screenshot + insert a Finding via `SwarmWriter` (C3).
- On finish: produce a lens-appropriate Review + 1..5 Rating (C4, FR-12).

**DriverAgent interface (C7)** — decouples persona logic from lim.run:
```ts
interface DriverAgent {
  observe(): Promise<{ screenshot: Buffer; a11yTree?: UiNode[] }>;
  act(action: Action): Promise<void>;          // tap | tapNode | type | gesture | setNetwork
  detectVisualDefects(obs): Promise<DefectHint[]>; // vision: overlap, clipping, contrast, blank
}
```
Build a `FakeDriver` first (scripted screens) to develop persona logic with no simulator. Real impl chosen by SPIKE-1: **hybrid** (a11y nav + vision defects) or **vision-only** fallback — same interface.

**Contracts:** `@swarm/shared` for types + `SwarmWriter`. Emit the SAME shapes the Fake Swarm emits so the fake→real swap is a no-op for Dashboard/Report.
