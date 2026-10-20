'use client'

import { useState } from 'react'
import { ChevronRight, UserX } from 'lucide-react'
import { GiSoccerBall, GiRunningShoe, GiGoalKeeper } from 'react-icons/gi'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
import type { GoalType, Player } from '@/lib/types'

interface OurGoalModalProps {
  players: Player[]
  onSave: (data: { scorerId: string; assistId: string | null; goalType: GoalType }) => void
  onClose: () => void
  loading: boolean
}

type Step = 'scorer' | 'assist' | 'type'

const goalTypes: { key: GoalType; label: string; icon: React.ReactNode }[] = [
  { key: 'normal',    label: 'Normal',     icon: <GiSoccerBall size={18} /> },
  { key: 'free_kick', label: 'Tiro libre', icon: <GiRunningShoe size={18} /> },
  { key: 'penalty',   label: 'Penalti',    icon: <GiGoalKeeper size={18} /> },
]

function PlayerButton({
  player,
  onClick,
}: {
  player: Player
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] active:bg-[#333] transition-colors text-left"
    >
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] text-white font-bold text-xs shrink-0">
        {player.number}
      </span>
      <span className="font-medium text-white flex-1 text-sm">{player.name}</span>
      <span className="text-xs text-zinc-600">{player.position}</span>
      {player.is_captain && <CaptainBadge />}
      <ChevronRight size={14} className="text-zinc-600" />
    </button>
  )
}

export default function OurGoalModal({ players, onSave, onClose, loading }: OurGoalModalProps) {
  const [step, setStep] = useState<Step>('scorer')
  const [scorerId, setScorerId] = useState<string | null>(null)
  const [assistId, setAssistId] = useState<string | null>(null)
  const [goalType, setGoalType] = useState<GoalType>('normal')

  const handleScorerSelect = (id: string) => { setScorerId(id); setStep('assist') }
  const handleAssistSelect = (id: string | null) => { setAssistId(id); setStep('type') }
  const handleSave = () => { if (!scorerId) return; onSave({ scorerId, assistId, goalType }) }

  const assistOptions = players.filter((p) => p.id !== scorerId)

  const stepLabels = ['Goleador', 'Asistencia', 'Tipo']
  const stepIndex = step === 'scorer' ? 0 : step === 'assist' ? 1 : 2

  return (
    <Modal title="Gol nuestro" onClose={onClose}>
      {/* Progreso */}
      <div className="flex gap-1 mb-5">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-0.5 rounded-full mb-1 ${i <= stepIndex ? 'bg-white' : 'bg-zinc-800'}`} />
            <span className={`text-xs ${i === stepIndex ? 'text-white font-semibold' : 'text-zinc-600'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Paso 1: Goleador */}
      {step === 'scorer' && (
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <PlayerButton key={p.id} player={p} onClick={() => handleScorerSelect(p.id)} />
          ))}
        </div>
      )}

      {/* Paso 2: Asistencia */}
      {step === 'assist' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleAssistSelect(null)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] active:bg-[#333] transition-colors text-left"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] shrink-0">
              <UserX size={14} className="text-zinc-500" />
            </span>
            <span className="text-zinc-400 text-sm font-medium flex-1">Sin asistencia</span>
            <ChevronRight size={14} className="text-zinc-600" />
          </button>
          {assistOptions.map((p) => (
            <PlayerButton key={p.id} player={p} onClick={() => handleAssistSelect(p.id)} />
          ))}
        </div>
      )}

      {/* Paso 3: Tipo de gol */}
      {step === 'type' && (
        <div>
          <div className="flex flex-col gap-2 mb-6">
            {goalTypes.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setGoalType(key)}
                className={[
                  'flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-semibold text-sm transition-colors',
                  goalType === key
                    ? 'bg-white text-black'
                    : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a]',
                ].join(' ')}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} fullWidth size="lg" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar gol'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
