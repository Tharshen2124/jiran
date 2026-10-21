-- Home dashboards can bump an open favour once a day: it goes back to the top of the feed and gains points
-- (Jiran-Dashboard points.ts, Formula.md). Residents can't: their update grant is still status and helper_id only.
alter table public.favours
  -- The points formula's inputs, so a bump can recalculate. Null for favours posted before bumps existed.
  add column point_factors jsonb,
  add column bumped_at timestamptz,
  -- Points added by bumps, shown on the feed.
  add column bump_points integer not null default 0,
  -- The feed's sort key: when the favour was posted or last bumped.
  add column feed_at timestamptz generated always as (coalesce(bumped_at, created_at)) stored;
