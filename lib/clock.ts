import type { Match, Period } from './types'

/**
 * Calcula los segundos transcurridos en el periodo actual
 * a partir de los timestamps reales guardados en el partido.
 *
 * Funciona aunque la página se recargue, el móvil se bloquee
 * o el usuario vuelva más tarde.
 */
export function computeElapsedSeconds(match: Match, period: Period): number {
  const base =
    period === 'first_half'
      ? match.first_half_elapsed_seconds
      : match.second_half_elapsed_seconds

  if (!match.is_clock_running || !match.period_started_at) {
    return base
  }

  const startedAt = new Date(match.period_started_at).getTime()
  const now = Date.now()
  const sinceLast = Math.floor((now - startedAt) / 1000)

  return base + sinceLast
}

/**
 * Devuelve el minuto de partido que corresponde mostrar,
 * sumando los segundos de la primera parte si estamos en la segunda.
 */
export function computeMatchMinute(match: Match): number {
  if (match.current_period === 'first_half') {
    return Math.floor(computeElapsedSeconds(match, 'first_half') / 60)
  }

  const firstHalf = match.first_half_elapsed_seconds
  const secondHalf = computeElapsedSeconds(match, 'second_half')
  return Math.floor((firstHalf + secondHalf) / 60)
}

/**
 * Formatea segundos como MM:SS
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Devuelve el tiempo formateado del periodo actual
 */
export function formatCurrentPeriodTime(match: Match): string {
  const elapsed = computeElapsedSeconds(match, match.current_period)
  return formatTime(elapsed)
}
