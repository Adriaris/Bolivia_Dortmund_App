import { supabase } from './supabase/client'
import { playerEmail } from './players'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export class InvalidPinError extends Error {
  constructor() {
    super('PIN incorrecto')
    this.name = 'InvalidPinError'
  }
}

/** Inicia sesión como jugador con su PIN. Lanza InvalidPinError si no coincide. */
export async function signInPlayer(playerId: string, pin: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: playerEmail(playerId),
    password: pin,
  })
  if (error) {
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
      throw new InvalidPinError()
    }
    throw error
  }
  return data
}

/** Access token de la sesión actual (para `Authorization: Bearer` en API routes). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/** IDs de jugadores que ya tienen cuenta (player_accounts es de lectura pública). */
export async function getRegisteredPlayerIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('player_accounts').select('player_id')
  if (error) throw error
  return new Set((data ?? []).map((row) => row.player_id as string))
}

async function postJson(path: string, body: unknown, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  return { status: res.status, ok: res.ok && json.ok === true, error: json.error ?? null }
}

/** Crea la cuenta del jugador con su PIN (no inicia sesión). */
export function registerPlayer(playerId: string, pin: string) {
  return postJson('/api/players/register', { playerId, pin })
}

/** Admin: libera la cuenta de un jugador (deberá registrarse de nuevo). */
export async function releasePlayer(playerId: string) {
  const token = await getAccessToken()
  return postJson('/api/players/release', { playerId }, token)
}
