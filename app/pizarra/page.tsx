'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { getPlayers } from '@/lib/supabase/queries'
import type { Player } from '@/lib/types'

// Sin SSR: la pizarra depende del tamaño de pantalla y del estado guardado en el móvil
const TacticsBoard = dynamic(() => import('@/components/board/TacticsBoard'), {
  ssr: false,
  loading: () => <div className="flex-1" />,
})

/**
 * Pizarra táctica: un campo de F7 para probar alineaciones entre nosotros.
 * No toca la base de datos; solo lee la plantilla para poner nombre a las fichas.
 */
export default function PizarraPage() {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    getPlayers().then(setPlayers).catch(() => setPlayers([]))
  }, [])

  return (
    <main
      className="safe-top bg-black px-4 max-w-lg mx-auto flex flex-col"
      style={{ height: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <TacticsBoard players={players} />
    </main>
  )
}
