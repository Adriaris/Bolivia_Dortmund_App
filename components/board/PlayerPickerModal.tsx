'use client'

import { Check, UserX } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import GuestBadge from '@/components/ui/GuestBadge'
import type { BoardToken } from '@/lib/board'
import type { Player } from '@/lib/types'

interface PlayerPickerModalProps {
  token: BoardToken
  players: Player[]
  /** Fichas nuestras, para saber qué jugadores ya están en el campo */
  tokens: BoardToken[]
  onPick: (playerId: string | null) => void
  onClose: () => void
}

const ROLE_LABEL: Record<BoardToken['role'], string> = {
  POR: 'Portería',
  DEF: 'Defensa',
  MED: 'Medio',
  DEL: 'Delantero',
}

export default function PlayerPickerModal({ token, players, tokens, onPick, onClose }: PlayerPickerModalProps) {
  const onField = new Map<string, number>()
  for (const t of tokens) if (t.side === 'ours' && t.playerId) onField.set(t.playerId, t.label)

  const squad = players.filter((p) => !p.is_guest)
  const guests = players.filter((p) => p.is_guest)

  const renderRow = (p: Player) => {
    const current = p.id === token.playerId
    const elsewhere = !current ? onField.get(p.id) : undefined
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => onPick(p.id)}
        className={[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors touch-manipulation',
          current ? 'bg-bol-yellow/10 border border-bol-yellow/30' : 'hover:bg-[#1f1f1f] border border-transparent',
        ].join(' ')}
      >
        <PlayerAvatar player={p} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate flex items-center">
            {p.name}
            {p.is_guest && <GuestBadge />}
          </p>
          <p className="text-zinc-600 text-xs">
            <span className="tabular-nums">#{p.number}</span> · {p.position}
            {elsewhere !== undefined && (
              <span className="text-zinc-500"> · en la ficha {elsewhere} (se intercambian)</span>
            )}
          </p>
        </div>
        {current && <Check size={16} className="text-bol-yellow shrink-0" />}
      </button>
    )
  }

  return (
    <Modal title={`Ficha ${token.label} · ${ROLE_LABEL[token.role]}`} onClose={onClose}>
      <div className="flex flex-col gap-1 -mx-1">
        {token.playerId && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-zinc-400 hover:text-white hover:bg-[#1f1f1f] transition-colors touch-manipulation mb-1"
          >
            <span className="w-9 h-9 rounded-full bg-[#1f1f1f] flex items-center justify-center shrink-0">
              <UserX size={16} />
            </span>
            <span className="text-sm font-medium">Dejar la ficha sin jugador</span>
          </button>
        )}
        {squad.map(renderRow)}
        {guests.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 px-3 pt-3 pb-1">Invitados</p>
            {guests.map(renderRow)}
          </>
        )}
        {players.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">No hay jugadores en la plantilla.</p>
        )}
      </div>
    </Modal>
  )
}
