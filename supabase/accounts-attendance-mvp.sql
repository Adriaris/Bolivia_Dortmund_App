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

-- Fran Torres (7), Carlos Barriga (11, añadido el 23-oct) y Adrià León (24)
update players set is_admin = true
where id in ('b0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000011',
             'b0000000-0000-4000-8000-000000000024');

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

-- ============================================================
-- v2 (2026-10-23): el voto se puede CAMBIAR y la votación NO se cierra sola
-- ============================================================
-- Para poder cambiar un voto sin guardar quién lo emitió, cada voto lleva
-- voter_key = HMAC-SHA256(match_id:player_id, secreto en Supabase Vault).
-- La tabla solo contiene huellas: identificar a un votante exige leer el
-- secreto del Vault y recalcular las huellas a propósito.
-- La votación solo la cierra un admin (close_mvp_voting). Cuentan los votos
-- de los asistentes con cuenta EN ESE MOMENTO y solo hacia asistentes.

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'mvp_voter_key',
  'Clave HMAC para identificar de forma anónima el voto MVP de cada jugador')
where not exists (select 1 from vault.secrets where name = 'mvp_voter_key');

alter table mvp_votes add column if not exists voter_key text;
delete from mvp_votes where voter_key is null; -- no había votos al migrar
alter table mvp_votes alter column voter_key set not null;
alter table mvp_votes drop constraint if exists mvp_votes_match_voter_key;
alter table mvp_votes add constraint mvp_votes_match_voter_key unique (match_id, voter_key);

create or replace function public.mvp_voter_key(p_match_id uuid, p_player_id uuid)
returns text language sql stable security definer
set search_path = '' as $$
  select encode(extensions.hmac(
    p_match_id::text || ':' || p_player_id::text,
    (select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = 'mvp_voter_key'),
    'sha256'), 'hex')
$$;

-- Votantes válidos = asistentes 'yes' con cuenta; candidatos = asistentes 'yes'
create or replace function public.mvp_valid_tally(p_match_id uuid)
returns table (player_id uuid, votes integer) language sql stable security definer
set search_path = '' as $$
  with eligible_keys as (
    select public.mvp_voter_key(p_match_id, a.player_id) as k
    from public.match_attendance a
    join public.player_accounts pa on pa.player_id = a.player_id
    where a.match_id = p_match_id and a.status = 'yes'
  )
  select v.voted_player_id, count(*)::integer
  from public.mvp_votes v
  where v.match_id = p_match_id
    and v.voter_key in (select k from eligible_keys)
    and exists (
      select 1 from public.match_attendance c
      where c.match_id = p_match_id and c.player_id = v.voted_player_id and c.status = 'yes'
    )
  group by v.voted_player_id
$$;

revoke execute on function public.mvp_voter_key(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mvp_valid_tally(uuid) from public, anon, authenticated;

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
  select max(t.votes) into v_max from public.mvp_valid_tally(p_match_id) t;
  if v_max is null then
    return; -- nadie votó: se cierra sin MVP
  end if;
  insert into public.match_mvps (match_id, player_id, votes)
  select p_match_id, t.player_id, t.votes
  from public.mvp_valid_tally(p_match_id) t
  where t.votes = v_max;
end;
$$;
revoke execute on function public.finalize_mvp(uuid) from public, anon, authenticated;

-- Estado: añade me_voted_player_id (solo el propio votante ve su voto) y all_voted
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
  v_my_vote   uuid;
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

  select count(*) into v_voted
  from public.mvp_ballots b
  join public.match_attendance a on a.match_id = b.match_id and a.player_id = b.voter_player_id and a.status = 'yes'
  join public.player_accounts pa on pa.player_id = b.voter_player_id
  where b.match_id = p_match_id;

  v_attended := v_me is not null and exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = v_me and status = 'yes'
  );
  v_has_voted := v_me is not null and exists (
    select 1 from public.mvp_ballots where match_id = p_match_id and voter_player_id = v_me
  );
  if v_has_voted then
    select v.voted_player_id into v_my_vote from public.mvp_votes v
    where v.match_id = p_match_id and v.voter_key = public.mvp_voter_key(p_match_id, v_me);
  end if;

  return jsonb_build_object(
    'match_id',           p_match_id,
    'voting_open',        v_open,
    'closed',             v_closed,
    'eligible',           v_eligible,
    'voted',              v_voted,
    'all_voted',          v_eligible > 0 and v_voted >= v_eligible,
    'me_player_id',       v_me,
    'me_attended',        v_attended,
    'me_has_voted',       v_has_voted,
    'me_voted_player_id', v_my_vote,
    'can_vote',           v_open and v_attended,
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
        select coalesce(jsonb_agg(jsonb_build_object('player_id', t.player_id, 'votes', t.votes)
                                  order by t.votes desc), '[]'::jsonb)
        from public.mvp_valid_tally(p_match_id) t
      ) else null end
  );
end;
$$;

-- Votar o CAMBIAR el voto mientras esté abierta. Ya no cierra la votación.
create or replace function public.cast_mvp_vote(p_match_id uuid, p_voted_player_id uuid)
returns jsonb language plpgsql security definer
set search_path = '' as $$
declare
  v_me  uuid := public.current_player_id();
  v_key text;
begin
  if v_me is null then
    raise exception 'not_registered';
  end if;
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
  if p_voted_player_id = v_me or not exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = p_voted_player_id and status = 'yes'
  ) then
    raise exception 'invalid_candidate';
  end if;

  v_key := public.mvp_voter_key(p_match_id, v_me);
  insert into public.mvp_ballots (match_id, voter_player_id) values (p_match_id, v_me)
  on conflict do nothing;
  insert into public.mvp_votes (match_id, voted_player_id, voter_key)
  values (p_match_id, p_voted_player_id, v_key)
  on conflict (match_id, voter_key) do update set voted_player_id = excluded.voted_player_id;

  return public.get_mvp_status(p_match_id);
end;
$$;

revoke execute on function public.cast_mvp_vote(uuid, uuid) from public, anon;
grant execute on function public.cast_mvp_vote(uuid, uuid) to authenticated;

-- ============================================================
-- v3 (2026-10-23): la convocatoria se cierra a la hora de inicio programada
-- ============================================================
-- Además de al arrancar el crono (status deja de ser 'pending'), los jugadores
-- ya no pueden cambiar su asistencia a partir de match_date + match_time (hora
-- de Madrid). Sin fecha u hora no hay cierre por hora. Aplazado = abierta.
-- Misma regla en el cliente: lib/kickoff.ts → attendanceOpen().
create or replace function public.match_kickoff_at(p_date date, p_time text)
returns timestamptz language sql stable
set search_path = '' as $$
  select case
    when p_date is not null and p_time ~ '^\s*\d{1,2}:\d{2}\s*$'
      then (p_date + trim(p_time)::time) at time zone 'Europe/Madrid'
  end
$$;

create or replace function public.match_accepts_attendance(p_match_id uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and (
        m.status = 'postponed'
        or (m.status = 'pending'
            and coalesce(now() < public.match_kickoff_at(m.match_date, m.match_time), true))
      )
  )
$$;
revoke execute on function public.match_accepts_attendance(uuid) from public, anon;
grant execute on function public.match_accepts_attendance(uuid) to authenticated;

-- ============================================================
-- v4 (2026-10-23): jugadores invitados
-- ============================================================
-- players.is_guest: externos que vienen a algún partido. Son jugadores a todos
-- los efectos (goles, asistencias, paradas, estadísticas, MVP) y se registran
-- con PIN como el resto, pero NO pueden marcar su propia asistencia: solo un
-- admin los apunta a un partido. Como la votación exige ser asistente, un
-- invitado solo vota en los partidos en los que un admin lo ha marcado.
alter table players add column if not exists is_guest boolean not null default false;

create or replace function public.current_player_is_guest()
returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce((
    select p.is_guest
    from public.player_accounts pa
    join public.players p on p.id = pa.player_id
    where pa.user_id = auth.uid()
  ), false)
$$;
revoke execute on function public.current_player_is_guest() from public, anon;
grant execute on function public.current_player_is_guest() to authenticated;

drop policy if exists "attendance_self_insert" on match_attendance;
create policy "attendance_self_insert"
  on match_attendance for insert to authenticated
  with check (
    player_id = public.current_player_id()
    and not public.current_player_is_guest()
    and updated_by_admin = false
    and public.match_accepts_attendance(match_id)
  );

drop policy if exists "attendance_self_update" on match_attendance;
create policy "attendance_self_update"
  on match_attendance for update to authenticated
  using (
    player_id = public.current_player_id()
    and not public.current_player_is_guest()
    and public.match_accepts_attendance(match_id)
  )
  with check (
    player_id = public.current_player_id()
    and not public.current_player_is_guest()
    and updated_by_admin = false
    and public.match_accepts_attendance(match_id)
  );

-- Snapshot del split: quien juega un partido de un torneo (asistencia 'yes' o
-- gol/asistencia/parada nuestra) entra en tournament_players de ese torneo, para
-- que el archivo de temporadas incluya a invitados y fichajes a mitad de split.
create or replace function public.ensure_tournament_player(p_match_id uuid, p_player_id uuid)
returns void language sql security definer
set search_path = '' as $$
  insert into public.tournament_players (tournament_id, player_id, number, position, is_captain)
  select m.tournament_id, p.id, p.number, p.position, false
  from public.matches m
  join public.players p on p.id = p_player_id
  where m.id = p_match_id and m.tournament_id is not null
  on conflict (tournament_id, player_id) do nothing
$$;
revoke execute on function public.ensure_tournament_player(uuid, uuid) from public, anon, authenticated;

create or replace function public.trg_attendance_snapshot()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if new.status = 'yes' then
    perform public.ensure_tournament_player(new.match_id, new.player_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_attendance_snapshot() from public, anon, authenticated;

create or replace function public.trg_event_snapshot()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if new.team_side = 'ours' then
    if new.scorer_player_id is not null then
      perform public.ensure_tournament_player(new.match_id, new.scorer_player_id);
    end if;
    if new.assist_player_id is not null then
      perform public.ensure_tournament_player(new.match_id, new.assist_player_id);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_event_snapshot() from public, anon, authenticated;

drop trigger if exists match_attendance_snapshot on match_attendance;
create trigger match_attendance_snapshot
  after insert or update of status on match_attendance
  for each row execute function public.trg_attendance_snapshot();

drop trigger if exists match_events_snapshot on match_events;
create trigger match_events_snapshot
  after insert or update of scorer_player_id, assist_player_id on match_events
  for each row execute function public.trg_event_snapshot();

-- ============================================================
-- v5 (2026-10-24): todos ven QUIÉN FALTA por votar
-- ============================================================
-- pending_player_ids deja de ser solo para admins. Sigue sin revelarse a quién
-- ha votado nadie: solo se sabe quién tiene papeleta pendiente.
create or replace function public.get_mvp_status(p_match_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = '' as $$
declare
  v_match     public.matches%rowtype;
  v_me        uuid := public.current_player_id();
  v_open      boolean;
  v_closed    boolean;
  v_eligible  integer;
  v_voted     integer;
  v_attended  boolean;
  v_has_voted boolean;
  v_my_vote   uuid;
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

  select count(*) into v_voted
  from public.mvp_ballots b
  join public.match_attendance a on a.match_id = b.match_id and a.player_id = b.voter_player_id and a.status = 'yes'
  join public.player_accounts pa on pa.player_id = b.voter_player_id
  where b.match_id = p_match_id;

  v_attended := v_me is not null and exists (
    select 1 from public.match_attendance
    where match_id = p_match_id and player_id = v_me and status = 'yes'
  );
  v_has_voted := v_me is not null and exists (
    select 1 from public.mvp_ballots where match_id = p_match_id and voter_player_id = v_me
  );
  if v_has_voted then
    select v.voted_player_id into v_my_vote from public.mvp_votes v
    where v.match_id = p_match_id and v.voter_key = public.mvp_voter_key(p_match_id, v_me);
  end if;

  return jsonb_build_object(
    'match_id',           p_match_id,
    'voting_open',        v_open,
    'closed',             v_closed,
    'eligible',           v_eligible,
    'voted',              v_voted,
    'all_voted',          v_eligible > 0 and v_voted >= v_eligible,
    'me_player_id',       v_me,
    'me_attended',        v_attended,
    'me_has_voted',       v_has_voted,
    'me_voted_player_id', v_my_vote,
    'can_vote',           v_open and v_attended,
    'pending_player_ids', (
        select coalesce(jsonb_agg(a.player_id), '[]'::jsonb)
        from public.match_attendance a
        join public.player_accounts pa on pa.player_id = a.player_id
        where a.match_id = p_match_id and a.status = 'yes'
          and not exists (
            select 1 from public.mvp_ballots b
            where b.match_id = p_match_id and b.voter_player_id = a.player_id
          )
      ),
    'results', case when v_closed then (
        select coalesce(jsonb_agg(jsonb_build_object('player_id', t.player_id, 'votes', t.votes)
                                  order by t.votes desc), '[]'::jsonb)
        from public.mvp_valid_tally(p_match_id) t
      ) else null end
  );
end;
$$;

-- ============================================================
-- v6 (2026-10-24): fotos de perfil
-- ============================================================
-- Bucket público 'avatars'. Ruta: <player_id>/<timestamp>.webp (o .jpg). Cada
-- jugador sube/borra solo en su carpeta; los admins en cualquiera. La ruta
-- vigente se guarda en players.photo_path vía set_player_photo() (players solo
-- lo escribe un admin por RLS, así que el jugador usa esta función).
alter table players add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_or_admin" on storage.objects;
create policy "avatars_insert_own_or_admin" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = public.current_player_id()::text or public.is_admin())
  );

drop policy if exists "avatars_update_own_or_admin" on storage.objects;
create policy "avatars_update_own_or_admin" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = public.current_player_id()::text or public.is_admin())
  )
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = public.current_player_id()::text or public.is_admin())
  );

drop policy if exists "avatars_delete_own_or_admin" on storage.objects;
create policy "avatars_delete_own_or_admin" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = public.current_player_id()::text or public.is_admin())
  );

-- Fija (o quita con null) la foto de un jugador: el propio jugador o un admin
create or replace function public.set_player_photo(p_player_id uuid, p_path text)
returns void language plpgsql security definer
set search_path = '' as $$
begin
  if not (p_player_id = public.current_player_id() or public.is_admin()) then
    raise exception 'not_allowed';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> p_player_id::text then
    raise exception 'invalid_path';
  end if;
  update public.players set photo_path = p_path where id = p_player_id;
end;
$$;
revoke execute on function public.set_player_photo(uuid, text) from public, anon;
grant execute on function public.set_player_photo(uuid, text) to authenticated;
