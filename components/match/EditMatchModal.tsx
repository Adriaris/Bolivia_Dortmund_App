'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Match, MatchStatus, Tournament } from '@/lib/types'

interface EditMatchModalProps {
  match: Match
  tournaments: Tournament[]
  onSave: (updates: Partial<Match>) => void
  onDelete: () => void
  onClose: () => void
  loading: boolean
}

const statusOptions: { value: MatchStatus; label: string }[] = [
  { value: 'pending',     label: 'Por empezar' },
  { value: 'postponed',   label: 'Aplazado' },
  { value: 'first_half',  label: '1ª Parte' },
  { value: 'half_time',   label: 'Descanso' },
  { value: 'second_half', label: '2ª Parte' },
  { value: 'finished',    label: 'Finalizado' },
  { value: 'walkover',    label: 'Ganado (no presentado)' },
]

export default function EditMatchModal({ match, tournaments, onSave, onDelete, onClose, loading }: EditMatchModalProps) {
  const [opponentName, setOpponentName] = useState(match.opponent_name)
  const [matchDate, setMatchDate] = useState(match.match_date ?? '')
  const [matchTime, setMatchTime] = useState(match.match_time ?? '')
  const [ourScore, setOurScore] = useState(match.our_score)
  const [opponentScore, setOpponentScore] = useState(match.opponent_score)
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [tournamentId, setTournamentId] = useState<string | null>(match.tournament_id)
  const [resetClock, setResetClock] = useState(false)

  const matchHadStarted = match.status !== 'pending' && match.status !== 'postponed'
  const showResetClock = status === 'pending' && matchHadStarted

  // Al marcar "Ganado (no presentado)", pre-rellenar 5-0 (resultado oficial por incomparecencia)
  const handleStatusChange = (value: MatchStatus) => {
    setStatus(value)
    if (value === 'walkover' && ourScore === 0 && opponentScore === 0) {
      setOurScore(5)
      setOpponentScore(0)
    }
  }

  const handleSave = () => {
    const updates: Partial<Match> = {
      opponent_name: opponentName.trim(),
      match_date: matchDate.trim() || null,
      match_time: matchTime.trim() || null,
      our_score: ourScore,
      opponent_score: opponentScore,
      status,
      tournament_id: tournamentId,
    }
    if (showResetClock && resetClock) {
      updates.first_half_elapsed_seconds = 0
      updates.second_half_elapsed_seconds = 0
      updates.is_clock_running = false
      updates.period_started_at = null
      updates.current_period = 'first_half'
    }
    onSave(updates)
  }

  return (
    <Modal title="Editar partido" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Torneo */}
        {tournaments.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Torneo
            </label>
            <div className="flex flex-col gap-1.5">
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTournamentId(t.id)}
                  className={[
                    'flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    tournamentId === t.id
                      ? 'bg-white text-black'
                      : 'bg-[#1f1f1f] text-zinc-400 hover:bg-[#2a2a2a]',
                  ].join(' ')}
                >
                  <span>{t.short_name}</span>
                  <span className={`text-xs ${tournamentId === t.id ? 'text-black/50' : 'text-zinc-600'}`}>{t.season}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rival */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Rival
          </label>
          <input
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Fecha
          </label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Hora */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Hora <span className="text-zinc-700 normal-case font-normal">(opcional)</span>
          </label>
          <input
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Marcador */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Marcador
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-zinc-600 mb-1.5">Nosotros</p>
              <input
                type="number"
                min={0}
                value={ourScore}
                onChange={(e) => setOurScore(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-center text-xl font-black focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            <span className="text-zinc-700 text-xl font-thin pb-1">—</span>
            <div className="flex-1">
              <p className="text-xs text-zinc-600 mb-1.5 truncate">{opponentName || 'Rival'}</p>
              <input
                type="number"
                min={0}
                value={opponentScore}
                onChange={(e) => setOpponentScore(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-center text-xl font-black focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Estado del partido
          </label>
          <div className="flex flex-col gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={[
                  'px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-colors',
                  status === opt.value
                    ? 'bg-white text-black'
                    : 'bg-[#1f1f1f] text-zinc-400 hover:bg-[#2a2a2a]',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reiniciar cronómetro — solo si se vuelve a "Por empezar" desde un estado iniciado */}
        {showResetClock && (
          <button
            type="button"
            onClick={() => setResetClock((v) => !v)}
            className={[
              'flex items-center justify-between w-full px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors',
              resetClock
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[#1f1f1f] border-[#2a2a2a] text-zinc-400 hover:bg-[#2a2a2a]',
            ].join(' ')}
          >
            <span>Reiniciar cronómetro a 0</span>
            <div className={[
              'w-9 h-5 rounded-full transition-colors relative',
              resetClock ? 'bg-amber-500' : 'bg-zinc-700',
            ].join(' ')}>
              <div className={[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                resetClock ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')} />
            </div>
          </button>
        )}

        <Button onClick={handleSave} variant="primary" fullWidth size="lg" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>

        <button
          onClick={() => {
            if (confirm('¿Eliminar este partido y todos sus datos? Esta acción no se puede deshacer.')) {
              onDelete()
            }
          }}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-30"
        >
          Eliminar partido
        </button>
      </div>
    </Modal>
  )
}
