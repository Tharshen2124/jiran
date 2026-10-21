-- "West" and "East" were confusing in the RA's report, so letter each jalan's sections instead: A is the half west of
-- the spine road, B the half east of it.
update public.checkpoints set section = case section when 'West' then 'A' when 'East' then 'B' else section end;
