'use client'

import { Pause, SkipForward } from 'lucide-react'
import { GiWhistle } from 'react-icons/gi'
import { IoPlayOutline } from 'react-icons/io5'
import { MdOutlineSportsScore } from 'react-icons/md'
import Button from '@/components/ui/Button'
import type { Match } from '@/lib/types'

interface MatchControlsProps {
  match: Match
  onStart: () => void
  onPause: () => void
  onSecondHalf: () => void
  onFinish: () => void
  loading: boolean
}

export default function MatchControls({
  match,
  onStart,
  onPause,
  onSecondHalf,
  onFinish,
  loading,
}: MatchControlsProps) {
  const { status, is_clock_running } = match

  if (status === 'postponed') {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-center text-amber-600 text-xs font-semibold uppercase tracking-widest py-1">
          Partido aplazado · sin fecha
        </p>
        <Button onClick={onStart} size="md" variant="secondary" disabled={loading}>
          <GiWhistle size={16} />
          Reprogramar
        </Button>
      </div>
    )
  }

  if (status === 'finished') {
    return (
      <p className="text-center text-zinc-600 text-xs font-semibold uppercase tracking-widest py-2">
        Partido finalizado
      </p>
    )
  }

  if (status === 'walkover') {
    return (
      <p className="text-center text-emerald-600 text-xs font-semibold uppercase tracking-widest py-2">
        Ganado por incomparecencia · Rival no presentado
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {/* Iniciar primera parte */}
      {status === 'pending' && (
        <Button onClick={onStart} size="md" variant="primary" disabled={loading}>
          <GiWhistle size={16} />
          Iniciar
        </Button>
      )}

      {/* Pausar / Reanudar */}
      {(status === 'first_half' || status === 'second_half') && (
        <>
          {is_clock_running ? (
            <Button onClick={onPause} size="md" variant="secondary" disabled={loading}>
              <Pause size={15} />
              Pausar
            </Button>
          ) : (
            <Button onClick={onStart} size="md" variant="primary" disabled={loading}>
              <IoPlayOutline size={16} />
              Reanudar
            </Button>
          )}
        </>
      )}

      {/* Pasar a descanso (desde primera parte) */}
      {status === 'first_half' && (
        <Button onClick={onSecondHalf} size="md" variant="secondary" disabled={loading}>
          <SkipForward size={15} />
          Descanso
        </Button>
      )}

      {/* Iniciar segunda parte (desde descanso) */}
      {status === 'half_time' && (
        <Button onClick={onStart} size="md" variant="primary" disabled={loading}>
          <GiWhistle size={16} />
          2ª Parte
        </Button>
      )}

      {/* Finalizar */}
      {(status === 'first_half' || status === 'second_half' || status === 'half_time') && (
        <Button onClick={onFinish} size="md" variant="danger" disabled={loading}>
          <MdOutlineSportsScore size={18} />
          Finalizar
        </Button>
      )}
    </div>
  )
}
