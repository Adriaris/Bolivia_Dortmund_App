'use client'

import { useEffect, useState } from 'react'
import { computeElapsedSeconds, formatTime } from '@/lib/clock'
import type { Match } from '@/lib/types'

interface ClockProps {
  match: Match
}

const periodLabel: Record<string, string> = {
  first_half:  '1ª Parte',
  second_half: '2ª Parte',
}

function hasRealClockData(match: Match): boolean {
  // Solo tiene datos reales si el reloj corre o si se acumularon segundos
  return (
    match.is_clock_running ||
    match.first_half_elapsed_seconds > 0 ||
    match.second_half_elapsed_seconds > 0
  )
}

export default function Clock({ match }: ClockProps) {
  const [elapsed, setElapsed] = useState(() =>
    computeElapsedSeconds(match, match.current_period)
  )

  useEffect(() => {
    setElapsed(computeElapsedSeconds(match, match.current_period))
  }, [match])

  useEffect(() => {
    if (!match.is_clock_running) return
    const interval = setInterval(() => {
      setElapsed(computeElapsedSeconds(match, match.current_period))
    }, 1000)
    return () => clearInterval(interval)
  }, [match])

  // Partido finalizado o ganado por incomparecencia: no mostrar cronómetro
  if (match.status === 'finished' || match.status === 'walkover') {
    return null
  }

  return (
    <div className="flex flex-col items-center py-4">
      {/* Amarillo mientras corre el reloj; blanco en pausa o por empezar */}
      <span className={`text-6xl font-black tabular-nums tracking-tight ${match.is_clock_running ? 'text-bol-yellow' : 'text-white'}`}>
        {formatTime(elapsed)}
      </span>
      <span className="text-xs text-zinc-500 mt-2 font-medium uppercase tracking-widest">
        {periodLabel[match.current_period] ?? ''}
        {!match.is_clock_running && match.status !== 'pending'
          ? ' · Pausado'
          : ''}
      </span>
    </div>
  )
}
