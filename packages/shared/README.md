# @swarm/shared

The contract layer every workstream imports. Owned by Claude; **changes here ripple to all three devs — coordinate before editing `types.ts` or `sql/schema.sql`.**

## What's here
| File | Contract | Purpose |
|------|----------|---------|
| `src/types.ts` | C1 | Data model (Run, Persona, Simulator, Finding), enums, realtime channels (C5), `POST /runs` (C2) |
| `src/personas.ts` | C8 | 12-persona catalog with target edge cases + review voices |
| `src/edge-cases.ts` | — | Realistic finding templates per edge-case class |
| `src/writer.ts` | — | `SwarmWriter` seam + `MemoryWriter`; real `InsForgeWriter` plugs in here |
| `src/fake-swarm.ts` | C9 | `generateSnapshot()` (converged run) + `generateTimeline()` (live beats) |
| `sql/schema.sql` | C1 | Postgres DDL mirroring `types.ts` — Dev B's first migration |
| `fixtures/*.json` | — | Deterministic seeded data (regenerate with `npm run seed`) |

## Use it
```ts
import { generateSnapshot, generateTimeline, channels } from '@swarm/shared';

// Report Site (C6): render a converged run
const snapshot = generateSnapshot({ seed: 42, swarmSize: 12 });

// Dashboard (C5): replay live beats to drive the Live Grid without a real swarm
const timeline = generateTimeline({ seed: 42, swarmSize: 12 });
// each beat: { at_ms, event } — schedule by at_ms, dispatch event to the grid/feed
```

## Going live (fake -> real)
The real Persona Agents write Findings/Reviews through the same `SwarmWriter` interface. When InsForge creds exist, implement `InsForgeWriter implements SwarmWriter` and the Dashboard/Report consumers need no change — they already read the C1 shapes.

```bash
npm test                 # contract tests
npm run seed             # regenerate fixtures (deterministic; seed=42, size=12)
npm run seed -- --size 8 --seed 7
```
