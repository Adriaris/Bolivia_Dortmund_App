import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

/**
 * Helpers de autenticación para API routes.
 * El cliente envía su access token en `Authorization: Bearer <token>`
 * (obtenido con `supabase.auth.getSession()`).
 */

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1] : null
}

/** Cliente Supabase que actúa como el usuario de la petición (respeta RLS). */
export function createUserClient(token: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )
}

/** Usuario autenticado de la petición, o null si no hay token válido. */
export async function getRequestUser(
  req: Request
): Promise<{ user: User; client: SupabaseClient } | null> {
  const token = bearerToken(req)
  if (!token) return null
  const client = createUserClient(token)
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return { user: data.user, client }
}

/** Devuelve el usuario si es admin (is_admin() en BD); null en caso contrario. */
export async function requireAdmin(req: Request): Promise<User | null> {
  const auth = await getRequestUser(req)
  if (!auth) return null
  const { data, error } = await auth.client.rpc('is_admin')
  if (error || data !== true) return null
  return auth.user
}
