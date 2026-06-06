#!/usr/bin/env python3
"""
SPIKE-1: Simulator Capacity + Stream Viability
Tests whether lim.run supports 4-6 parallel iOS simulators with live streaming.
"""

import asyncio
import json
import os
import subprocess
import time

LIM_API_KEY = os.environ.get("LIM_API_KEY", "")
PERSONAS = ["rage-tapper", "offline-commuter", "power-user", "text-edge", "accessibility", "tiny-screen"]


async def create_simulator(persona: str, idx: int) -> dict:
    """Create one iOS simulator and return its metadata including stream URL."""
    t_start = time.time()
    proc = await asyncio.create_subprocess_exec(
        "lim", "ios", "create",
        "--json",
        "--display-name", f"swarm-{persona}",
        "--label", f"persona={persona}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env={**os.environ, "LIM_API_KEY": LIM_API_KEY},
    )
    stdout, stderr = await proc.communicate()
    elapsed = time.time() - t_start

    if proc.returncode != 0:
        return {"persona": persona, "success": False, "error": stderr.decode(), "elapsed": elapsed}

    data = json.loads(stdout.decode())
    return {
        "persona": persona,
        "success": True,
        "id": data["metadata"]["id"],
        "stream_url": data["status"]["signedStreamUrl"],
        "state": data["status"]["state"],
        "elapsed": elapsed,
    }


async def main():
    print(f"\n{'='*60}")
    print("SPIKE-1: Parallel Simulator Launch Test")
    print(f"Target: {len(PERSONAS)} simulators in parallel")
    print(f"{'='*60}\n")

    wall_start = time.time()

    # Launch all simulators in parallel
    tasks = [create_simulator(p, i) for i, p in enumerate(PERSONAS)]
    results = await asyncio.gather(*tasks)

    wall_elapsed = time.time() - wall_start

    # Report
    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")

    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]

    for r in results:
        if r["success"]:
            print(f"  ✓ {r['persona']:<20} id={r['id'][-8:]}  t={r['elapsed']:.1f}s")
            print(f"    stream: {r['stream_url'][:80]}...")
        else:
            print(f"  ✗ {r['persona']:<20} ERROR: {r['error'][:60]}")

    print(f"\n{'='*60}")
    print(f"Total wall-clock time: {wall_elapsed:.1f}s")
    print(f"Successes: {len(successes)}/{len(PERSONAS)}")
    print(f"All stream URLs valid: {all(r.get('stream_url', '').startswith('https://') for r in successes)}")
    print(f"All states ready: {all(r.get('state') == 'ready' for r in successes)}")
    print(f"{'='*60}\n")

    # Save results
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "wall_clock_seconds": round(wall_elapsed, 2),
        "target_count": len(PERSONAS),
        "success_count": len(successes),
        "failure_count": len(failures),
        "all_states_ready": all(r.get("state") == 'ready' for r in successes),
        "all_streams_valid": all(r.get("stream_url", "").startswith("https://") for r in successes),
        "simulators": results,
    }

    out_path = os.path.join(os.path.dirname(__file__), "spike-1-raw-results.json")
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Raw results saved to: {out_path}")

    return results


if __name__ == "__main__":
    if not LIM_API_KEY:
        print("ERROR: LIM_API_KEY not set")
        exit(1)
    asyncio.run(main())
