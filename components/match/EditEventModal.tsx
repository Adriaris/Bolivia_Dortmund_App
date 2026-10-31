'use client'

import { useState } from 'react'
import { Trash2, UserX } from 'lucide-react'
import { GiSoccerBall, GiRunningShoe, GiGoalKeeper } from 'react-icons/gi'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
import type { GoalType, Period, MatchEventWithPlayers, Player } from '@/lib/types'

interface EditEventModalProps {
  event: MatchEventWithPlayers
  players: Player[]
  onSave: (updates: {
    scorer_player_id: string | null
    assist_player_id: string | null
    goal_type: GoalType | null
    minute: number | null
    period: Period
  }) => void
  onDelete: () => void
  onClose: () => void
  loading: boolean
}

const goalTypes: { key: GoalType; label: string; icon: React.ReactNode }[] = [
  { key: 'normal',    label: 'Normal',     icon: <GiSoccerBall size={16} /> },
  { key: 'free_kick', label: 'Tiro libre', icon: <GiRunningShoe size={16} /> },
  { key: 'penalty',   label: 'Penalti',    icon: <GiGoalKeeper size={16} /> },
]

const periods: { key: Period; label: string }[] = [
  { key: 'first_half',  label: '1ª Parte' },
  { key: 'second_half', label: '2ª Parte' },
]

function PlayerList({
  players,
  selectedId,
  onSelect,
  allowNull,
  nullLabel,
}: {
  players: Player[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  allowNull?: boolean
  nullLabel?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 mb-5 max-h-44 overflow-y-auto overflow-x-hidden overscroll-contain">
      {allowNull && (
        <button
          onClick={() => onSelect(null)}
          className={[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors',
            selectedId === null ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-400 hover:bg-[#2a2a2a]',
          ].join(' ')}
        >
          <UserX size={14} className="shrink-0" />
          {nullLabel ?? 'Ninguno'}
        </button>
      )}
      {players.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors',
            selectedId === p.id ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a]',
          ].join(' ')}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${selectedId === p.id ? 'bg-black/20' : 'bg-[#2a2a2a] text-zinc-400'}`}>
            {p.number}
          </span>
          <span className="flex-1 font-medium truncate">{p.name}</span>
          {p.is_captain && <CaptainBadge inverted={selectedId === p.id} />}
        </button>
      ))}
    </div>
  )
}

export default function EditEventModal({
  event,
  players,
  onSave,
  onDelete,
  onClose,
  loading,
}: EditEventModalProps) {
  const isSave = event.event_type === 'save'
  const isOurs = event.team_side === 'ours'

  const [scorerId, setScorerId] = useState<string | null>(event.scorer_player_id)
  const [assistId, setAssistId] = useState<string | null>(event.assist_player_id)
  const [goalType, setGoalType] = useState<GoalType>(event.goal_type ?? 'normal')
  const [minute, setMinute] = useState<number | null>(event.minute)
  const [period, setPeriod] = useState<Period>(event.period)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    onSave({
      scorer_player_id: scorerId,
      assist_player_id: isSave ? null : assistId,
      goal_type: isSave ? null : goalType,
      minute,
      period,
    })
  }

  if (confirmDelete) {
    return (
      <Modal title="Eliminar evento" onClose={onClose}>
        <p className="text-zinc-300 text-sm mb-6">
          {isSave
            ? '¿Seguro que quieres eliminar esta parada?'
            : '¿Seguro que quieres eliminar este gol? El marcador se actualizará automáticamente.'}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setConfirmDelete(false)} variant="secondary" fullWidth>
            Cancelar
          </Button>
          <Button onClick={onDelete} variant="danger" fullWidth disabled={loading}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={isSave ? 'Editar parada' : 'Editar gol'} onClose={onClose}>

      {/* Minuto + Parte */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Minuto</p>
          <input
            type="number"
            min={0}
            max={120}
            value={minute ?? ''}
            onChange={(e) => setMinute(e.target.value === '' ? null : Number(e.target.value))}
            placeholder="—"
            className="w-full px-3 py-2.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-center text-lg font-black focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Parte</p>
          <div className="flex flex-col gap-1.5">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={[
                  'px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                  period === key ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-400 hover:bg-[#2a2a2a]',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isSave ? (
        /* ── Parada: solo portero ── */
        <>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Portero</p>
          <PlayerList
            players={players}
            selectedId={scorerId}
            onSelect={setScorerId}
            allowNull
            nullLabel="Desconocido"
          />
        </>
      ) : (
        /* ── Gol ── */
        <>
          {/* Tipo de gol */}
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Tipo de gol</p>
          <div className="flex gap-2 mb-5">
            {goalTypes.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setGoalType(key)}
                className={[
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-colors',
                  goalType === key ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-400 hover:bg-[#2a2a2a]',
                ].join(' ')}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {isOurs && (
            <>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Goleador</p>
              <PlayerList
                players={players}
                selectedId={scorerId}
                onSelect={(id) => { setScorerId(id); if (id === assistId) setAssistId(null) }}
                allowNull
                nullLabel="Desconocido"
              />

              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Asistencia</p>
              <PlayerList
                players={players.filter((p) => p.id !== scorerId)}
                selectedId={assistId}
                onSelect={setAssistId}
                allowNull
                nullLabel="Sin asistencia"
              />
            </>
          )}
        </>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 text-sm font-semibold hover:bg-red-900/40 transition-colors"
        >
          <Trash2 size={15} />
          Eliminar
        </button>
        <Button onClick={handleSave} variant="primary" fullWidth disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </Modal>
  )
}
