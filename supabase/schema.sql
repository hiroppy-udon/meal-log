-- meal-log schema
--
-- Run this in the Supabase SQL editor. Kept in the repository because the
-- shape of the database is a design decision like any other (see docs/判断の記録.md)
-- and clicking tables together in the dashboard leaves no record of it.
--
-- Tables: see docs/仕様.md 13.5 (records / meals / menus) and 13.8 (devices).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Every record shares a date and a kind. Everything else differs per kind,
-- so the per-kind columns live in their own tables below.
create table records (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  date        date not null,
  -- Null for shopping: it has no position in the day (仕様 6.1).
  time        time,
  kind        text not null check (kind in ('wake', 'sleep', 'meal', 'shopping')),
  -- Eating out and shopping carry a cost. Kept here rather than in meals so the
  -- spending total is one sum over one column (判断の記録 #32).
  amount      integer check (amount >= 0),
  note        text,
  -- When the row was entered, as opposed to the day it describes. Dates can be
  -- backfilled years later (仕様 6.2), so the two are not the same thing.
  created_at  timestamptz not null default now()
);

-- What only meals have.
create table meals (
  record_id   bigint primary key references records (id) on delete cascade,
  slot        text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  -- 'none' is a recorded value, not an absence: it is what separates "did not
  -- eat" from "forgot to log" (仕様 6.2), and the day counter depends on it.
  source      text not null check (source in ('cooked', 'eaten_out', 'none'))
);

-- One meal can have any number of menu items, so they cannot be columns
-- (仕様 13.2). Cleaning locations and tasks will take the same shape later,
-- each in its own table (判断の記録 #33).
create table menus (
  id          bigint generated always as identity primary key,
  record_id   bigint not null references records (id) on delete cascade,
  name        text not null
);

-- Web push destinations. Unrelated to the records above — a device, not a day.
create table devices (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  -- Re-granting permission can return the same endpoint; unique keeps that from
  -- becoming a second row and a duplicate notification (判断の記録 #54).
  endpoint      text not null unique,
  registered_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Both the Today screen and the Records screen read by user and date.
create index records_user_date_idx on records (user_id, date);
create index menus_record_idx on menus (record_id);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Without this, the anon key shipped in the browser can read, edit and delete
-- every row (判断の記録 #57). Not on by default for tables created with SQL,
-- and forgetting it leaves the app working normally — so it is checked
-- explicitly in the stage 2 completion criteria.
-- ---------------------------------------------------------------------------

alter table records enable row level security;
alter table meals   enable row level security;
alter table menus   enable row level security;
alter table devices enable row level security;

create policy "own rows" on records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own rows" on devices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- meals and menus carry no user_id of their own: following record_id answers
-- who owns them, and storing it twice would let the two copies disagree.
create policy "own rows" on meals for all
  using (exists (select 1 from records r
                 where r.id = meals.record_id and r.user_id = auth.uid()))
  with check (exists (select 1 from records r
                      where r.id = meals.record_id and r.user_id = auth.uid()));

create policy "own rows" on menus for all
  using (exists (select 1 from records r
                 where r.id = menus.record_id and r.user_id = auth.uid()))
  with check (exists (select 1 from records r
                      where r.id = menus.record_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Deliberately not here (判断の記録 #58)
--
-- Nothing stops two 'breakfast' rows on the same date. The date lives in
-- records and the slot in meals, so the constraint would span both tables and
-- need machinery beyond a column definition.
--
-- Deferred because it can be added later without touching these tables, and
-- because adding it now would put something in the schema that cannot yet be
-- explained — which is the failure this project exists to avoid.
-- ---------------------------------------------------------------------------
