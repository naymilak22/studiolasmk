-- Opening time moves from 07:00 to 08:00. Days the salon already changed are left alone.
update public.working_hours
set opens_at = time '08:00'
where opens_at = time '07:00'
  and is_closed = false;
