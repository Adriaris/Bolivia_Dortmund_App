-- Políticas de seguridad Row Level Security (RLS)
-- Ejecutar en el SQL editor de Supabase DESPUÉS del schema.sql
--
-- Lógica:
--   • Cualquier persona (anon) puede LEER todo
--   • Solo usuarios autenticados (admin) pueden ESCRIBIR / MODIFICAR / BORRAR
--   • standings y league_results (scrapeadas) se escriben SOLO desde las API
--     routes con service role key → sin policy de escritura

-- ============================================================
-- Activar RLS en todas las tablas
-- ============================================================
alter table players            enable row level security;
alter table tournaments        enable row level security;
alter table tournament_players enable row level security;
alter table matches            enable row level security;
alter table match_events       enable row level security;
alter table standings          enable row level security;
alter table league_results     enable row level security;

-- ============================================================
-- PLAYERS — solo lectura pública, escritura admin
-- ============================================================
create policy "players_select_public"
  on players for select
  to anon, authenticated
  using (true);

create policy "players_all_admin"
  on players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- TOURNAMENTS — solo lectura pública, escritura admin
-- ============================================================
create policy "tournaments_select_public"
  on tournaments for select
  to anon, authenticated
  using (true);

create policy "tournaments_all_admin"
  on tournaments for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- TOURNAMENT_PLAYERS — solo lectura pública, escritura admin
-- ============================================================
create policy "tournament_players_select_public"
  on tournament_players for select
  to anon, authenticated
  using (true);

create policy "tournament_players_all_admin"
  on tournament_players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- MATCHES — solo lectura pública, escritura admin
-- ============================================================
create policy "matches_select_public"
  on matches for select
  to anon, authenticated
  using (true);

create policy "matches_all_admin"
  on matches for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- MATCH_EVENTS — solo lectura pública, escritura admin
-- ============================================================
create policy "events_select_public"
  on match_events for select
  to anon, authenticated
  using (true);

create policy "events_all_admin"
  on match_events for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- STANDINGS — solo lectura pública (escritura vía service role)
-- ============================================================
create policy "standings_select_public"
  on standings for select
  to anon, authenticated
  using (true);

-- ============================================================
-- LEAGUE_RESULTS — solo lectura pública (escritura vía service role)
-- ============================================================
create policy "league_results_select_public"
  on league_results for select
  to anon, authenticated
  using (true);
