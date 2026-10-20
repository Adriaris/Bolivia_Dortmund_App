'use client'

import { useState } from 'react'
import { GiBoxingGlove } from 'react-icons/gi'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
import type { Player } from '@/lib/types'

interface SaveModalProps {
  players: Player[]
  onSave: (goalkeeperPlayerId: string | null) => void
  onClose: () => void
  loading: boolean
}

const GOALKEEPER_NUMBER = 11

export default function SaveModal({ players, onSave, onClose, loading }: SaveModalProps) {
  const defaultGoalkeeper = players.find((p) => p.number === GOALKEEPER_NUMBER) ?? null
  const [goalkeeperPlayerId, setGoalkeeperPlayerId] = useState<string | null>(
    defaultGoalkeeper?.id ?? null
  )

  return (
    <Modal title="Parada" onClose={onClose}>
      <div className="flex items-center gap-2 mb-5">
        <GiBoxingGlove className="w-5 h-5 text-cyan-400" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Portero</p>
      </div>

      <div className="flex flex-col gap-2 mb-6 max-h-72 overflow-y-auto">
        {players.map((p) => (
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
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                goalkeeperPlayerId === p.id ? 'bg-black/20' : 'bg-[#2a2a2a] text-zinc-400'
              }`}
            >
              {p.number}
            </span>
            <span className="font-medium flex-1 truncate">{p.name}</span>
            <span className={`text-xs ${goalkeeperPlayerId === p.id ? 'text-black/50' : 'text-zinc-600'}`}>
              {p.position}
            </span>
            {p.is_captain && <CaptainBadge inverted={goalkeeperPlayerId === p.id} />}
            {p.number === GOALKEEPER_NUMBER && (
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
