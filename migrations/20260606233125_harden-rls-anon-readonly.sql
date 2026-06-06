-- Harden RLS (review finding H3): anon (the publishable browser key) becomes
-- READ-ONLY. All writes go through the server with the admin key (which bypasses
-- RLS). Read paths (report, realtime hydrate) keep working; a shared report link
-- can no longer mutate or wipe run data.

do $$
declare t text;
begin
  foreach t in array array['runs','personas','simulators','findings'] loop
    execute format('drop policy if exists demo_all on %I', t);
    execute format('drop policy if exists demo_read on %I', t);
    execute format('create policy demo_read on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

revoke insert, update, delete on runs, personas, simulators, findings from anon;

-- L3: pin search_path on the SECURITY DEFINER publish functions.
alter function swarm_publish_finding()   set search_path = public, realtime;
alter function swarm_publish_run()       set search_path = public, realtime;
alter function swarm_publish_persona()   set search_path = public, realtime;
alter function swarm_publish_simulator() set search_path = public, realtime;
