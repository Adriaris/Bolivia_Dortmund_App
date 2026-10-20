'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function HomeRealtimeUpdater() {
  const router = useRouter()
  // Ref estable para evitar que el efecto se re-ejecute en cada refresh
  const routerRef = useRef(router)

  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel('home_matches_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => { routerRef.current.refresh() }
      )
      .subscribe()

    const handleVisibilityChange = () => {
      if (!document.hidden) routerRef.current.refresh()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // [] — solo se monta/desmonta una vez

  return null
}
