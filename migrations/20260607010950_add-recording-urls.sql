-- Per-simulator session recording (lim.run video) + agent log, stored in the
-- InsForge `recordings` bucket; URLs surfaced on the report.
alter table simulators add column if not exists video_url text;
alter table simulators add column if not exists log_url text;
