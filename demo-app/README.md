# demo-app — Curated Notes/Tasks iOS App (Claude)

The polished App-Under-Test the swarm exercises on stage (PRD FR-11). SwiftUI, InsForge backend (auth + Postgres) so the swarm hits real auth/empty/large-data paths.

**Screens:** NoteList, NoteDetail, Search, Auth, Sync (names match `screen_key` in finding templates).

**Seeded edge cases** (realistic, for on-stage determinism — keep believable, SM-C2). At least one reliably reproducible defect per headline persona:
- `empty_state` → blank/crash on first launch (Empty-State Explorer)
- `long_name_rtl` → title clipped at 40 chars, no ellipsis (Long-Name/RTL)
- `offline` → infinite spinner / silent edit loss (Offline Commuter)
- `tiny_screen` → toolbar control runs off-screen (Tiny-Screen)
- `rapid_tap` → double-tap creates duplicate notes (Rage-Tapper)
- `large_data` → list stutters at 10k notes (Power User)
- `auth_expiry` → raw 401 instead of re-login (Background/Resume)
- `accessibility` → unlabeled icon buttons (Accessibility User)

See `packages/shared/src/edge-cases.ts` for the exact titles/repro the report will show.

**Build path:** lim.run iOS build. `[ASSUMPTION]` SwiftUI over React Native — confirm with team (architecture.md §13).
