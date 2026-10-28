'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { Player } from '@/lib/types'
import PlayerProfileModal from './PlayerProfileModal'

/** Lo mínimo para abrir la ficha; si falta algo, el modal carga el jugador completo. */
export type PlayerRef = Pick<Player, 'id'> & Partial<Player>

interface PlayerProfileContextValue {
  openPlayer: (player: PlayerRef) => void
}

const PlayerProfileContext = createContext<PlayerProfileContextValue>({ openPlayer: () => {} })

/** Permite abrir la ficha de un jugador desde cualquier pantalla. */
export function PlayerProfileProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerRef | null>(null)
  const openPlayer = useCallback((p: PlayerRef) => setPlayer(p), [])

  return (
    <PlayerProfileContext.Provider value={{ openPlayer }}>
      {children}
      {player && <PlayerProfileModal key={player.id} initial={player} onClose={() => setPlayer(null)} />}
    </PlayerProfileContext.Provider>
  )
}

export function usePlayerProfile() {
  return useContext(PlayerProfileContext)
}
