import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Helpers compartidos por /api/players/* (no es una ruta: solo route.ts lo es).

export function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status })
}

/** La service role key es imprescindible para crear/borrar usuarios de Auth. */
export function serviceRoleMissing(): NextResponse | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === 'PENDIENTE') {
    return jsonError(
      503,
      'El registro de jugadores no está disponible: falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor. Avisa a un admin.'
    )
  }
  return null
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Busca un usuario de Auth por email (pocos usuarios: basta con paginar). */
export async function findAuthUserByEmail(
  service: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = email.toLowerCase()
  const perPage = 200
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < perPage) return null
  }
  return null
}
