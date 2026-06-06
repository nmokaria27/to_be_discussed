# Spike 1: Simulator Capacity + Stream Viability Results

- **Date:** 2026-06-06
- **Status:** PASS — proceed with 6-persona swarm

## Results Summary

| Metric | Target | Actual | Result |
|--------|--------|--------|--------|
| Simultaneous simulators | 4–6 | **6** | ✓ PASS |
| Parallel spin-up time | ≤ 60s | **2.2s** | ✓ PASS (27x better) |
| All stream URLs valid | YES | **YES** | ✓ PASS |
| All states ready | YES | **YES** | ✓ PASS |
| Stability at 4+ minutes | PASS | **PASS** | ✓ PASS |
| element-tree latency | — | **~3.2s** | noted |
| screenshot latency | — | **~3.0s** | noted |
| tap-element latency | — | **~4.6s** | noted |

## Key Findings

### 1. Parallel Spin-Up: 2.2s for 6 simulators

All 6 simulators reached `state: ready` in **2.2 seconds wall clock**. Individual instance creation was ~1.9–2.2s. This is 27× faster than the 60s NFR target.

### 2. Stream URL Format

Each `lim ios create --json` response includes:

```json
{
  "status": {
    "signedStreamUrl": "https://console.limrun.com/signedStream?token=lim_...&url=wss://...",
    "state": "ready",
    "id": "ios_uswb_..."
  }
}
```

- `signedStreamUrl` → embeddable as iframe `src` in dashboard grid
- Token appears to be long-lived (stable across 4+ minute test)
- URL is a WebSocket-based stream proxied through console.limrun.com

### 3. Labeling Works

`--label persona=rage-tapper` → persisted in `metadata.labels.persona`. Used to identify simulators per persona in orchestrator + dashboard.

### 4. lim CLI Quirks Discovered

| Command | Correct Syntax | Wrong Syntax |
|---------|----------------|--------------|
| `ios screenshot` | `lim ios screenshot <PATH> [--id <id>]` | `lim ios screenshot --id <id> -o <PATH>` |
| `ios delete` | `lim ios delete <ID>` | `lim ios delete --id <ID>` |
| `ios create` | result is stdout JSON when `--json` used | — |

### 5. Element Tree Output

JSON array, each node has:
- `AXLabel` — accessibility label (used for `tap-element --ax-label`)
- `AXUniqueId` — accessibility unique ID (preferred for `tap-element --ax-unique-id`)
- `AXFrame` — position/size string: `{{x, y}, {w, h}}`
- `role` — "AXButton", "AXStaticText", etc.
- `children` — nested elements
- `enabled` — whether element is interactive

### 6. Interaction Verified

Tap on Files app icon → Files app opened (verified via screenshot). UI state change reflected within ~3s of tap completion.

## Architecture Updates Required

Update `architecture.md`:
- Confirmed swarm size: **6 simulators** (not 4–6; use 6)
- Spin-up NFR: update from "≤60s" to **"≤5s"** (actual: 2.2s)
- Screenshot syntax: `lim ios screenshot <PATH> [--id <id>]`
- Delete syntax: `lim ios delete <ID>` (positional)
- Create syntax: `lim ios create --json --display-name <name> --label persona=<name>`

## Recommendation

**Proceed with full 6-persona swarm.** No blockers. lim.run is well within capacity.

Key inputs for SPIKE-2 / Epic 2:
- Per-iteration loop budget: element-tree (3.2s) + screenshot (3.0s) + tap (4.6s) = ~11s → well under 15s/iter AC
- `--json` flag on create gives clean structured output for orchestrator to parse
- `--label persona=<name>` enables persona tracking per instance
- Stream URL is in `status.signedStreamUrl` from create JSON output
