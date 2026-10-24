import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './client'
import type {
  AttendanceStatus,
  Match,
  MatchAttendanceWithPlayer,
  MatchMvpWithPlayer,
  MvpErrorCode,
  MvpStatus,
  Player,
} from '../types'

// ============================================================
// Asistencia por partido + votación MVP
// Votos anónimos: NUNCA leer mvp_ballots / mvp_votes (sin policies).
// Todo el estado de la votación sale de las RPC.
// ============================================================

// Reexportados por comodidad de los componentes que ya importan desde aquí
export type { MvpPlayer, MatchMvpWithPlayer, MatchAttendanceWithPlayer } from '../types'

const MVP_PLAYER_COLUMNS = 'id, number, name, alias, photo_path'

/** Título según cuántos empatan: empate a votos = doble (o triple) MVP. */
export function mvpTitle(winners: number): string {
  if (winners === 2) return 'Doble MVP'
  if (winners === 3) return 'Triple MVP'
  if (winners > 3) return 'MVP compartido'
  return 'MVP del partido'
}

/** Nombre corto para la UI: alias si lo tiene, si no el nombre completo. */
export function displayName(player: Pick<Player, 'name' | 'alias'> | null | undefined): string {
  if (!player) return 'Jugador'
  return player.alias ?? player.name
}

// ============================================================
// Lectura
// ============================================================

export async function getMatchAttendance(matchId: string): Promise<MatchAttendanceWithPlayer[]> {
  const { data, error } = await supabase
    .from('match_attendance')
    .select('*, player:player_id(*)')
    .eq('match_id', matchId)
  if (error) throw error
  return data as MatchAttendanceWithPlayer[]
}

/** IDs de jugadores con cuenta (pueden votar si asisten). */
export async function getRegisteredPlayerIds(): Promise<string[]> {
  const { data, error } = await supabase.from('player_accounts').select('player_id')
  if (error) throw error
  return (data as { player_id: string }[]).map((r) => r.player_id)
}

/** Todos los jugadores, también inactivos (para resolver nombres de resultados antiguos). */
export async function getAllPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('number')
  if (error) throw error
  return data as Player[]
}

export async function getMatchMvps(matchId: string): Promise<MatchMvpWithPlayer[]> {
  const { data, error } = await supabase
    .from('match_mvps')
    .select(`*, player:player_id(${MVP_PLAYER_COLUMNS})`)
    .eq('match_id', matchId)
    .order('votes', { ascending: false })
  if (error) throw error
  return data as unknown as MatchMvpWithPlayer[]
}

/** MVPs de varios partidos en una sola consulta (listas de partidos). */
export async function getMvpsByMatchIds(
  matchIds: string[]
): Promise<Record<string, MatchMvpWithPlayer[]>> {
  if (matchIds.length === 0) return {}
  const { data, error } = await supabase
    .from('match_mvps')
    .select(`*, player:player_id(${MVP_PLAYER_COLUMNS})`)
    .in('match_id', matchIds)
  if (error) throw error
  const byMatch: Record<string, MatchMvpWithPlayer[]> = {}
  for (const row of data as unknown as MatchMvpWithPlayer[]) {
    ;(byMatch[row.match_id] ??= []).push(row)
  }
  return byMatch
}

/** MVPs de los partidos jugados de una lista; no lanza (las páginas siguen sin MVP). */
export async function getMvpsForMatches(
  matches: Pick<Match, 'id' | 'status'>[]
): Promise<Record<string, MatchMvpWithPlayer[]>> {
  const ids = matches.filter((m) => m.status === 'finished').map((m) => m.id)
  return getMvpsByMatchIds(ids).catch(() => ({}))
}

// ============================================================
// Escritura de asistencia
// ============================================================

/** El jugador marca su propia asistencia (solo antes del partido, lo impone RLS). */
export async function setMyAttendance(
  matchId: string,
  playerId: string,
  status: AttendanceStatus
): Promise<void> {
  const { error } = await supabase
    .from('match_attendance')
    .upsert(
      { match_id: matchId, player_id: playerId, status, updated_by_admin: false },
      { onConflict: 'match_id,player_id' }
    )
  if (error) throw error
}

/** Admin: fija (o borra con `null`) la asistencia de cualquier jugador. */
export async function setAttendanceAsAdmin(
  matchId: string,
  playerId: string,
  status: AttendanceStatus | null
): Promise<void> {
  if (status === null) {
    const { error } = await supabase
      .from('match_attendance')
      .delete()
      .eq('match_id', matchId)
      .eq('player_id', playerId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('match_attendance')
    .upsert(
      { match_id: matchId, player_id: playerId, status, updated_by_admin: true },
      { onConflict: 'match_id,player_id' }
    )
  if (error) throw error
}

// ============================================================
// RPC de MVP
// ============================================================

export async function getMvpStatus(matchId: string): Promise<MvpStatus> {
  const { data, error } = await supabase.rpc('get_mvp_status', { p_match_id: matchId })
  if (error) throw error
  return data as MvpStatus
}

export async function castMvpVote(matchId: string, votedPlayerId: string): Promise<MvpStatus> {
  const { data, error } = await supabase.rpc('cast_mvp_vote', {
    p_match_id: matchId,
    p_voted_player_id: votedPlayerId,
  })
  if (error) throw error
  return data as MvpStatus
}

export async function closeMvpVoting(matchId: string): Promise<MvpStatus> {
  const { data, error } = await supabase.rpc('close_mvp_voting', { p_match_id: matchId })
  if (error) throw error
  return data as MvpStatus
}

// ============================================================
// Errores → mensajes en español
// ============================================================

const MVP_ERROR_CODES: MvpErrorCode[] = [
  'not_registered',
  'voting_closed',
  'not_attended',
  'already_voted',
  'invalid_candidate',
  'not_admin',
]

const MVP_ERROR_MESSAGES: Record<MvpErrorCode, string> = {
  not_registered: 'Necesitas identificarte como jugador para votar.',
  voting_closed: 'La votación ya está cerrada.',
  not_attended: 'Solo pueden votar los jugadores que vinieron al partido.',
  already_voted: 'Ya has votado en este partido.',
  invalid_candidate: 'Ese jugador no se puede votar (no vino al partido o eres tú).',
  not_admin: 'Solo un admin puede hacer esto.',
}

function errorText(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  const e = error as Partial<PostgrestError> & { message?: string }
  return [e.message, e.details, e.hint].filter(Boolean).join(' ')
}

export function parseMvpError(error: unknown): MvpErrorCode | null {
  const text = errorText(error)
  return MVP_ERROR_CODES.find((code) => text.includes(code)) ?? null
}

export function mvpErrorMessage(error: unknown): string {
  const code = parseMvpError(error)
  if (code) return MVP_ERROR_MESSAGES[code]
  return 'No se ha podido completar. Revisa la conexión y vuelve a intentarlo.'
}

/** Mensaje para fallos al guardar asistencia (RLS: el partido ya empezó, sesión caducada…). */
export function attendanceErrorMessage(error: unknown): string {
  const e = error as Partial<PostgrestError> | null
  if (e?.code === '42501' || errorText(error).includes('row-level security')) {
    return 'La asistencia ya no se puede cambiar: el partido ha empezado. Pide a un admin que lo corrija.'
  }
  return 'No se ha podido guardar. Revisa la conexión y vuelve a intentarlo.'
}
