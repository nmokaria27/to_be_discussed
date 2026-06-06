# Addendum — The AI Beta-Tester Swarm

Technical-how, mechanism/transport decisions, and depth that belongs downstream (architecture) rather than in the capability-level PRD. The PRD references this file from §7 and §12.

## Sponsor wiring (for architecture de-risk)

- **lim.run** — provisions N cloud iOS Simulators per Run; need to confirm: concurrent-instance quota, how the running app/preview is loaded onto each Simulator, and what live-view surface is exposed for the Grid (screen frames vs. video stream vs. screenshot polling). See OQ-2.
- **Replicas** — one agent VM per Persona; each VM drives its bound Simulator and emits Findings. Need: spawn/orchestrate API for 8–12 parallel VMs, per-VM access to its Simulator, and a path to push Findings to InsForge (direct SDK/CLI from the VM, or via a collector service). 
- **InsForge** — schema for Runs / Findings / Personas; storage bucket for screenshots; realtime channel for the live feed; edge function + hosting for the Report site; auth + Postgres as the demo Notes app's backend.

## Exploration mechanism options (FR-4 / OQ-3)

Autonomous action selection candidates, to decide in architecture:
1. **Vision-model on screenshots** — feed current screen image + persona goal to a model that returns the next action. Most general, fits "exploratory discovery"; latency/cost per step.
2. **Accessibility tree / UI hierarchy** — drive from structured UI state. Faster/cheaper, more deterministic, but weaker at purely visual bugs (overlap, clipping) — which are exactly our headline Findings.
3. **Hybrid** — accessibility tree for navigation, vision for visual-defect detection (overlap/clipping/contrast). Likely best fit; more to build.

## Demo-determinism device (FR-11)

The "guaranteed bugs" are a rehearsal-reliability device, not product features. Keep them realistic. Mapping each headline persona → at least one reliably reproducible defect in the Notes app should be defined during build (e.g., Long-Name → title truncation without ellipsis; Empty-State → blank/crash on first launch; Offline → infinite spinner; Tiny-Screen → control overlap at smallest supported size).

## Deferred / ambition-stretch (from §6.2, §9)

- Per-Finding video/GIF clips (capture + encode + store).
- Second platform (Android) / mixed grid.
- Bring-your-own arbitrary app ingestion.
- Finding clustering / AI severity reasoning.
- Auto-fix + re-test loop (explicitly the Devin/Cursor lane — kept out by design).
