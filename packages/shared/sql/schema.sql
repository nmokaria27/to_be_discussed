-- Contract C1 — canonical schema for The AI Beta-Tester Swarm (InsForge / Postgres).
-- Mirrors packages/shared/src/types.ts exactly. Dev B applies this as the first
-- migration; the Fake Swarm and the real Persona Agents both write these shapes.
--
-- Enums are CHECK constraints (keep in sync with the TS string unions).

create table if not exists runs (
  id            text primary key,
  app_id        text not null,
  status        text not null check (status in ('pending','provisioning','running','converged','failed')),
  swarm_size    int  not null,
  swarm_rating  numeric,                      -- mean of persona ratings; null until converged (FR-13)
  started_at    timestamptz not null,
  converged_at  timestamptz
);

create table if not exists personas (
  id                text primary key,
  run_id            text not null references runs(id) on delete cascade,
  key               text not null,            -- catalog key (C8)
  display_name      text not null,
  target_edge_cases text[] not null,
  status            text not null check (status in ('provisioning','exploring','done','crashed')),
  rating            int check (rating between 1 and 5),  -- FR-12
  review_text       text
);

create table if not exists simulators (
  id          text primary key,
  run_id      text not null references runs(id) on delete cascade,
  persona_id  text not null references personas(id) on delete cascade,
  lim_handle  text not null,
  stream_url  text,                           -- live-view surface; null while booting
  status      text not null check (status in ('booting','live','down'))
);

create table if not exists findings (
  id             text primary key,
  run_id         text not null references runs(id) on delete cascade,
  persona_id     text not null references personas(id) on delete cascade,
  simulator_id   text not null references simulators(id) on delete cascade,
  edge_case      text not null check (edge_case in (
                   'empty_state','overflow','long_name_rtl','offline','slow_network',
                   'rapid_tap','tiny_screen','accessibility','large_data','auth_expiry')),
  severity       text not null check (severity in ('critical','high','medium','low')),
  title          text not null,
  repro_steps    text not null,
  screenshot_url text not null,
  screen_key     text,                        -- dedup grouping (persona,edge_case,screen)
  created_at     timestamptz not null default now()
);

create index if not exists findings_run_idx     on findings(run_id);
create index if not exists findings_persona_idx on findings(persona_id);
create index if not exists personas_run_idx     on personas(run_id);
create index if not exists simulators_run_idx   on simulators(run_id);

-- Realtime (C5): Dashboard subscribes to changes on these tables filtered by run_id,
-- mapped to logical channels run:{run_id}:status (runs/personas/simulators) and
-- run:{run_id}:findings (findings). Storage bucket: findings/{run_id}/{finding_id}.png
