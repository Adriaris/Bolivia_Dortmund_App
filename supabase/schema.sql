-- Esquema completo — estado actual de la BD
-- Ejecutar en el SQL editor de Supabase (BD vacía)
-- Bolivia Dortmund — creado 2026-10-20 a partir del esquema del Chevere FC

-- ============================================================
-- PLAYERS
-- ============================================================
-- active = pertenece a la plantilla del split en curso.
-- Los jugadores que se van NUNCA se borran (histórico en tournament_players).
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null,
  name        text not null,
  alias       text,
  position    text not null check (position in ('POR', 'DEF', 'MED', 'DEL', 'CAR')),
  is_captain  boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TOURNAMENTS (un torneo = un split de una temporada)
-- ============================================================
-- is_current: el split activo — las páginas y los syncs operan sobre él.
-- standings_url / fixtures_url: URLs de scraping de fundaciovalldor7.com
-- propias de cada split (BaseLeagueId/RoundId/GroupId cambian cada temporada).
create table if not exists tournaments (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text not null,
  season        text not null,
  display_order integer not null default 0,
  is_current    boolean not null default false,
  standings_url text,
  fixtures_url  text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TOURNAMENT_PLAYERS (roster histórico por split)
-- ============================================================
-- Snapshot del dorsal/posición/capitán de cada jugador en cada split.
-- Permite archivar temporadas con los datos de época aunque luego cambien.
create table if not exists tournament_players (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id     uuid not null references players(id) on delete cascade,
  number        integer not null,
  position      text not null check (position in ('POR', 'DEF', 'MED', 'DEL', 'CAR')),
  is_captain    boolean not null default false,
  primary key (tournament_id, player_id)
);

-- ============================================================
-- MATCHES
-- ============================================================
create table if not exists matches (
  id                          uuid primary key default gen_random_uuid(),
  opponent_name               text not null,
  match_date                  date,                          -- nullable: partidos aplazados sin fecha
  match_time                  text,                          -- formato "HH:MM", nullable
  match_venue                 text,                          -- instalación, nullable
  status                      text not null default 'pending'
                              -- 'walkover' = ganado por incomparecencia (rival no presentado)
                              check (status in ('pending', 'postponed', 'first_half', 'half_time', 'second_half', 'finished', 'walkover')),
  our_score                   integer not null default 0,
  opponent_score              integer not null default 0,
  current_period              text not null default 'first_half'
                              check (current_period in ('first_half', 'second_half')),
  is_clock_running            boolean not null default false,
  period_started_at           timestamptz,
  first_half_elapsed_seconds  integer not null default 0,
  second_half_elapsed_seconds integer not null default 0,
  tournament_id               uuid references tournaments(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at
  before update on matches
  for each row execute function update_updated_at();

-- ============================================================
-- MATCH EVENTS
-- ============================================================
create table if not exists match_events (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references matches(id) on delete cascade,
  team_side        text not null check (team_side in ('ours', 'opponent')),
  event_type       text not null default 'goal' check (event_type in ('goal', 'save')),
  minute           integer not null,
  period           text not null check (period in ('first_half', 'second_half')),
  goal_type        text check (goal_type is null or goal_type in ('normal', 'free_kick', 'penalty')),
  scorer_player_id uuid references players(id),
  assist_player_id uuid references players(id),
  created_at       timestamptz not null default now()
);

-- Índices
create index if not exists match_events_match_id_idx on match_events(match_id);
create index if not exists match_events_scorer_idx   on match_events(scorer_player_id) where scorer_player_id is not null;
create index if not exists match_events_assist_idx   on match_events(assist_player_id) where assist_player_id is not null;
create index if not exists match_events_save_idx     on match_events(scorer_player_id) where event_type = 'save' and scorer_player_id is not null;

-- ============================================================
-- STANDINGS (clasificación scrapeada de la liga, por torneo)
-- ============================================================
-- El sync borra y reinserta SOLO las filas del torneo activo:
-- las clasificaciones de splits pasados quedan archivadas.
create table if not exists standings (
  id            serial primary key,
  pos           integer not null,
  team          text not null,
  pts           integer not null default 0,
  played        integer not null default 0,
  wins          integer not null default 0,
  draws         integer not null default 0,
  losses        integer not null default 0,
  gf            integer not null default 0,
  gc            integer not null default 0,
  gd            integer not null default 0,
  logo_url      text,
  tournament_id uuid not null references tournaments(id),
  updated_at    timestamptz not null default now(),
  constraint standings_tournament_pos_key unique (tournament_id, pos)
);

-- ============================================================
-- LEAGUE_RESULTS (resultados de toda la liga scrapeados, por torneo)
-- ============================================================
create table if not exists league_results (
  id            uuid primary key default gen_random_uuid(),
  home_team     text not null,
  away_team     text not null,
  home_score    integer,
  away_score    integer,
  match_date    date,
  match_time    text,
  venue         text,
  tournament_id uuid not null references tournaments(id),
  updated_at    timestamptz not null default now(),
  constraint league_results_tournament_match_key unique (tournament_id, home_team, away_team, match_date)
);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_events;
