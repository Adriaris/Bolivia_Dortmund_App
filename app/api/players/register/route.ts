import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { isUuid, isValidPin, playerEmail } from '@/lib/players'
import { findAuthUserByEmail, jsonError, readJson, serviceRoleMissing } from '../shared'

// POST /api/players/register  { playerId, pin }
// Crea el usuario de Auth del jugador (email interno + PIN como contraseña) y
// lo vincula en player_accounts. El cliente inicia sesión después con el PIN.
// IMPORTANTE: el PIN nunca se registra en logs ni se devuelve.

// Un usuario de Auth sin vínculo más antiguo que esto se considera huérfano
// (registro que falló a medias) y se puede reemplazar.
const ORPHAN_MIN_AGE_MS = 2 * 60 * 1000

const ALREADY_REGISTERED = 'Este jugador ya está registrado'

async function isLinked(service: SupabaseClient, playerId: string): Promise<boolean> {
  const { data, error } = await service
    .from('player_accounts')
    .select('player_id')
    .eq('player_id', playerId)
    .maybeSingle()
  if (error) throw error
  return data !== null
}

type CreateResult =
  | { kind: 'created'; userId: string }
  | { kind: 'exists' }
  | { kind: 'error'; message: string }

async function createAuthUser(service: SupabaseClient, email: string, pin: string): Promise<CreateResult> {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    app_metadata: { role: 'player' },
  })
  if (!error && data.user) return { kind: 'created', userId: data.user.id }
  const alreadyExists =
    error?.code === 'email_exists' ||
    error?.code === 'user_already_exists' ||
    (error?.status === 422 && /already/i.test(error.message))
  if (alreadyExists) {
    return { kind: 'exists' }
  }
  console.error('[players/register] createUser failed:', error?.code ?? error?.message)
  return { kind: 'error', message: error?.code === 'weak_password'
    ? 'La configuración de contraseñas de Supabase no admite un PIN de 6 cifras. Avisa a un admin.'
    : 'No se pudo crear la cuenta. Inténtalo de nuevo.' }
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const playerId = body?.playerId
  const pin = body?.pin
  if (!isUuid(playerId)) return jsonError(400, 'Jugador no válido')
  if (!isValidPin(pin)) return jsonError(400, 'El PIN debe tener 6 cifras')

  const missing = serviceRoleMissing()
  if (missing) return missing

  const service = createServiceClient()
  const email = playerEmail(playerId)

  try {
    const { data: player, error: playerError } = await service
      .from('players')
      .select('id, active')
      .eq('id', playerId)
      .maybeSingle()
    if (playerError) throw playerError
    if (!player || !player.active) return jsonError(404, 'Jugador no encontrado')

    if (await isLinked(service, playerId)) return jsonError(409, ALREADY_REGISTERED)

    let result = await createAuthUser(service, email, pin)

    if (result.kind === 'exists') {
      // ¿Otro registro simultáneo ya lo vinculó?
      if (await isLinked(service, playerId)) return jsonError(409, ALREADY_REGISTERED)
      // Usuario huérfano (sin vínculo): si es antiguo, se reemplaza; si es
      // reciente puede ser un registro en curso y no se toca.
      const orphan = await findAuthUserByEmail(service, email)
      const age = orphan ? Date.now() - new Date(orphan.created_at).getTime() : 0
      if (!orphan || age < ORPHAN_MIN_AGE_MS) {
        return jsonError(409, 'Hay un registro en curso para este jugador. Espera un par de minutos y vuelve a intentarlo.')
      }
      const { error: delError } = await service.auth.admin.deleteUser(orphan.id)
      if (delError) throw delError
      result = await createAuthUser(service, email, pin)
      if (result.kind === 'exists') return jsonError(409, ALREADY_REGISTERED)
    }

    if (result.kind === 'error') return jsonError(500, result.message)

    const { error: linkError } = await service
      .from('player_accounts')
      .insert({ player_id: playerId, user_id: result.userId })

    if (linkError) {
      // Deshacer: no dejar un usuario de Auth sin vincular
      const { error: rollbackError } = await service.auth.admin.deleteUser(result.userId)
      if (rollbackError) console.error('[players/register] rollback deleteUser failed:', rollbackError.message)
      if (linkError.code === '23505') return jsonError(409, ALREADY_REGISTERED)
      console.error('[players/register] link insert failed:', linkError.code, linkError.message)
      return jsonError(500, 'No se pudo vincular la cuenta. Inténtalo de nuevo.')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[players/register] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return jsonError(500, 'Error inesperado al registrar. Inténtalo de nuevo.')
  }
}
