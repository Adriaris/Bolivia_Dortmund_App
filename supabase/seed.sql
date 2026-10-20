-- Seed inicial — Bolivia Dortmund, Primer Split temporada 26/27 (Viernes "B")
-- Ejecutar DESPUÉS de schema.sql y rls.sql, en una BD vacía.
-- Datos scrapeados de fundaciovalldor7.com el 20-10-2026 (ver datos-liga.md).

-- ============================================================
-- 1. Torneo activo
-- ============================================================
insert into tournaments (id, name, short_name, season, display_order, is_current, standings_url, fixtures_url)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Primer Split · Liga F7 Baix Llobregat · Viernes "B"',
  'Split 1',
  '26/27',
  1,
  true,
  'https://virtual.fundaciovalldor7.com/es-ES/LeagueData/StandingsItems?BaseLeagueId=298&LeagueType=Teams&SportType=SoccerMini&RoundId=593&GroupId=2042',
  'https://virtual.fundaciovalldor7.com/cornella-hospitalet-f7-es-26-27/resultados?groupId=2042'
);

-- ============================================================
-- 2. Plantilla oficial 26/27 (web de la liga) — capitán sin confirmar
-- ============================================================
insert into players (id, number, name, position, active) values
  ('b0000000-0000-4000-8000-000000000005', 5,  'Aarón Padilla Grajeda',       'DEF', true),
  ('b0000000-0000-4000-8000-000000000006', 6,  'Alex Rodríguez Bejarano',     'MED', true),
  ('b0000000-0000-4000-8000-000000000007', 7,  'Fran Torres Pereyra',         'MED', true),
  ('b0000000-0000-4000-8000-000000000008', 8,  'Pau Calpe Tomé',              'MED', true),
  ('b0000000-0000-4000-8000-000000000010', 10, 'Alejandro Herrero Terrero',   'DEF', true),
  ('b0000000-0000-4000-8000-000000000011', 11, 'Carlos Barriga Arqué',        'MED', true),
  ('b0000000-0000-4000-8000-000000000013', 13, 'Erik González Andreu',        'MED', true),
  ('b0000000-0000-4000-8000-000000000019', 19, 'Celestino Diaz Rodriguez',    'DEF', true),
  ('b0000000-0000-4000-8000-000000000022', 22, 'Adrián Sánchez Rivas',        'MED', true),
  ('b0000000-0000-4000-8000-000000000024', 24, 'Adrià León Aris',             'MED', true),
  ('b0000000-0000-4000-8000-000000000029', 29, 'Pablo Jiménez Prieto',        'POR', true),
  ('b0000000-0000-4000-8000-000000000069', 69, 'Alex Villalba Zarcero',       'DEL', true),
  ('b0000000-0000-4000-8000-000000000087', 87, 'Luis Fernando Vasquez Honor', 'DEL', true),
  ('b0000000-0000-4000-8000-000000000099', 99, 'Iago Rodríguez Domínguez',    'DEF', true);

-- Snapshot del roster en el split activo
insert into tournament_players (tournament_id, player_id, number, position, is_captain)
select 'a0000000-0000-4000-8000-000000000001', id, number, position, is_captain
from players;

-- ============================================================
-- 3. Partidos jugados
-- ============================================================
-- J1 · 02-10-2026 · O. Ildefons · Bolivia Dortmund 1-5 Sin Fronteras FC
insert into matches (id, opponent_name, match_date, match_time, match_venue, status, our_score, opponent_score,
                     current_period, is_clock_running, period_started_at,
                     first_half_elapsed_seconds, second_half_elapsed_seconds, tournament_id)
values ('c0000000-0000-4000-8000-000000000001', 'Sin Fronteras FC', '2026-10-02', null, 'O. Ildefons',
        'finished', 1, 5, 'second_half', false, null, 1500, 1500,
        'a0000000-0000-4000-8000-000000000001');

-- Partes de 25': minuto > 25 → second_half (minuto relativo al parte)
insert into match_events (match_id, team_side, event_type, minute, period, goal_type, scorer_player_id, assist_player_id) values
  ('c0000000-0000-4000-8000-000000000001', 'opponent', 'goal', 7,  'first_half',  'normal', null, null),
  ('c0000000-0000-4000-8000-000000000001', 'opponent', 'goal', 20, 'first_half',  'normal', null, null),
  ('c0000000-0000-4000-8000-000000000001', 'opponent', 'goal', 24, 'first_half',  'normal', null, null),
  ('c0000000-0000-4000-8000-000000000001', 'opponent', 'goal', 24, 'first_half',  'normal', null, null),
  ('c0000000-0000-4000-8000-000000000001', 'ours',     'goal', 15, 'second_half', 'normal', 'b0000000-0000-4000-8000-000000000099', null),
  ('c0000000-0000-4000-8000-000000000001', 'opponent', 'goal', 17, 'second_half', 'normal', null, null);

-- J2 · 09-10-2026 · O. Ildefons · Los Calaveras 2-3 Bolivia Dortmund (victoria)
-- La liga no publica la cronología: goles propios sin goleador (minuto 0 = desconocido)
insert into matches (id, opponent_name, match_date, match_time, match_venue, status, our_score, opponent_score,
                     current_period, is_clock_running, period_started_at,
                     first_half_elapsed_seconds, second_half_elapsed_seconds, tournament_id)
values ('c0000000-0000-4000-8000-000000000002', 'Los Calaveras', '2026-10-09', null, 'O. Ildefons',
        'finished', 3, 2, 'second_half', false, null, 1500, 1500,
        'a0000000-0000-4000-8000-000000000001');

insert into match_events (match_id, team_side, event_type, minute, period, goal_type, scorer_player_id, assist_player_id) values
  ('c0000000-0000-4000-8000-000000000002', 'ours',     'goal', 0, 'first_half', 'normal', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'ours',     'goal', 0, 'first_half', 'normal', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'ours',     'goal', 0, 'first_half', 'normal', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'opponent', 'goal', 0, 'first_half', 'normal', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'opponent', 'goal', 0, 'first_half', 'normal', null, null);

-- ============================================================
-- 4. Calendario pendiente del Primer Split (sync-fixtures lo mantiene al día)
-- ============================================================
insert into matches (opponent_name, match_date, match_time, match_venue, status, tournament_id) values
  ('La Farga FC',      '2026-10-23', '22:30', 'O. Ildefons', 'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Almeda Veteranos', '2026-10-30', '23:15', 'L. Almeda',   'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Menuda Banda FC',  '2026-11-06', '22:30', 'O. Ildefons', 'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Gossos FC',        '2026-11-13', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Sin Fronteras FC', '2026-11-20', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Los Calaveras',    '2026-11-27', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('La Farga FC',      '2026-12-11', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Almeda Veteranos', '2026-12-18', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Menuda Banda FC',  '2027-01-08', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001'),
  ('Gossos FC',        '2027-01-15', null,    null,          'pending', 'a0000000-0000-4000-8000-000000000001');

-- ============================================================
-- 5. Clasificación (jornada 3) — sync-standings la sobrescribe cada día
-- ============================================================
insert into standings (pos, team, pts, played, wins, draws, losses, gf, gc, gd, logo_url, tournament_id) values
  (1, 'Menuda Banda FC',  6, 2, 2, 0, 0, 9,  5,  4, 'https://virtual.fundaciovalldor7.com/master/teams/024785/024785_thumb.png',       'a0000000-0000-4000-8000-000000000001'),
  (2, 'Gossos FC',        6, 3, 2, 0, 1, 10, 9,  1, 'https://virtual.fundaciovalldor7.com/master/teams/028699/028699_thumb.png',       'a0000000-0000-4000-8000-000000000001'),
  (3, 'Sin Fronteras FC', 4, 3, 1, 1, 1, 9,  6,  3, 'https://virtual.fundaciovalldor7.com/master/teams/028756/028756_thumb.png',       'a0000000-0000-4000-8000-000000000001'),
  (4, 'Almeda Veteranos', 3, 3, 1, 0, 2, 9,  12, -3, 'https://virtual.fundaciovalldor7.com/master/teams/028943/028943_thumb.png',      'a0000000-0000-4000-8000-000000000001'),
  (5, 'Bolivia Dortmund', 3, 2, 1, 0, 1, 4,  7,  -3, 'https://virtual.fundaciovalldor7.com/master/teams/024798/024798_thumb.png',      'a0000000-0000-4000-8000-000000000001'),
  (6, 'La Farga FC',      2, 3, 0, 2, 1, 3,  4,  -1, 'https://virtual.fundaciovalldor7.com/clients/valldor/default/team-logo_thumb.png', 'a0000000-0000-4000-8000-000000000001'),
  (7, 'Los Calaveras',    1, 2, 0, 1, 1, 3,  4,  -1, 'https://virtual.fundaciovalldor7.com/master/teams/000849/000849_thumb.png',      'a0000000-0000-4000-8000-000000000001');

-- ============================================================
-- 6. Resultados de liga conocidos (sync-fixtures completa el resto)
-- ============================================================
insert into league_results (home_team, away_team, home_score, away_score, match_date, match_time, venue, tournament_id) values
  ('Bolivia Dortmund', 'Sin Fronteras FC', 1, 5, '2026-10-02', null, 'O. Ildefons', 'a0000000-0000-4000-8000-000000000001'),
  ('Los Calaveras',    'Bolivia Dortmund', 2, 3, '2026-10-09', null, 'O. Ildefons', 'a0000000-0000-4000-8000-000000000001');
