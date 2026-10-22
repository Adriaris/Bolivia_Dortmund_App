import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/supabase/server-auth'
import { isUuid, playerEmail } from '@/lib/players'
import { findAuthUserByEmail, jsonError, readJson, serviceRoleMissing } from '../shared'

// POST /api/players/release  { playerId }   (solo admin: Authorization: Bearer <token>)
// Borra el usuario de Auth del jugador; el ON DELETE CASCADE elimina su fila de
// player_accounts. Asistencias y votos van por player_id y se conservan.
// El jugador tendrá que registrarse de nuevo con un PIN nuevo.

export async function POST(req: Request) {
  const missing = serviceRoleMissing()
  if (missing) return missing

  const admin = await requireAdmin(req)
  if (!admin) return jsonError(403, 'Solo un admin puede liberar cuentas')

  const body = await readJson(req)
  const playerId = body?.playerId
  if (!isUuid(playerId)) return jsonError(400, 'Jugador no válido')

  const service = createServiceClient()

  try {
    const { data: account, error } = await service
      .from('player_accounts')
      .select('user_id')
      .eq('player_id', playerId)
      .maybeSingle()
    if (error) throw error

    // Sin vínculo: limpiar un posible usuario huérfano con el email interno
    const userId = account?.user_id as string | undefined
      ?? (await findAuthUserByEmail(service, playerEmail(playerId)))?.id

    if (!userId) return jsonError(404, 'Este jugador no tiene cuenta registrada')

    const { error: delError } = await service.auth.admin.deleteUser(userId)
    if (delError) throw delError

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[players/release] failed:', err instanceof Error ? err.message : 'unknown')
    return jsonError(500, 'No se pudo liberar la cuenta. Inténtalo de nuevo.')
  }
}
