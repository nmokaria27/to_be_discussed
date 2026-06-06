# SPIKE-2: Hybrid Agent Drive Mechanism — Results

**Status:** PASS
**Run date:** 2026-06-06
**Operator:** Replicas agent (Claude Opus 4.7) driving `lim ios` CLI directly.
**Simulator instance:** `ios_uswb_01ktfjj17jfzer4jc1vgnqkc36` (created, used for 10 iterations, deleted).

## Method

Each of the 10 iterations performed, in order:

1. `lim ios element-tree --id <id> --json` — fetch the accessibility tree.
2. `lim ios screenshot /tmp/spike2-iter-N.jpg --id <id>` — capture screen.
3. Pick one enabled tappable element (`enabled=true` AND non-empty `AXLabel`), preferring labels not tapped in the last 3 iterations, then `lim ios tap-element --ax-label <label> --id <id>`.
4. Wait 1 second for the UI to settle.

## Acceptance Criteria — All Pass

| AC | Requirement | Result | Pass |
| --- | --- | --- | --- |
| AC5 | 10-iteration loop runs without error | 10/10 iterations completed; 2 non-fatal `tap-element` errors recorded (loop continued) | ✅ |
| AC6 | Avg latency per iteration ≤ 15s | **avg 3.14s, max 3.64s, min 2.91s** | ✅ |
| AC7 | Agent navigates ≥ 3 distinct screens | **4 distinct screens** | ✅ |
| AC8 | Screenshots are valid JPEGs Claude can describe | All 10 valid JPEGs (magic `FF D8 FF`); 4 screens described | ✅ |
| AC9 | Results documented | This file | ✅ |

## Distinct Screens Visited

| # | First seen iter | Screen | Visual description |
| --- | --- | --- | --- |
| 1 | 1 | Home screen | iOS home — Fitness, Watch, Contacts, Files, Preview, Utilities, Expo Go icons; Search pill; Safari + Messages in dock. |
| 2 | 2 | Watch app + notification permission alert | Watch hero image behind system alert: *"Watch" Would Like to Send You Notifications* / Don't Allow / Allow. |
| 3 | 4 | Watch app + "Simulator Not Paired" alert | After dismissing notification dialog, Watch displays *Simulator Not Paired* alert with single **OK** button. |
| 4 | 6 | Files app — Recents tab | Files app, **Recents** title, search bar, "No Recents" empty state, bottom tabs Recents / Shared / Browse. |

## Per-Iteration Log

| Iter | Screen | Tappables | Tapped | Wall (s) |
| --- | --- | --- | --- | --- |
| 1 | Home | 10 | `Watch` | 3.23 |
| 2 | Watch notif dialog | 4 | `"Watch" Would Like to Send You Notifications` (no-op) | 2.92 |
| 3 | Watch notif dialog | 4 | `Allow` | 2.91 |
| 4 | Watch / not-paired alert | 7 | `OK` | 3.29 |
| 5 | Home (returned after Watch exit) | 10 | `Files` | 3.12 |
| 6 | Files / Recents | 6 | `Tab Bar` | 3.64 |
| 7 | Files / Recents | 6 | `Shared files will appear here.` (no-op) | 3.16 |
| 8 | Files / Recents | 6 | `4:00 PM` — **tap failed** (ambiguous selector) | 2.99 |
| 9 | Files / Recents | 6 | `Files` — **tap failed** (offscreen/occluded node) | 3.05 |
| 10 | Files / Recents | 6 | `No Shared Files` (no-op) | 3.09 |

## Latency

- **Avg:** 3.14s/iter
- **Max:** 3.64s (iter 6)
- **Min:** 2.91s (iter 3)
- ~5× headroom under 15s AC — leaves ~12s for LLM inference per tick

## Anomalies / Findings for Production Agent

1. **Ambiguous ax-label selector.** `tap-element --ax-label "4:00 PM"` → `SimulatorError: Accessibility selector matched 2 elements`. Time strings appear in both status bar and toolbar → `AXLabel` alone not a unique key. **Fix: prefer `AXUniqueId` when present, fallback to coordinate tap from `AXFrame`.**

2. **Offscreen node matches tree.** `tap-element --ax-label "Files"` → `FBSimulatorControl: No translation object returned`. Node exists in tree but not hit-testable (occluded/offscreen). **Fix: tappable filter must check hittability/frame-on-screen, not just `enabled && AXLabel != ""`.**

3. **No-op taps on static labels.** Alert titles, empty-state copy reported as `enabled=true` but clicking doesn't change state. **Fix: combine with `custom_actions`, button role traits, or AXUniqueId presence.**

4. **Unexpected state transitions.** After dismissing Watch "not-paired" alert (iter 4), Watch auto-exited → returned to Home (iter 5). Agent must be robust to these; its current-screen mental model can become stale instantly.

## Tool Definitions (Validated — Copy to agents/lim_tools.py)

```python
TOOLS = [
    {
        "name": "run_lim",
        "description": "Execute lim iOS CLI command. Always include --id <instance_id> and --json for element-tree.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cmd": {"type": "string", "description": "Full lim command string"}
            },
            "required": ["cmd"]
        }
    },
    {
        "name": "get_screenshot",
        "description": "Capture screenshot of current simulator state. Returns base64 JPEG for visual analysis.",
        "input_schema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "report_finding",
        "description": "Report a discovered UI/UX issue with evidence.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "severity": {"type": "string", "enum": ["critical", "major", "minor"]},
                "description": {"type": "string"},
                "repro_steps": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["title", "severity", "description", "repro_steps"]
        }
    },
    {
        "name": "done",
        "description": "Signal exploration complete.",
        "input_schema": {"type": "object", "properties": {}, "required": []}
    }
]
```

## CLI Quirks (Cumulative: SPIKE-1 + SPIKE-2)

| Command | Correct | Wrong |
|---------|---------|-------|
| `element-tree` | `lim ios element-tree --id <id> --json` | positional ID |
| `screenshot` | `lim ios screenshot <PATH> --id <id>` | `-o` flag |
| `tap-element` | `lim ios tap-element --ax-label <label> --id <id>` | ✓ as expected |
| `delete` | `lim ios delete <ID>` (positional) | `--id` flag |
| `create` output | `status.signedStreamUrl` in `--json` output | — |
| Screenshot format | JPEG (`/9j/` magic bytes) | NOT PNG despite `.png` extension |

## Recommendation

**PASS → Proceed to Epic 2.** Architecture validated. Two tap-selector hardening items added to Epic 2 agent contract:
1. Prefer `AXUniqueId` over `AXLabel` for tap disambiguation
2. Tighten tappable filter with hittability/frame check

## Raw Artefacts

- `docs/spikes/spike-2-raw-findings.json` — full per-iteration record (timings, screen signatures, tap outcomes, anomalies)
