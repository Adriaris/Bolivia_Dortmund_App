import { supabase } from './client'
import type {
  LeagueResult,
  Match,
  MatchEvent,
  MatchEventWithPlayers,
  NewMatch,
  NewMatchEvent,
  Period,
  Player,
  PlayerProfileStats,
  Standing,
  Tournament,
  TournamentPlayerWithPlayer,
} from '../types'

// ============================================================
// Players
// ============================================================

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('active', true)
    .order('number')
  if (error) throw error
  return data
}

export async function getPlayer(id: string): Promise<Player | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Player | null) ?? null
}

export async function getPlayerProfile(id: string): Promise<PlayerProfileStats> {
  const { data, error } = await supabase.rpc('get_player_profile', { p_player_id: id })
  if (error) throw error
  return data as PlayerProfileStats
}

export async function createPlayer(
  player: {
    number: number
    name: string
    position: string
    is_guest?: boolean
  },
  tournamentId?: string | null
): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({ ...player, is_guest: player.is_guest ?? false, active: true })
    .select()
    .single()
  if (error) throw error
  // Alta a mitad de split: entra en la foto del torneo activo (convocatoria y archivo)
  if (tournamentId) {
    const { error: tpError } = await supabase.from('tournament_players').upsert(
      {
        tournament_id: tournamentId,
        player_id: data.id,
        number: data.number,
        position: data.position,
        is_captain: false,
      },
      { onConflict: 'tournament_id,player_id', ignoreDuplicates: true }
    )
    if (tpError) throw tpError
  }
  return data
}

/** Admin: pasa un jugador de la plantilla a invitado o al revés. */
export async function setPlayerGuest(playerId: string, isGuest: boolean): Promise<void> {
  const { error } = await supabase.from('players').update({ is_guest: isGuest }).eq('id', playerId)
  if (error) throw error
}

// ============================================================
// Tournaments
// ============================================================

export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('display_order', { ascending: false })
  if (error) throw error
  return data
}

export async function getTournament(id: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getCurrentTournament(): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_current', true)
    .limit(1)
  if (error) throw error
  return data[0] ?? null
}

// ============================================================
// Tournament players (roster histórico por torneo)
// ============================================================

export async function getTournamentPlayers(
  tournamentId: string
): Promise<TournamentPlayerWithPlayer[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('*, player:player_id(*)')
    .eq('tournament_id', tournamentId)
    .order('number')
  if (error) throw error
  return data as TournamentPlayerWithPlayer[]
}

// ============================================================
// Standings
// ============================================================

export async function getStandings(tournamentId?: string): Promise<Standing[]> {
  let query = supabase
    .from('standings')
    .select('*')
    .gt('pos', 0)
    .order('pos')
  if (tournamentId) query = query.eq('tournament_id', tournamentId)
  const { data, error } = await query
  if (error) throw error
  return data
}


// ============================================================
// League Results (resultados de todos los equipos de la liga)
// ============================================================

export async function getLeagueResultsByTeam(
  team: string,
  tournamentId?: string
): Promise<LeagueResult[]> {
  let query = supabase
    .from('league_results')
    .select('*')
    .or(`home_team.eq.${team},away_team.eq.${team}`)
    .order('match_date', { ascending: false })
  if (tournamentId) query = query.eq('tournament_id', tournamentId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAllLeagueResults(tournamentId?: string): Promise<LeagueResult[]> {
  let query = supabase
    .from('league_results')
    .select('*')
    .order('match_date', { ascending: true })
  if (tournamentId) query = query.eq('tournament_id', tournamentId)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ============================================================
// Matches
// ============================================================

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getUpcomingMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .in('status', ['pending', 'postponed'])
  if (error) throw error
  // Pending first (sorted by date), postponed at the end (no date)
  return (data as Match[]).sort((a, b) => {
    if (a.status === 'postponed' && b.status !== 'postponed') return 1
    if (b.status === 'postponed' && a.status !== 'postponed') return -1
    if (!a.match_date) return 1
    if (!b.match_date) return -1
    return a.match_date.localeCompare(b.match_date)
  })
}

export async function postponeMatch(id: string): Promise<Match> {
  return updateMatch(id, { status: 'postponed', match_date: null, match_time: null })
}

export async function getMatch(id: string): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createMatch(match: NewMatch): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert(match)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw error
}

export async function updateMatch(
  id: string,
  updates: Partial<Match>
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================
// Match Events
// ============================================================

export async function getMatchEvents(matchId: string): Promise<MatchEventWithPlayers[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select(`
      *,
      scorer:scorer_player_id(id, number, name, alias, position, is_captain, is_guest, photo_path),
      assist:assist_player_id(id, number, name, alias, position, is_captain, is_guest, photo_path)
    `)
    .eq('match_id', matchId)
    .order('minute', { ascending: true })
  if (error) throw error
  return data as MatchEventWithPlayers[]
}

export async function addGoal(event: NewMatchEvent): Promise<MatchEvent> {
  const payload = {
    ...event,
    event_type: 'goal' as const,
    scorer_player_id: event.scorer_player_id ?? null,
    assist_player_id: event.assist_player_id ?? null,
  }
  const { data, error } = await supabase
    .from('match_events')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addSave(event: {
  match_id: string
  minute: number
  period: Period
  goalkeeper_player_id: string | null
}): Promise<MatchEvent> {
  const { data, error } = await supabase
    .from('match_events')
    .insert({
      match_id: event.match_id,
      team_side: 'ours',
      event_type: 'save',
      minute: event.minute,
      period: event.period,
      goal_type: null,
      scorer_player_id: event.goalkeeper_player_id,
      assist_player_id: null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMatchEvent(id: string): Promise<void> {
  const { error } = await supabase.from('match_events').delete().eq('id', id)
  if (error) throw error
}

export interface UpdateMatchEventPayload {
  scorer_player_id?: string | null
  assist_player_id?: string | null
  goal_type?: string | null
  minute?: number | null
  period?: string
}

export async function updateMatchEvent(
  id: string,
  updates: UpdateMatchEventPayload
): Promise<MatchEvent> {
  const { data, error } = await supabase
    .from('match_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================
// Clock helpers — actualizan el partido en Supabase
// ============================================================

export async function startClock(matchId: string, period: string): Promise<Match> {
  return updateMatch(matchId, {
    is_clock_running: true,
    period_started_at: new Date().toISOString(),
    status: period as Match['status'],
    current_period: period === 'second_half' ? 'second_half' : 'first_half',
  })
}

export async function pauseClock(
  matchId: string,
  elapsedSeconds: number,
  period: 'first_half' | 'second_half'
): Promise<Match> {
  const field =
    period === 'first_half'
      ? 'first_half_elapsed_seconds'
      : 'second_half_elapsed_seconds'
  return updateMatch(matchId, {
    is_clock_running: false,
    period_started_at: null,
    [field]: elapsedSeconds,
  })
}

export async function finishMatch(
  matchId: string,
  elapsedSeconds: number,
  period: 'first_half' | 'second_half'
): Promise<Match> {
  const field =
    period === 'first_half'
      ? 'first_half_elapsed_seconds'
      : 'second_half_elapsed_seconds'
  return updateMatch(matchId, {
    is_clock_running: false,
    period_started_at: null,
    status: 'finished',
    [field]: elapsedSeconds,
  })
}
