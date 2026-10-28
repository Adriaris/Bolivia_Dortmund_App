'use client'

import { usePlayerProfile, type PlayerRef } from './PlayerProfileProvider'

interface PlayerLinkProps {
  player: PlayerRef | null | undefined
  children: React.ReactNode
  className?: string
}

/**
 * Envuelve un nombre/foto para que al tocarlo se abra la ficha del jugador.
 * No usar dentro de botones o enlaces (selectores de gol, votación, tarjetas).
 */
export default function PlayerLink({ player, children, className = '' }: PlayerLinkProps) {
  const { openPlayer } = usePlayerProfile()
  if (!player?.id) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        openPlayer(player)
      }}
      className={`text-left touch-manipulation hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </button>
  )
}
