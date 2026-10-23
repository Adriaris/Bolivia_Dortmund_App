// ============================================================
// Tipos de dominio — compartidos entre cliente y servidor
// ============================================================

export type Position = 'POR' | 'DEF' | 'MED' | 'DEL' | 'CAR'

export interface Tournament {
  id: string
  name: string
  short_name: string
  season: string
  display_order: number
  is_current: boolean
  standings_url: string | null
  fixtures_url: string | null
  created_at: string
}

// 'walkover' = ganado por incomparecencia (el rival no se presentó). Se guarda 5-0 sin eventos de gol.
export type MatchStatus = 'pending' | 'postponed' | 'first_half' | 'half_time' | 'second_half' | 'finished' | 'walkover'

export type Period = 'first_half' | 'second_half'

export type GoalType = 'normal' | 'free_kick' | 'penalty'

export type EventType = 'goal' | 'save'

export type TeamSide = 'ours' | 'opponent'

// ============================================================
// DB rows — reflejan exactamente las columnas de Supabase
// ============================================================

export interface Player {
  id: string
  number: number
  name: string
  alias: string | null
  position: string
  is_captain: boolean
  active: boolean
  is_admin: boolean
  // Externo que viene a algún partido: juega, puntúa y vota como los demás,
  // pero solo un admin puede apuntarlo a un partido (no marca su asistencia)
  is_guest: boolean
  created_at: string
}

export interface Match {
  id: string
  opponent_name: string
  match_date: string | null
  match_time: string | null
  match_venue: string | null
  status: MatchStatus
  our_score: number
  opponent_score: number
  current_period: Period
  is_clock_running: boolean
  period_started_at: string | null
  first_half_elapsed_seconds: number
  second_half_elapsed_seconds: number
  tournament_id: string | null
  // Votación MVP: abierta ⇔ status = 'finished' y mvp_closed_at === null
  mvp_closed_at: string | null
  created_at: string
  updated_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  team_side: TeamSide
  event_type: EventType
  minute: number | null
  period: Period
  goal_type: GoalType | null
  scorer_player_id: string | null
  assist_player_id: string | null
  created_at: string
}

// MatchEvent con relaciones resueltas (para mostrar en UI)
export interface MatchEventWithPlayers extends MatchEvent {
  scorer: Player | null
  assist: Player | null
}

// ============================================================
// Tipos de inserción (sin id, created_at, etc.)
// ============================================================

export type NewMatch = Pick<Match, 'opponent_name' | 'match_date' | 'match_time' | 'tournament_id'>

export interface NewMatchEvent {
  match_id: string
  team_side: TeamSide
  event_type?: EventType
  minute: number
  period: Period
  goal_type?: GoalType | null
  scorer_player_id?: string | null
  assist_player_id?: string | null
}

// ============================================================
// Estadísticas calculadas
// ============================================================

export interface PlayerStats {
  player: Player
  goals: number
  assists: number
  participations: number
  saves: number
}

export interface Standing {
  id: number
  pos: number
  team: string
  pts: number
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  gc: number
  gd: number
  logo_url: string | null
  tournament_id: string
  updated_at: string
}

// Snapshot del roster de un torneo: dorsal/posición/capitán de aquel split
export interface TournamentPlayer {
  tournament_id: string
  player_id: string
  number: number
  position: string
  is_captain: boolean
}

export interface TournamentPlayerWithPlayer extends TournamentPlayer {
  player: Player
}

export interface LeagueResult {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string | null
  match_time: string | null
  venue: string | null
  tournament_id: string
  updated_at: string
}

// ============================================================
// Cuentas de jugador, asistencia y MVP
// ============================================================

// Vínculo usuario Auth ↔ jugador. Email interno: `${player_id}@players.bvd04.fc`, contraseña = PIN (6 cifras)
export interface PlayerAccount {
  player_id: string
  user_id: string
  created_at: string
}

export type AttendanceStatus = 'yes' | 'no'

export interface MatchAttendance {
  match_id: string
  player_id: string
  status: AttendanceStatus
  updated_by_admin: boolean
  updated_at: string
}

// MVP confirmado (empate → varias filas por partido)
export interface MatchMvp {
  match_id: string
  player_id: string
  votes: number
}

export type MvpPlayer = Pick<Player, 'id' | 'number' | 'name' | 'alias'>

export interface MatchMvpWithPlayer extends MatchMvp {
  player: MvpPlayer | null
}

export interface MatchAttendanceWithPlayer extends MatchAttendance {
  player: Player | null
}

export interface MvpResult {
  player_id: string
  votes: number
}

// Respuesta de las RPC get_mvp_status / cast_mvp_vote / close_mvp_voting
export interface MvpStatus {
  match_id: string
  voting_open: boolean
  closed: boolean
  eligible: number              // asistentes con cuenta → votantes
  voted: number                 // papeletas emitidas
  me_player_id: string | null
  me_attended: boolean
  me_has_voted: boolean
  me_voted_player_id: string | null    // mi voto actual: solo me lo devuelve a mí
  all_voted: boolean                   // han votado todos (la votación sigue abierta hasta que cierre un admin)
  can_vote: boolean                    // votar o cambiar el voto (abierta y asistí)
  pending_player_ids: string[] | null  // solo admins; null para el resto
  results: MvpResult[] | null          // solo con la votación cerrada
}

// Errores que lanzan las RPC de MVP (texto de la excepción de Postgres)
export type MvpErrorCode =
  | 'not_registered'
  | 'voting_closed'
  | 'not_attended'
  | 'already_voted'
  | 'invalid_candidate'
  | 'not_admin'
