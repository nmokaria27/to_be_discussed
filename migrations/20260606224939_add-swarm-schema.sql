-- The AI Beta-Tester Swarm — C1 schema + C5 realtime on InsForge.
-- Mirrors packages/shared/src/types.ts and packages/shared/sql/schema.sql.
-- Demo posture: permissive RLS (no sensitive data) so the swarm (anon) can
-- write findings/reviews and the public report can read them.

-- ---------- tables (C1) ----------
create table if not exists runs (
  id            text primary key,
  app_id        text not null,
  status        text not null check (status in ('pending','provisioning','running','converged','failed')),
  swarm_size    int not null,
  swarm_rating  numeric,
  started_at    timestamptz not null,
  converged_at  timestamptz
);

create table if not exists personas (
  id                text primary key,
  run_id            text not null references runs(id) on delete cascade,
  key               text not null,
  display_name      text not null,
  target_edge_cases text[] not null default '{}',
  status            text not null check (status in ('provisioning','exploring','done','crashed')),
  rating            int check (rating between 1 and 5),
  review_text       text
);

create table if not exists simulators (
  id          text primary key,
  run_id      text not null references runs(id) on delete cascade,
  persona_id  text not null references personas(id) on delete cascade,
  lim_handle  text not null,
  stream_url  text,
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
  screen_key     text,
  created_at     timestamptz not null default now()
);

create index if not exists findings_run_idx     on findings(run_id);
create index if not exists findings_persona_idx on findings(persona_id);
create index if not exists personas_run_idx     on personas(run_id);
create index if not exists simulators_run_idx   on simulators(run_id);

-- ---------- access (demo: permissive) ----------
grant all on runs, personas, simulators, findings to anon, authenticated;

alter table runs       enable row level security;
alter table personas   enable row level security;
alter table simulators enable row level security;
alter table findings   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['runs','personas','simulators','findings'] loop
    execute format('drop policy if exists demo_all on %I', t);
    execute format(
      'create policy demo_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- realtime (C5) ----------
-- One pattern covers run:<id>:status and run:<id>:findings (LIKE match).
insert into realtime.channels (pattern, description, enabled)
values ('run:%', 'Per-run status + findings for the swarm dashboard', true)
on conflict do nothing;

create or replace function swarm_publish_finding() returns trigger as $$
begin
  perform realtime.publish('run:' || NEW.run_id || ':findings', 'finding', to_jsonb(NEW));
  return NEW;
end; $$ language plpgsql security definer;

create or replace function swarm_publish_run() returns trigger as $$
begin
  perform realtime.publish('run:' || NEW.id || ':status', 'run', to_jsonb(NEW));
  return NEW;
end; $$ language plpgsql security definer;

create or replace function swarm_publish_persona() returns trigger as $$
begin
  perform realtime.publish('run:' || NEW.run_id || ':status', 'persona', to_jsonb(NEW));
  return NEW;
end; $$ language plpgsql security definer;

create or replace function swarm_publish_simulator() returns trigger as $$
begin
  perform realtime.publish('run:' || NEW.run_id || ':status', 'simulator', to_jsonb(NEW));
  return NEW;
end; $$ language plpgsql security definer;

drop trigger if exists findings_realtime on findings;
create trigger findings_realtime after insert on findings
  for each row execute function swarm_publish_finding();

drop trigger if exists runs_realtime on runs;
create trigger runs_realtime after insert or update on runs
  for each row execute function swarm_publish_run();

drop trigger if exists personas_realtime on personas;
create trigger personas_realtime after insert or update on personas
  for each row execute function swarm_publish_persona();

drop trigger if exists simulators_realtime on simulators;
create trigger simulators_realtime after insert or update on simulators
  for each row execute function swarm_publish_simulator();
