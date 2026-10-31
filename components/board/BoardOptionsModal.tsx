'use client'

import { Eraser, RotateCcw, Sparkles, UserX } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { FORMATION_KEYS, type BoardSide, type BoardState, type FormationKey } from '@/lib/board'

interface BoardOptionsModalProps {
  board: BoardState
  playersCount: number
  onFormation: (side: BoardSide, formation: FormationKey) => void
  onToggle: (key: 'showRival' | 'showNames', value: boolean) => void
  onAutoFill: () => void
  onClearPlayers: () => void
  onResetPositions: () => void
  onResetAll: () => void
  onClose: () => void
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2.5 text-left touch-manipulation"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-[11px] text-zinc-500">{hint}</span>
      </span>
      <span
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-bol-yellow' : 'bg-[#2a2a2a]'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-black shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  )
}

export default function BoardOptionsModal({
  board, playersCount, onFormation, onToggle, onAutoFill, onClearPlayers, onResetPositions, onResetAll, onClose,
}: BoardOptionsModalProps) {
  const assignedCount = board.tokens.filter((t) => t.side === 'ours' && t.playerId).length

  const formationRow = (side: BoardSide, label: string) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {FORMATION_KEYS.map((f) => {
          const active = board.formation[side] === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => onFormation(side, f)}
              aria-pressed={active}
              className={[
                'py-2 rounded-lg text-sm font-bold tabular-nums transition-colors touch-manipulation',
                active
                  ? side === 'ours' ? 'bg-bol-yellow text-black' : 'bg-white text-black'
                  : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {f}
            </button>
          )
        })}
      </div>
    </div>
  )

  const action = (icon: React.ReactNode, label: string, onClick: () => void, disabled = false, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors touch-manipulation disabled:opacity-40',
        danger ? 'bg-red-950/30 text-red-300 hover:bg-red-950/50' : 'bg-[#1f1f1f] text-zinc-200 hover:text-white',
      ].join(' ')}
    >
      <span className="w-6 flex justify-center text-zinc-400">{icon}</span>
      {label}
    </button>
  )

  return (
    <Modal title="Opciones de la pizarra" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Formación</p>
          {formationRow('ours', 'Bolivia Dortmund')}
          {formationRow('rival', 'Rival')}
        </section>

        <section>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Vista</p>
          <div className="divide-y divide-[#1f1f1f]">
            <Toggle
              checked={board.options.showRival}
              onChange={(v) => onToggle('showRival', v)}
              label="Mostrar al rival"
              hint="Ocúltalo para hablar solo de nuestra alineación"
            />
            <Toggle
              checked={board.options.showNames}
              onChange={(v) => onToggle('showNames', v)}
              label="Nombres bajo las fichas"
              hint="Solo en las fichas con jugador asignado"
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Jugadores</p>
          {action(<Sparkles size={16} />, 'Colocar la plantilla automáticamente', onAutoFill, playersCount === 0)}
          {action(<UserX size={16} />, 'Quitar los jugadores de las fichas', onClearPlayers, assignedCount === 0)}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Posiciones</p>
          {action(<RotateCcw size={16} />, 'Recolocar fichas y balón', onResetPositions)}
          {action(<Eraser size={16} />, 'Empezar de cero', onResetAll, false, true)}
        </section>

        <p className="text-[11px] text-zinc-600 text-center leading-snug pb-1">
          Arrastra las fichas y el balón. Toca una ficha tricolor para elegir qué jugador es.
        </p>
      </div>
    </Modal>
  )
}
