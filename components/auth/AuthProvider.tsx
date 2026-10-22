'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextValue {
  user: User | null
  // Admin = is_admin() en BD: cuenta legacy con role 'admin' o jugador con players.is_admin
  isAdmin: boolean
  // Jugador vinculado a la sesión (player_accounts), null si no hay o es la cuenta admin legacy
  playerId: string | null
  loading: boolean
  // Recalcula isAdmin/playerId (p. ej. tras registrarse)
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  playerId: null,
  loading: true,
  refresh: async () => {},
})

async function resolveRoles(user: User | null): Promise<{ isAdmin: boolean; playerId: string | null }> {
  if (!user) return { isAdmin: false, playerId: null }
  const [adminRes, accountRes] = await Promise.all([
    supabase.rpc('is_admin'),
    supabase.from('player_accounts').select('player_id').eq('user_id', user.id).maybeSingle(),
  ])
  return {
    isAdmin: adminRes.data === true,
    playerId: (accountRes.data?.player_id as string | undefined) ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback(async (nextUser: User | null) => {
    const roles = await resolveRoles(nextUser)
    setUser(nextUser)
    setIsAdmin(roles.isAdmin)
    setPlayerId(roles.playerId)
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await apply(data.session?.user ?? null)
  }, [apply])

  useEffect(() => {
    // Estado inicial (diferido: no hacer setState síncrono dentro del efecto)
    const initial = setTimeout(() => { void refresh() }, 0)

    // Escuchar cambios (login / logout). Se difiere la consulta para no
    // llamar a Supabase dentro del callback de onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      setTimeout(() => { void apply(session?.user ?? null) }, 0)
    })

    return () => {
      clearTimeout(initial)
      subscription.unsubscribe()
    }
  }, [apply, refresh])

  return (
    <AuthContext.Provider value={{ user, isAdmin, playerId, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
