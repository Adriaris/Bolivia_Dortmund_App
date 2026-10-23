import type { Match } from './types'

// Hora de inicio de un partido y cierre de la convocatoria.
// match_date ("YYYY-MM-DD") + match_time ("HH:MM") son hora local de España,
// independientemente de la zona horaria del móvil que abra la página.
// Misma regla que la función SQL match_accepts_attendance().

const TZ = 'Europe/Madrid'

/** Desfase de Madrid respecto a UTC (ms) en un instante dado. */
function madridOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  )
  const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return wallAsUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** Instante de inicio del partido, o null si falta la fecha o la hora. */
export function kickoffAt(date: string | null, time: string | null): Date | null {
  if (!date || !time) return null
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!dm || !tm) return null
  const wallAsUtc = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2])
  let ts = wallAsUtc - madridOffsetMs(new Date(wallAsUtc))
  // Ajuste fino en los días de cambio de hora
  const corrected = wallAsUtc - madridOffsetMs(new Date(ts))
  if (corrected !== ts) ts = corrected
  return new Date(ts)
}

/**
 * ¿Pueden los jugadores cambiar su asistencia?
 * Sí mientras el partido esté pendiente y no haya llegado la hora de inicio
 * (o si está aplazado). Se cierra al empezar el partido en la app o a la hora
 * programada, lo que ocurra antes.
 */
export function attendanceOpen(
  match: Pick<Match, 'status' | 'match_date' | 'match_time'>,
  now: number = Date.now()
): boolean {
  if (match.status === 'postponed') return true
  if (match.status !== 'pending') return false
  const kickoff = kickoffAt(match.match_date, match.match_time)
  return kickoff === null || now < kickoff.getTime()
}
