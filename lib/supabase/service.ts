import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service role key — omite Row Level Security.
 * Usar SOLO en API routes de servidor, nunca en client components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
