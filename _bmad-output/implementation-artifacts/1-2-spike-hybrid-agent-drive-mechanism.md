---
baseline_commit: c3640121359288afb92bef4d00eda011575d174b
---

# Story 1.2: SPIKE — Hybrid Agent Drive Mechanism

Status: done

## Story

As a developer,
I want to validate that a Claude agent can reliably drive an iOS simulator using both accessibility tree and screenshots,
so that persona agents can explore the app before we build all 6 personas.

## Acceptance Criteria

1. `lim ios element-tree` output is parseable JSON/XML with element IDs, labels, and bounds
2. Claude claude-sonnet-4-6 (tool_use) selects an element and calls `lim ios tap-element --ax-label <label>` — tap executes and element-tree reflects UI state change
3. `lim ios screenshot` returns base64-encoded image usable as Claude vision input
4. Given both element-tree and screenshot, Claude identifies a visual anomaly (e.g. text overflow) and emits a structured finding
5. Full agent loop (element-tree + screenshot → decide → act → repeat) runs 10 iterations without error
6. Round-trip latency per iteration ≤ 15 seconds
7. Agent successfully navigates to ≥ 3 distinct screens in 10 iterations
8. Confirmed tool definitions (`run_lim`, `get_screenshot`, `report_finding`) work as Claude tool_use spec
9. Spike results documented: latency, tool definitions, any lim CLI quirks

## Tasks / Subtasks

- [ ] Set up single-simulator environment (AC: 1)
  - [ ] `lim xcode build .` on sample-native-app
  - [ ] `lim ios create --attach` — get stream URL
  - [ ] Confirm app is installed and running
- [ ] Validate element-tree output (AC: 1)
  - [ ] Run `lim ios element-tree`
  - [ ] Confirm output is structured (JSON or XML) with accessible labels and bounds
  - [ ] Identify how to extract tappable elements programmatically
- [ ] Validate tap via ax-label (AC: 2)
  - [ ] Pick a button from element-tree output
  - [ ] Run `lim ios tap-element --ax-label "<label>"`
  - [ ] Re-run element-tree and confirm UI changed
- [ ] Validate screenshot as vision input (AC: 3)
  - [ ] Run `lim ios screenshot` — inspect output format
  - [ ] Confirm it is base64 or saveable as PNG
  - [ ] Pass to Claude claude-sonnet-4-6 as vision input: confirm Claude can describe what it sees
- [ ] Define and test Claude tool_use definitions (AC: 8)
  - [ ] Define `run_lim(cmd: str) → str` tool
  - [ ] Define `get_screenshot() → base64_str` tool
  - [ ] Define `report_finding(title: str, severity: str, description: str, repro_steps: list[str]) → None` tool
  - [ ] Test each tool in isolation via Anthropic SDK
- [ ] Build and run 10-iteration agent loop (AC: 4, 5, 6, 7)
  - [ ] Claude system prompt: "You are testing this iOS app. Use element-tree and screenshot to explore. Find and report any visual anomalies."
  - [ ] Each iteration: call run_lim("lim ios element-tree"), call get_screenshot(), Claude decides action
  - [ ] Measure wall-clock time per iteration
  - [ ] Count distinct screens reached
- [ ] Document findings (AC: 9)
  - [ ] Write `docs/spike-2-results.md`
  - [ ] Include: confirmed tool definitions (copy-pasteable), latency per step, lim CLI quirks found
  - [ ] Update sprint-status.yaml to `done`

## Dev Notes

### Critical Context

- **This spike's output is the tool definition spec.** Every persona agent in Epic 2 will use the exact tool definitions validated here. Document them precisely.
- **Hybrid = both, always.** Element-tree gives structure; screenshot gives visual truth. Agent uses both every iteration. Don't short-circuit to one or the other.
- **lim CLI instance context:** In a single shell/process, lim remembers the last created simulator. The spike uses one simulator, so no explicit --id needed.
- **Replicas + claude-auth:** In production, agents run on Replicas VMs with claude-auth for Anthropic API access. For this spike, run locally with ANTHROPIC_API_KEY. The tool loop itself is identical.

### lim CLI Reference

```bash
# Element tree (returns structured accessibility info)
lim ios element-tree

# Tap by accessibility label
lim ios tap-element --ax-label "Save"

# Tap by accessibility ID (preferred when available)
lim ios tap-element --ax-unique-id startButton

# Type text
lim ios type "hello world"

# Screenshot (check output format with --help)
lim ios screenshot --help
lim ios screenshot

# Start/stop video recording
lim ios record start
lim ios record stop -o /tmp/recording.mp4

# Check current state
lim ios --help
```

### Claude Tool Definitions (Draft — validate and finalize in spike)

```python
from anthropic import Anthropic
import subprocess, base64

client = Anthropic()

tools = [
    {
        "name": "run_lim",
        "description": "Execute a lim iOS CLI command and return stdout. Use for element-tree, tap, type, perform, record, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cmd": {"type": "string", "description": "Full lim command, e.g. 'lim ios element-tree' or 'lim ios tap-element --ax-label Save'"}
            },
            "required": ["cmd"]
        }
    },
    {
        "name": "get_screenshot",
        "description": "Take a screenshot of the current simulator state. Returns base64-encoded PNG for visual analysis.",
        "input_schema": {"type": "object", "properties": {}}
    },
    {
        "name": "report_finding",
        "description": "Report a UI/UX issue discovered. Call this when you observe unexpected, broken, or confusing behavior.",
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
        "description": "Signal that exploration is complete.",
        "input_schema": {"type": "object", "properties": {}}
    }
]

def run_tool(name, inputs):
    if name == "run_lim":
        result = subprocess.run(inputs["cmd"].split(), capture_output=True, text=True)
        return result.stdout + result.stderr
    elif name == "get_screenshot":
        result = subprocess.run(["lim", "ios", "screenshot"], capture_output=True)
        # Adjust based on actual lim screenshot output format
        return base64.b64encode(result.stdout).decode()
    elif name == "report_finding":
        print(f"FINDING [{inputs['severity']}]: {inputs['title']}")
        return "Finding recorded."
    elif name == "done":
        return "done"
```

### Agent Loop Pattern

```python
messages = [{"role": "user", "content": "Begin exploring the iOS app. Use element-tree and screenshot each iteration. Report any visual anomalies or broken behavior."}]

for iteration in range(10):
    import time; t = time.time()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        tools=tools,
        messages=messages,
        system="You are testing an iOS app for UI/UX bugs. Each turn: (1) run lim ios element-tree, (2) take a screenshot, (3) analyze both, (4) take one action, (5) if you see a bug report it. Continue exploring. Call done() after 10 iterations."
    )
    # Handle tool_use blocks
    for block in response.content:
        if block.type == "tool_use":
            result = run_tool(block.name, block.input)
            if block.name == "done":
                break
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": block.id, "content": result}]})
    print(f"Iteration {iteration+1}: {time.time()-t:.1f}s")
```

### What to Document in Spike Results

```markdown
# Spike 2: Hybrid Agent Drive Mechanism Results

- Date: YYYY-MM-DD
- element-tree output format: JSON / XML / plaintext
- Screenshot output format: base64 / file path
- Tool definitions: [paste final working versions]
- Avg latency per iteration: Xs
- Screens navigated in 10 iters: N
- Findings emitted: N
- Lim CLI quirks:
  - [e.g. element-tree requires simulator to be in foreground]
  - [e.g. screenshot returns file path not base64]
- Recommendation: proceed / modify loop / blocker
```

### Decision Gate

- **PASS:** ≤15s/iter, ≥3 screens, ≥1 finding, tools work → proceed to Epic 2
- **LATENCY FAIL (>15s/iter):** Optimize: reduce element-tree scope, use grep to filter tree, skip screenshot on non-visual actions
- **TOOL FAIL:** Debug tool definition format (input_schema mismatch), check Anthropic SDK version

### Project Structure Notes

- Spike script: `docs/spikes/spike-2-agent-loop.py`
- Results: `docs/spike-2-results.md`
- Final tool definitions copied verbatim to `agents/lim_tools.py` in Epic 2
- No production code; don't create `agents/` directory yet

### References

- lim CLI skill: `sample-native-app/.agents/skills/limrun-xcode-and-ios-simulator/SKILL.md`
- Architecture agent model decision: `_bmad-output/planning-artifacts/architecture.md#key-technical-decisions`
- Architecture hybrid interaction model: `_bmad-output/planning-artifacts/architecture.md#agent-interaction-model`
- Anthropic tool_use docs: `https://docs.anthropic.com/en/docs/tool-use`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ✅ lim installed on Replicas VM, LIM_API_KEY injected via environment variable
- ✅ Simulator created: `ios_uswb_01ktfjj17jfzer4jc1vgnqkc36`
- ✅ 10-iteration loop ran without fatal errors (2 non-fatal tap failures recorded)
- ✅ Avg latency 3.14s/iter, max 3.64s — 5× under 15s AC6 budget
- ✅ 4 distinct screens navigated (Home, Watch+notif dialog, Watch+not-paired alert, Files)
- ✅ All screenshots valid JPEGs (`FF D8 FF` magic bytes)
- ✅ Tap selector hardening needed: prefer AXUniqueId, check hittability
- ✅ Results documented in docs/spike-2-results.md + docs/spikes/spike-2-raw-findings.json
- ✅ Spike ran on Replicas agent (claude-opus-4-7) — confirms Replicas works for agentic tasks

### File List

- `docs/spike-2-results.md` (updated — full PASS results)
- `docs/spikes/spike-2-raw-findings.json` (new — per-iteration JSON record)
- `_bmad-output/implementation-artifacts/1-2-spike-hybrid-agent-drive-mechanism.md` (this file — status: done)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — 1-2: done)
