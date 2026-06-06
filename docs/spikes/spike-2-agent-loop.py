#!/usr/bin/env python3
"""
SPIKE-2: Hybrid Agent Drive Mechanism
Validates: Claude claude-sonnet-4-6 driving iOS simulator via ax-tree + vision.

Usage:
    ANTHROPIC_API_KEY=sk-ant-... LIM_API_KEY=lim_... python3 spike-2-agent-loop.py

Output:
    - spike-2-results.md (findings document)
    - spike-2-raw-findings.json (raw finding records)
"""

import asyncio
import base64
import json
import os
import subprocess
import time
from pathlib import Path

import anthropic

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
LIM_API_KEY = os.environ["LIM_API_KEY"]
INSTANCE_ID = os.environ.get("LIM_INSTANCE_ID", "")  # set after create, or pass in
MODEL = "claude-sonnet-4-6"
MAX_ITERATIONS = 10

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
findings = []
screens_seen = set()
iteration_times = []

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "run_lim",
        "description": (
            "Execute a lim iOS CLI command and return stdout+stderr. "
            "Use for: element-tree, tap-element, type, perform, record, press-key, scroll. "
            "Always pass --id flag with the instance ID. "
            "Example: 'lim ios element-tree --id ios_xxx --json'"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "cmd": {
                    "type": "string",
                    "description": (
                        "Full lim command string. "
                        "ALWAYS include --id flag. "
                        "For element-tree always add --json. "
                        "Examples: "
                        "'lim ios element-tree --id {id} --json', "
                        "'lim ios tap-element --ax-label Save --id {id}', "
                        "'lim ios type hello --id {id}'"
                    ).format(id=INSTANCE_ID),
                }
            },
            "required": ["cmd"],
        },
    },
    {
        "name": "get_screenshot",
        "description": (
            "Capture a screenshot of the current simulator state. "
            "Returns base64-encoded JPEG image for visual analysis. "
            "Use to detect visual anomalies, layout issues, overlapping elements, "
            "text overflow that the element tree cannot catch."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "report_finding",
        "description": (
            "Report a UI/UX issue you discovered. "
            "Call this when you observe: broken layouts, missing error states, "
            "unresponsive elements, visual overflow, unexpected behavior. "
            "Be specific: include what you did and what went wrong."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short issue title"},
                "severity": {
                    "type": "string",
                    "enum": ["critical", "major", "minor"],
                    "description": "critical=crash/data loss, major=broken flow, minor=visual glitch",
                },
                "description": {
                    "type": "string",
                    "description": "What is broken and why it matters",
                },
                "repro_steps": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Numbered steps to reproduce the issue",
                },
            },
            "required": ["title", "severity", "description", "repro_steps"],
        },
    },
    {
        "name": "done",
        "description": "Signal that exploration is complete. Call after 10 iterations or when you have exhausted the visible UI.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


# ─── Tool Execution ───────────────────────────────────────────────────────────

def run_tool(name: str, inputs: dict) -> str:
    if name == "run_lim":
        cmd = inputs["cmd"]
        # Inject LIM_API_KEY into subprocess env
        env = {**os.environ, "LIM_API_KEY": LIM_API_KEY}
        result = subprocess.run(
            cmd.split(),
            capture_output=True,
            text=True,
            env=env,
            timeout=30,
        )
        output = result.stdout + result.stderr
        # Track screens from element-tree output
        if "element-tree" in cmd and "--json" in cmd:
            try:
                tree = json.loads(result.stdout)
                if tree and isinstance(tree, list):
                    app_label = tree[0].get("AXLabel", "unknown")
                    screens_seen.add(app_label)
            except Exception:
                pass
        return output[:4000]  # truncate to avoid token overflow

    elif name == "get_screenshot":
        path = f"/tmp/spike2-iter-{len(iteration_times)}.jpg"
        env = {**os.environ, "LIM_API_KEY": LIM_API_KEY}
        subprocess.run(
            ["lim", "ios", "screenshot", path, "--id", INSTANCE_ID],
            capture_output=True,
            env=env,
            timeout=15,
        )
        with open(path, "rb") as f:
            return base64.standard_b64encode(f.read()).decode()

    elif name == "report_finding":
        finding = {
            "title": inputs["title"],
            "severity": inputs["severity"],
            "description": inputs["description"],
            "repro_steps": inputs["repro_steps"],
            "iteration": len(iteration_times),
        }
        findings.append(finding)
        print(f"  📋 FINDING [{inputs['severity'].upper()}]: {inputs['title']}")
        return "Finding recorded."

    elif name == "done":
        return "done"

    return f"Unknown tool: {name}"


# ─── Agent Loop ───────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a QA tester exploring an iOS app to find UI/UX bugs.

Your approach each iteration:
1. Call run_lim with 'lim ios element-tree --id {id} --json' to get the UI structure
2. Call get_screenshot to see the visual state
3. Analyze both: look for anomalies, missing states, broken layouts
4. Take ONE action (tap an element, type text, scroll, etc.)
5. If you see something broken, call report_finding immediately

Be exploratory: try different parts of the app each iteration.
Navigate to at least 3 different screens.
After 10 iterations, call done().
""".format(id=INSTANCE_ID)


def run_agent_loop():
    messages = [
        {
            "role": "user",
            "content": f"Start exploring the iOS simulator (id={INSTANCE_ID}). Explore the app and report any UI/UX issues you find.",
        }
    ]

    for iteration in range(MAX_ITERATIONS):
        t_start = time.time()
        print(f"\n--- Iteration {iteration + 1}/{MAX_ITERATIONS} ---")

        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
            system=SYSTEM_PROMPT,
        )

        tool_results = []
        should_stop = False

        for block in response.content:
            if block.type == "tool_use":
                tool_name = block.name
                tool_inputs = block.input
                print(f"  → {tool_name}({list(tool_inputs.keys())})")

                if tool_name == "get_screenshot":
                    b64 = run_tool(tool_name, tool_inputs)
                    # Return image as vision content
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": b64,
                                },
                            }
                        ],
                    })
                elif tool_name == "done":
                    run_tool(tool_name, tool_inputs)
                    should_stop = True
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "Exploration complete.",
                    })
                else:
                    result = run_tool(tool_name, tool_inputs)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

        elapsed = time.time() - t_start
        iteration_times.append(elapsed)
        print(f"  ⏱  {elapsed:.1f}s")

        if tool_results:
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        if should_stop or response.stop_reason == "end_turn":
            print("\nAgent signaled done.")
            break

    return {
        "iterations": len(iteration_times),
        "avg_latency_s": round(sum(iteration_times) / len(iteration_times), 1) if iteration_times else 0,
        "max_latency_s": round(max(iteration_times), 1) if iteration_times else 0,
        "screens_seen": list(screens_seen),
        "findings": findings,
        "latency_per_iter": [round(t, 1) for t in iteration_times],
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    global INSTANCE_ID

    print(f"\n{'='*60}")
    print("SPIKE-2: Hybrid Agent Drive Mechanism")
    print(f"Model: {MODEL}")
    print(f"Max iterations: {MAX_ITERATIONS}")
    print(f"Instance: {INSTANCE_ID or 'will use last created'}")
    print(f"{'='*60}\n")

    if not INSTANCE_ID:
        print("Creating simulator...")
        result = subprocess.run(
            ["lim", "ios", "create", "--json", "--display-name", "spike-2-agent"],
            capture_output=True, text=True,
            env={**os.environ, "LIM_API_KEY": LIM_API_KEY}
        )
        data = json.loads(result.stdout)
        INSTANCE_ID = data["metadata"]["id"]
        print(f"Created: {INSTANCE_ID}")
        # Update SYSTEM_PROMPT with actual ID
        global SYSTEM_PROMPT
        SYSTEM_PROMPT = SYSTEM_PROMPT.replace("{id}", INSTANCE_ID)
        for tool in TOOLS:
            if "id}" in json.dumps(tool):
                tool_str = json.dumps(tool).replace("{id}", INSTANCE_ID)
                tool.update(json.loads(tool_str))

    print("Running agent loop...")
    results = run_agent_loop()

    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")
    print(f"Iterations completed: {results['iterations']}")
    print(f"Avg latency/iter: {results['avg_latency_s']}s")
    print(f"Max latency/iter: {results['max_latency_s']}s")
    print(f"Screens navigated: {len(results['screens_seen'])} — {results['screens_seen']}")
    print(f"Findings: {len(results['findings'])}")
    for f in results["findings"]:
        print(f"  [{f['severity'].upper()}] {f['title']}")

    # Save raw results
    out_dir = Path(__file__).parent
    with open(out_dir / "spike-2-raw-findings.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nRaw results: {out_dir}/spike-2-raw-findings.json")

    # Cleanup
    if INSTANCE_ID:
        subprocess.run(
            ["lim", "ios", "delete", INSTANCE_ID],
            capture_output=True,
            env={**os.environ, "LIM_API_KEY": LIM_API_KEY}
        )
        print(f"Deleted simulator: {INSTANCE_ID}")

    return results


if __name__ == "__main__":
    main()
