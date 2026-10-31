'use client'

import { useState } from 'react'
import { GiBoxingGlove } from 'react-icons/gi'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
import GuestBadge from '@/components/ui/GuestBadge'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import type { Player } from '@/lib/types'

interface SaveModalProps {
  players: Player[]
  /** Portero que ya ha hecho paradas en este partido (el que juega hoy), si lo hay */
  matchGoalkeeperId?: string | null
  onSave: (goalkeeperPlayerId: string | null) => void
  onClose: () => void
  loading: boolean
}

// Portero por defecto: quien ya ha parado en este partido (el que juega hoy de portero);
// si aún no hay paradas, el jugador de la plantilla con posición POR (hoy Pablo, #29).
const isGoalkeeper = (p: Player) => p.position === 'POR'

export default function SaveModal({ players, matchGoalkeeperId, onSave, onClose, loading }: SaveModalProps) {
  const defaultGoalkeeper =
    (matchGoalkeeperId ? players.find((p) => p.id === matchGoalkeeperId) : null) ??
    players.find((p) => isGoalkeeper(p) && !p.is_guest) ??
    players.find(isGoalkeeper) ??
    null
  const [goalkeeperPlayerId, setGoalkeeperPlayerId] = useState<string | null>(
    defaultGoalkeeper?.id ?? null
  )
  // El portero propuesto va el primero para no tener que buscarlo
  const ordered = defaultGoalkeeper
    ? [defaultGoalkeeper, ...players.filter((p) => p.id !== defaultGoalkeeper.id)]
    : players

  return (
    <Modal title="Parada" onClose={onClose}>
      <div className="flex items-center gap-2 mb-5">
        <GiBoxingGlove className="w-5 h-5 text-cyan-400" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Portero</p>
      </div>

      <div className="flex flex-col gap-2 mb-6 max-h-72 overflow-y-auto overflow-x-hidden overscroll-contain">
        {ordered.map((p) => (
          <button
            key={p.id}
            onClick={() => setGoalkeeperPlayerId(p.id)}
            className={[
              'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-sm transition-colors',
              goalkeeperPlayerId === p.id
                ? 'bg-white text-black'
                : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a]',
            ].join(' ')}
          >
            <PlayerAvatar
              player={p}
              className="w-9 h-9"
              fallbackClassName={`text-xs font-bold ${goalkeeperPlayerId === p.id ? 'bg-black/20' : 'bg-[#2a2a2a] text-zinc-400'}`}
            />
            <span className="font-medium flex-1 truncate">{p.name}</span>
            <span className={`text-xs ${goalkeeperPlayerId === p.id ? 'text-black/50' : 'text-zinc-600'}`}>
              {p.position}
            </span>
            {p.is_captain && <CaptainBadge inverted={goalkeeperPlayerId === p.id} />}
            {p.is_guest && <GuestBadge inverted={goalkeeperPlayerId === p.id} />}
            {isGoalkeeper(p) && (
              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                goalkeeperPlayerId === p.id ? 'text-black/60' : 'text-cyan-500'
              }`}>
                POR
              </span>
            )}
          </button>
        ))}
      </div>

      <Button
        onClick={() => onSave(goalkeeperPlayerId)}
        fullWidth
        size="lg"
        variant="primary"
        disabled={loading}
      >
        {loading ? 'Guardando...' : 'Registrar parada'}
      </Button>
    </Modal>
  )
}
