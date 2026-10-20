'use client'

import { useState } from 'react'
import { GiSoccerBall, GiRunningShoe, GiGoalKeeper } from 'react-icons/gi'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { GoalType } from '@/lib/types'

interface OpponentGoalModalProps {
  opponentName: string
  onSave: (goalType: GoalType) => void
  onClose: () => void
  loading: boolean
}

const goalTypes: { key: GoalType; label: string; icon: React.ReactNode }[] = [
  { key: 'normal',    label: 'Normal',     icon: <GiSoccerBall size={18} /> },
  { key: 'free_kick', label: 'Tiro libre', icon: <GiRunningShoe size={18} /> },
  { key: 'penalty',   label: 'Penalti',    icon: <GiGoalKeeper size={18} /> },
]

export default function OpponentGoalModal({ opponentName, onSave, onClose, loading }: OpponentGoalModalProps) {
  const [goalType, setGoalType] = useState<GoalType>('normal')

  return (
    <Modal title={`Gol de ${opponentName}`} onClose={onClose}>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Tipo de gol</p>
      <div className="flex flex-col gap-2 mb-6">
        {goalTypes.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setGoalType(key)}
            className={[
              'flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-semibold text-sm transition-colors',
              goalType === key
                ? 'bg-red-600 text-white'
                : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#2a2a2a]',
            ].join(' ')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
      <Button onClick={() => onSave(goalType)} fullWidth size="lg" variant="danger" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar gol rival'}
      </Button>
    </Modal>
  )
}
