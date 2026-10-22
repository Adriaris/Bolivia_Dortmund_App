-- ============================================================
-- Cuentas de jugador, asistencia por partido y votación de MVP
-- Bolivia Dortmund — 2026-10-22
-- Ejecutar DESPUÉS de schema.sql y rls.sql (antes o después de seed.sql)
-- ============================================================
--
-- Roles:
--   • anon            → solo lectura (igual que antes)
--   • jugador         → usuario de Supabase Auth vinculado a un jugador en
--                       player_accounts. Puede marcar su asistencia y votar MVP.
--   • admin           → is_admin(): cuenta legacy con app_metadata.role = 'admin'
--                       o jugador vinculado con players.is_admin = true.
--                       Es el ÚNICO que escribe partidos, eventos, plantilla…
--
-- Anonimato del MVP: quién ha votado (mvp_ballots) y a quién se ha votado
-- (mvp_votes) viven en tablas separadas SIN relación entre ellas y sin
-- timestamps. Ninguna de las dos es legible desde el cliente: todo pasa por
-- funciones SECURITY DEFINER que devuelven solo recuentos.

-- ============================================================
-- PLAYERS.is_admin — admins designados por jugador
-- ============================================================
alter table players add column if not exists is_admin boolean not null default false;

-- Fran Torres (7) y Adrià León (24)
update players set is_admin = true
where id in ('b0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000024');

-- ============================================================
-- PLAYER_ACCOUNTS — vínculo usuario Auth ↔ jugador (1:1)
-- ============================================================
-- Se escribe SOLO desde /api/players/* con service role (sin policy de escritura).
-- Email interno del usuario: <player_id>@players.bvd04.fc ; contraseña = PIN de 6 cifras.
create table if not exists player_accounts (
  player_id  uuid primary key references players(id) on delete cascade,
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helpers de identidad
-- ============================================================
create or replace function public.current_player_id()
returns uuid language sql stable security definer
set search_path = '' as $$
  select pa.player_id from public.player_accounts pa where pa.user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (
        select 1
        from public.player_accounts pa
        join public.players p on p.id = pa.player_id
        where pa.user_id = auth.uid() and p.is_admin
      )
$$;

-- La cuenta admin legacy sigue siendo admin
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@bvd04.fc';

-- ============================================================
-- MATCH_ATTENDANCE — "Voy / No voy" por partido
-- ============================================================
create table if not exists match_attendance (
  match_id         uuid not null references matches(id) on delete cascade,
  player_id        uuid not null references players(id),
  status           text not null check (status in ('yes', 'no')),
  updated_by_admin boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index if not exists match_attendance_player_idx on match_attendance(player_id);

create trigger match_attendance_updated_at
  before update on match_attendance
  for each row execute function update_updated_at();

-- Los jugadores solo pueden cambiar su asistencia antes del pitido inicial
create or replace function public.match_accepts_attendance(p_match_id uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and m.status in ('pending', 'postponed')
  )
$$;

-- ============================================================
-- MVP
-- ============================================================
-- Votación abierta  ⇔ matches.status = 'finished' y mvp_closed_at is null
alter table matches add column if not exists mvp_closed_at timestamptz;

-- Los partidos ya jugados antes de esta funcionalidad no abren votación
update matches set mvp_closed_at = now()
where status in ('finished', 'walkover') and mvp_closed_at is null;

-- Quién ha votado (sin el voto)
create table if not exists mvp_ballots (
  match_id        uuid not null references matches(id) on delete cascade,
  voter_player_id uuid not null references players(id),
  primary key (match_id, voter_player_id)
);

-- Votos anónimos (sin votante, sin timestamp)
create table if not exists mvp_votes (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references matches(id) on delete cascade,
  voted_player_id uuid not null references players(id)
);

create index if not exists mvp_votes_match_idx on mvp_votes(match_id);

-- MVP(s) confirmados. Empate → MVP compartido (varias filas).
create table if not exists match_mvps (
  match_id  uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id),
  votes     integer not null,
  primary key (match_id, player_id)
);

create index if not exists match_mvps_player_idx on match_mvps(player_id);

-- Interno: cierra la votación y guarda el/los MVP. No expuesto al cliente.
create or replace function public.finalize_mvp(p_match_id uuid)
returns void language plpgsql security definer
set search_path = '' as $$
declare
  v_max integer;
begin
  update public.matches set mvp_closed_at = now()
  where id = p_match_id and mvp_closed_at is null;
  if not found then
    return;
  end if;

  select max(c) into v_max from (
    select count(*) as c from public.mvp_votes
    where match_id = p_match_id group by voted_player_id
  ) t;

  if v_max is null then
    return; -- nadie votó: se cierra sin MVP
  end if;

  insert into public.match_mvps (match_id, player_id, votes)
  select p_match_id, voted_player_id, count(*)
  from public.mvp_votes
  where match_id = p_match_id
  group by voted_player_id
  having count(*) = v_max;
end;
$$;

revoke execute on function public.finalize_mvp(uuid) from public, anon, authenticated;

-- Estado de la votación para la UI. Nunca revela quién votó a quién.
--   eligible  = asistentes ('yes') con cuenta de jugador → votantes
--   voted     = papeletas emitidas
--   pending_player_ids = votantes que faltan (SOLO para admins, null para el resto)
--   results   = recuento por candidato (SOLO cuando la votación está cerrada)
create or replace function public.get_mvp_status(p_match_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = '' as $$
declare
  v_match     public.matches%rowtype;
  v_me        uuid := public.current_player_id();
  v_admin     boolean := public.is_admin();
  v_open      boolean;
  v_closed    boolean;
  v_eligible  integer;
  v_voted     integer;
  v_attended  boolean;
  v_has_voted boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'match_not_found';
  end if;

  v_closed := v_match.mvp_closed_at is not null;
  v_open   := v_match.status = 'finished' and not v_closed;

  select count(*) into v_eligible
  from public.match_attendance a
  join public.player_accounts pa on pa.player_id = a.player_id
  where a.match_id = p_match_id and a.status = 'yes';

  select count(*) into v_voted from public.mvp_ballots where match_id = p_match_id;

  v_attended := v_me is not null and exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = v_me and status = 'yes'
  );
  v_has_voted := v_me is not null and exists (
    select 1 from public.mvp_ballots where match_id = p_match_id and voter_player_id = v_me
  );

  return jsonb_build_object(
    'match_id',      p_match_id,
    'voting_open',   v_open,
    'closed',        v_closed,
    'eligible',      v_eligible,
    'voted',         v_voted,
    'me_player_id',  v_me,
    'me_attended',   v_attended,
    'me_has_voted',  v_has_voted,
    'can_vote',      v_open and v_attended and not v_has_voted,
    'pending_player_ids', case when v_admin then (
        select coalesce(jsonb_agg(a.player_id), '[]'::jsonb)
        from public.match_attendance a
        join public.player_accounts pa on pa.player_id = a.player_id
        where a.match_id = p_match_id and a.status = 'yes'
          and not exists (
            select 1 from public.mvp_ballots b
            where b.match_id = p_match_id and b.voter_player_id = a.player_id
          )
      ) else null end,
    'results', case when v_closed then (
        select coalesce(jsonb_agg(jsonb_build_object('player_id', r.voted_player_id, 'votes', r.c)
                                  order by r.c desc), '[]'::jsonb)
        from (
          select voted_player_id, count(*) as c from public.mvp_votes
          where match_id = p_match_id group by voted_player_id
        ) r
      ) else null end
  );
end;
$$;

-- Emitir voto. Errores (texto de la excepción):
--   not_registered | voting_closed | not_attended | already_voted | invalid_candidate
create or replace function public.cast_mvp_vote(p_match_id uuid, p_voted_player_id uuid)
returns jsonb language plpgsql security definer
set search_path = '' as $$
declare
  v_me       uuid := public.current_player_id();
  v_eligible integer;
  v_voted    integer;
begin
  if v_me is null then
    raise exception 'not_registered';
  end if;

  -- Bloquea el partido para serializar votos concurrentes y el cierre
  perform 1 from public.matches
  where id = p_match_id and status = 'finished' and mvp_closed_at is null
  for update;
  if not found then
    raise exception 'voting_closed';
  end if;

  if not exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = v_me and status = 'yes'
  ) then
    raise exception 'not_attended';
  end if;

  if exists (
    select 1 from public.mvp_ballots where match_id = p_match_id and voter_player_id = v_me
  ) then
    raise exception 'already_voted';
  end if;

  if p_voted_player_id = v_me or not exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = p_voted_player_id and status = 'yes'
  ) then
    raise exception 'invalid_candidate';
  end if;

  insert into public.mvp_ballots (match_id, voter_player_id) values (p_match_id, v_me);
  insert into public.mvp_votes (match_id, voted_player_id) values (p_match_id, p_voted_player_id);

  select count(*) into v_eligible
  from public.match_attendance a
  join public.player_accounts pa on pa.player_id = a.player_id
  where a.match_id = p_match_id and a.status = 'yes';

  select count(*) into v_voted from public.mvp_ballots where match_id = p_match_id;

  if v_voted >= v_eligible then
    perform public.finalize_mvp(p_match_id);
  end if;

  return public.get_mvp_status(p_match_id);
end;
$$;

-- Cierre manual por un admin (si alguien no vota nunca)
create or replace function public.close_mvp_voting(p_match_id uuid)
returns jsonb language plpgsql security definer
set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  perform 1 from public.matches where id = p_match_id and status = 'finished' for update;
  if not found then
    raise exception 'voting_closed';
  end if;
  perform public.finalize_mvp(p_match_id);
  return public.get_mvp_status(p_match_id);
end;
$$;

revoke execute on function public.cast_mvp_vote(uuid, uuid) from public, anon;
revoke execute on function public.close_mvp_voting(uuid) from public, anon;
grant execute on function public.cast_mvp_vote(uuid, uuid) to authenticated;
grant execute on function public.close_mvp_voting(uuid) to authenticated;

-- Helpers de identidad: solo authenticated (get_mvp_status sí es público y los
-- usa internamente como SECURITY DEFINER, así que sigue funcionando para anon)
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.current_player_id() from public, anon;
revoke execute on function public.match_accepts_attendance(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_player_id() to authenticated;
grant execute on function public.match_accepts_attendance(uuid) to authenticated;

-- ============================================================
-- RLS — tablas nuevas
-- ============================================================
alter table player_accounts  enable row level security;
alter table match_attendance enable row level security;
alter table mvp_ballots      enable row level security;
alter table mvp_votes        enable row level security;
alter table match_mvps       enable row level security;

-- player_accounts: lectura pública (saber quién está registrado). Escritura: service role.
create policy "player_accounts_select_public"
  on player_accounts for select to anon, authenticated using (true);

-- match_attendance: lectura pública; admin todo; jugador solo su fila y antes del partido
create policy "attendance_select_public"
  on match_attendance for select to anon, authenticated using (true);

create policy "attendance_all_admin"
  on match_attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "attendance_self_insert"
  on match_attendance for insert to authenticated
  with check (
    player_id = public.current_player_id()
    and updated_by_admin = false
    and public.match_accepts_attendance(match_id)
  );

create policy "attendance_self_update"
  on match_attendance for update to authenticated
  using (player_id = public.current_player_id() and public.match_accepts_attendance(match_id))
  with check (
    player_id = public.current_player_id()
    and updated_by_admin = false
    and public.match_accepts_attendance(match_id)
  );

-- mvp_ballots / mvp_votes: SIN policies → ilegibles e inescribibles desde el cliente.
-- Solo las funciones SECURITY DEFINER las tocan.

-- match_mvps: lectura pública. Escritura solo vía finalize_mvp.
create policy "match_mvps_select_public"
  on match_mvps for select to anon, authenticated using (true);

-- ============================================================
-- RLS — endurecer tablas existentes: escribir = admin (antes: cualquier authenticated)
-- ============================================================
drop policy if exists "players_all_admin" on players;
create policy "players_all_admin" on players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tournaments_all_admin" on tournaments;
create policy "tournaments_all_admin" on tournaments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tournament_players_all_admin" on tournament_players;
create policy "tournament_players_all_admin" on tournament_players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matches_all_admin" on matches;
create policy "matches_all_admin" on matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events_all_admin" on match_events;
create policy "events_all_admin" on match_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
