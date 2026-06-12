-- UNAMUNO PWA MVP - Supabase schema inicial

create type app_role as enum ('coach','coordinator');
create type event_type as enum ('training','match');
create type attendance_status as enum ('present','absent','injured');
create type change_status as enum ('sin_leer','leida','aceptada','denegada');

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique
);

create table public.venues (
    id uuid primary key default gen_random_uuid(),
    name text not null unique
);

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category_id uuid references categories(id),
    color text not null default '#f97316'
);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role app_role not null default 'coach',
    team_id uuid references teams(id),
    display_name text,
    created_at timestamptz default now()
);

create table public.players (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references teams(id) on delete cascade,
    name text not null,
    category_id uuid references categories(id),
    created_at timestamptz default now()
);

create table public.player_notes (
    id uuid primary key default gen_random_uuid(),
    player_id uuid references players(id) on delete cascade,
    body text not null,
    show_date boolean default true,
    created_at timestamptz default now()
);

create table public.events (
    id uuid primary key default gen_random_uuid(),
    team_id uuid references teams(id) on delete cascade,
    type event_type not null,
    date date not null,
    start_time time not null,
    end_time time,
    venue_id uuid references venues(id),
    opponent text,
    home boolean,
    created_by uuid references profiles(id),
    created_at timestamptz default now()
);

create table public.attendance (
    player_id uuid references players(id) on delete cascade,
    event_id uuid references events(id) on delete cascade,
    status attendance_status not null,
    updated_at timestamptz default now(),
    primary key(player_id,event_id)
);

create table public.resources (
    id uuid primary key default gen_random_uuid(),
    kind text not null,
    title text not null,
    description text,
    tags text[] default '{}',
    url text,
    storage_path text,
    author_profile_id uuid references profiles(id),
    created_at timestamptz default now()
);

create table public.news_posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text,
    media_url text,
    storage_path text,
    author_profile_id uuid references profiles(id),
    created_at timestamptz default now()
);

create table public.change_requests (
    id uuid primary key default gen_random_uuid(),
    type event_type not null,
    team_id uuid references teams(id),
    previous_info text not null,
    requested_info text not null,
    reason text,
    status change_status default 'sin_leer',
    author_profile_id uuid references profiles(id),
    created_at timestamptz default now()
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null,
    target_role app_role,
    target_team_id uuid references teams(id),
    read_by uuid[] default '{}',
    created_at timestamptz default now()
);

-- ACTIVAR RLS

alter table categories enable row level security;
alter table venues enable row level security;
alter table teams enable row level security;
alter table profiles enable row level security;
alter table players enable row level security;
alter table player_notes enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table resources enable row level security;
alter table news_posts enable row level security;
alter table change_requests enable row level security;
alter table notifications enable row level security;

-- FUNCIONES AUXILIARES

create or replace function public.current_role()
returns app_role
language sql
security definer
as $$
    select role
    from profiles
    where id = auth.uid()
$$;

create or replace function public.current_team()
returns uuid
language sql
security definer
as $$
    select team_id
    from profiles
    where id = auth.uid()
$$;

-- POLÍTICAS

create policy "common read"
on categories
for select
using (auth.role()='authenticated');

create policy "venues read"
on venues
for select
using (auth.role()='authenticated');

create policy "teams read"
on teams
for select
using (auth.role()='authenticated');

create policy "own profile read"
on profiles
for select
using (
    id = auth.uid()
    or public.current_role() = 'coordinator'
);

create policy "players own or coordinator read"
on players
for select
using (
    team_id = public.current_team()
    or public.current_role() = 'coordinator'
);

create policy "players own insert"
on players
for insert
with check (
    team_id = public.current_team()
);

create policy "players own update"
on players
for update
using (
    team_id = public.current_team()
);

create policy "players own delete"
on players
for delete
using (
    team_id = public.current_team()
);

create policy "events read"
on events
for select
using (
    auth.role()='authenticated'
);

create policy "events own insert"
on events
for insert
with check (
    team_id = public.current_team()
    or public.current_role()='coordinator'
);

create policy "attendance own or coordinator read"
on attendance
for select
using (
    exists (
        select 1
        from players p
        where p.id = player_id
        and (
            p.team_id = public.current_team()
            or public.current_role()='coordinator'
        )
    )
);

create policy "attendance own write"
on attendance
for all
using (
    exists (
        select 1
        from players p
        where p.id = player_id
        and p.team_id = public.current_team()
    )
);

create policy "resources read"
on resources
for select
using (
    auth.role()='authenticated'
);

create policy "resources insert"
on resources
for insert
with check (
    auth.uid() = author_profile_id
);

create policy "resources delete owner or coordinator"
on resources
for delete
using (
    author_profile_id = auth.uid()
    or public.current_role()='coordinator'
);

create policy "news read"
on news_posts
for select
using (
    auth.role()='authenticated'
);

create policy "news insert"
on news_posts
for insert
with check (
    auth.uid() = author_profile_id
);

create policy "news delete owner or coordinator"
on news_posts
for delete
using (
    author_profile_id = auth.uid()
    or public.current_role()='coordinator'
);

create policy "changes read"
on change_requests
for select
using (
    team_id = public.current_team()
    or public.current_role()='coordinator'
);

create policy "changes insert"
on change_requests
for insert
with check (
    team_id = public.current_team()
);

create policy "changes coordinator update"
on change_requests
for update
using (
    public.current_role()='coordinator'
);

create policy "notifications read"
on notifications
for select
using (
    auth.role()='authenticated'
    and (
        target_team_id is null
        or target_team_id = public.current_team()
    )
    and (
        target_role is null
        or target_role = public.current_role()
    )
);

-- DATOS INICIALES

insert into categories(name)
values
('Senior'),
('Junior'),
('Kadete'),
('Haur'),
('Mini')
on conflict do nothing;

insert into venues(name)
values
('La Casilla'),
('Sarriko'),
('Jesuitak'),
('Escolapios'),
('Partidos fuera de casa')
on conflict do nothing;