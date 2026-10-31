'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronLeft } from 'lucide-react'
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
      <div className="flex items-center gap-3 pb-3 shrink-0">
        <Link
          href="/jugadores"
          className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Volver a la plantilla"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Pizarra</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Fútbol 7 · prueba alineaciones</p>
        </div>
      </div>
      <TacticsBoard players={players} />
    </main>
  )
}
