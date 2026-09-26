-- Studio Las MK: profiles, services, appointments, hours, and closures.
-- Run once in the Supabase SQL Editor.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- The signup trigger promotes these emails. Clients cannot read this table.
-- ---------------------------------------------------------------------------

create table public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_allowlist (email)
values ('naystudent1@gmail.com');

alter table public.admin_allowlist enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'client' check (role in ('client', 'admin')),
  last_booking jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.last_booking is
  'Last booked party: {party_count, phone, people:[{gender, service_id, service_name, custom_description, duration_minutes}]}';

create index profiles_email_idx on public.profiles (email);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Vloge ni mogoče spremeniti.';
  end if;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'client';
begin
  if exists (
    select 1
    from public.admin_allowlist
    where lower(email) = lower(new.email)
  ) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    assigned_role
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function public.sync_profile_email();

-- ---------------------------------------------------------------------------
-- Services
-- audience codes stay in English: male, female, child, any.
-- ---------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price_estimate numeric(8, 2),
  category text not null,
  audience text not null default 'any' check (audience in ('male', 'female', 'child', 'any')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.services (name, duration_minutes, category, audience, sort_order)
values
  ('Moško striženje', 30, 'Striženje', 'male', 10),
  ('Žensko striženje', 45, 'Striženje', 'female', 20),
  ('Otroško striženje', 30, 'Striženje', 'child', 30),
  ('Striženje in fen', 60, 'Striženje', 'female', 40),
  ('Barvanje korenin', 90, 'Barvanje', 'any', 50),
  ('Barvanje las', 120, 'Barvanje', 'female', 60),
  ('Prameni', 150, 'Barvanje', 'female', 70),
  ('Fen frizura', 30, 'Urejanje', 'any', 80),
  ('Britje brade', 20, 'Urejanje', 'male', 90);

-- ---------------------------------------------------------------------------
-- Salon settings, working hours, closures
-- weekday: 0 Sunday … 6 Saturday, matching PostgreSQL extract(dow).
-- ---------------------------------------------------------------------------

create table public.salon_settings (
  id integer primary key default 1 check (id = 1),
  timezone text not null default 'Europe/Ljubljana',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0),
  cancellation_notice_hours integer not null default 24 check (cancellation_notice_hours >= 0),
  updated_at timestamptz not null default now()
);

insert into public.salon_settings (id) values (1);

create trigger salon_settings_set_updated_at
before update on public.salon_settings
for each row execute function public.set_updated_at();

create table public.working_hours (
  weekday integer primary key check (weekday between 0 and 6),
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  constraint working_hours_open_window check (
    is_closed
    or (opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

insert into public.working_hours (weekday, is_closed, opens_at, closes_at)
values
  (0, true, null, null),
  (1, true, null, null),
  (2, false, '08:00', '19:00'),
  (3, false, '08:00', '19:00'),
  (4, false, '08:00', '19:00'),
  (5, false, '08:00', '19:00'),
  (6, false, '08:00', '19:00');

create table public.blackout_days (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  constraint blackout_days_range check (end_date >= start_date)
);

create index blackout_days_range_idx on public.blackout_days (start_date, end_date);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  customer_name text,
  customer_email text,
  phone text,
  party_count integer not null check (party_count > 0),
  details_json jsonb not null,
  total_duration integer not null check (total_duration > 0),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled')),
  source text not null default 'online' check (source in ('online', 'manual')),
  allow_overlap boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (end_time > start_time)
);

comment on column public.appointments.details_json is
  'Array of {gender, service_id, service_name, custom_description, duration_minutes}.';
comment on column public.appointments.total_duration is
  'Total chair time in minutes.';
comment on column public.appointments.allow_overlap is
  'Admin-only. When true, the row may sit on top of another appointment and does not block customers.';

create index appointments_user_id_idx on public.appointments (user_id);
create index appointments_start_time_idx on public.appointments (start_time);

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status in ('pending', 'approved') and allow_overlap = false);

create or replace function public.prepare_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.details_json is null
     or jsonb_typeof(new.details_json) <> 'array'
     or jsonb_array_length(new.details_json) <> new.party_count then
    raise exception 'Število oseb se ne ujema s seznamom storitev.';
  end if;

  if new.source = 'online' and coalesce(trim(new.phone), '') = '' then
    raise exception 'Vpišite telefonsko številko.';
  end if;

  new.end_time := new.start_time + make_interval(mins => new.total_duration);

  if new.end_time <= new.start_time then
    raise exception 'Trajanje mora biti daljše od nič.';
  end if;

  return new;
end;
$$;

create trigger appointments_prepare
before insert or update on public.appointments
for each row execute function public.prepare_appointment();

create or replace function public.protect_appointment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_hours integer;
begin
  if public.is_admin() then
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then
    raise exception 'Tega termina ne morete spremeniti.';
  end if;

  select cancellation_notice_hours into notice_hours
  from public.salon_settings
  where id = 1;

  if old.start_time < now() + make_interval(hours => coalesce(notice_hours, 24)) then
    raise exception 'Termin lahko spremenite ali prekličete najmanj 24 ur prej. Pokličite salon.';
  end if;

  if new.status not in ('pending', 'cancelled') then
    raise exception 'Termina ne morete potrditi sami.';
  end if;

  if new.allow_overlap or new.source = 'manual' or new.user_id is distinct from old.user_id then
    raise exception 'Tega podatka ne morete spremeniti.';
  end if;

  return new;
end;
$$;

create trigger appointments_protect_changes
before update on public.appointments
for each row execute function public.protect_appointment_changes();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Available start times for a date and a total duration.
-- Returns nothing for past dates, closed weekdays, and vacation days.
-- ---------------------------------------------------------------------------

create or replace function public.available_start_times(
  p_date date,
  p_duration_minutes integer
)
returns table (start_time timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_step integer;
  v_opens time;
  v_closes time;
  v_closed boolean;
  v_dow integer;
  v_cursor timestamptz;
  v_slot_end timestamptz;
  v_day_end timestamptz;
begin
  if p_duration_minutes is null or p_duration_minutes <= 0 then
    raise exception 'Trajanje mora biti daljše od nič.';
  end if;

  select s.timezone, s.slot_interval_minutes
  into v_tz, v_step
  from public.salon_settings s
  where s.id = 1;

  if p_date < (timezone(v_tz, now()))::date then
    return;
  end if;

  if exists (
    select 1
    from public.blackout_days b
    where p_date between b.start_date and b.end_date
  ) then
    return;
  end if;

  v_dow := extract(dow from p_date)::integer;

  select wh.is_closed, wh.opens_at, wh.closes_at
  into v_closed, v_opens, v_closes
  from public.working_hours wh
  where wh.weekday = v_dow;

  if coalesce(v_closed, true) or v_opens is null or v_closes is null then
    return;
  end if;

  v_cursor := (p_date + v_opens) at time zone v_tz;
  v_day_end := (p_date + v_closes) at time zone v_tz;

  while v_cursor + make_interval(mins => p_duration_minutes) <= v_day_end loop
    v_slot_end := v_cursor + make_interval(mins => p_duration_minutes);

    if v_cursor > now() and not exists (
      select 1
      from public.appointments a
      where a.status in ('pending', 'approved')
        and a.allow_overlap = false
        and tstzrange(a.start_time, a.end_time, '[)') && tstzrange(v_cursor, v_slot_end, '[)')
    ) then
      start_time := v_cursor;
      return next;
    end if;

    v_cursor := v_cursor + make_interval(mins => v_step);
  end loop;
end;
$$;

revoke all on function public.available_start_times(date, integer) from public;
grant execute on function public.available_start_times(date, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.salon_settings enable row level security;
alter table public.working_hours enable row level security;
alter table public.blackout_days enable row level security;
alter table public.appointments enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy services_select on public.services
for select to anon, authenticated
using (is_active or public.is_admin());

create policy services_admin_write on public.services
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy salon_settings_select on public.salon_settings
for select to anon, authenticated
using (true);

create policy salon_settings_admin_update on public.salon_settings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy working_hours_select on public.working_hours
for select to anon, authenticated
using (true);

create policy working_hours_admin_write on public.working_hours
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blackout_days_select on public.blackout_days
for select to anon, authenticated
using (true);

create policy blackout_days_admin_write on public.blackout_days
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy appointments_select on public.appointments
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy appointments_insert_own on public.appointments
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and source = 'online'
  and allow_overlap = false
);

create policy appointments_admin_insert on public.appointments
for insert to authenticated
with check (public.is_admin());

create policy appointments_update on public.appointments
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy appointments_admin_delete on public.appointments
for delete to authenticated
using (public.is_admin());

grant select on public.services to anon, authenticated;
grant select on public.salon_settings to anon, authenticated;
grant select on public.working_hours to anon, authenticated;
grant select on public.blackout_days to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant insert, update, delete on public.services to authenticated;
grant update on public.salon_settings to authenticated;
grant insert, update, delete on public.working_hours to authenticated;
grant insert, update, delete on public.blackout_days to authenticated;
