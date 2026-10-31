import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BackLink from '@/components/ui/BackLink'
import { getMatch, getTournamentPlayers } from '@/lib/supabase/queries'
import {
  getAllPlayers,
  getMatchAttendance,
  getMatchMvps,
  getMvpStatus,
  getRegisteredPlayerIds,
} from '@/lib/supabase/mvp'
import { OUR_TEAM } from '@/lib/teams'
import type { RosterEntry } from '@/components/attendance/types'
import ConvocatoriaClient from './ConvocatoriaClient'

export const dynamic = 'force-dynamic'

const loadMatch = cache((id: string) => getMatch(id).catch(() => null))

export async function generateMetadata(props: PageProps<'/convocatoria/[id]'>): Promise<Metadata> {
  const { id } = await props.params
  const match = await loadMatch(id)
  if (!match) return { title: 'Convocatoria · Bolivia Dortmund' }
  const when = match.match_date
    ? new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }) + (match.match_time ? ` · ${match.match_time}h` : '')
    : 'Fecha por confirmar'
  const title = `${OUR_TEAM} vs ${match.opponent_name}`
  const description =
    match.status === 'finished'
      ? 'Votación del MVP del partido'
      : `${when} · ¿Vienes? Marca tu asistencia`
  return { title, description, openGraph: { title, description } }
}

export default async function ConvocatoriaPage(props: PageProps<'/convocatoria/[id]'>) {
  const { id } = await props.params

  const [match, players, attendance, registeredIds, status] = await Promise.all([
    loadMatch(id),
    getAllPlayers().catch(() => []),
    getMatchAttendance(id).catch(() => []),
    getRegisteredPlayerIds().catch(() => []),
    getMvpStatus(id).catch(() => null),
  ])

  if (!match) notFound()

  // Roster activo del torneo del partido (dorsal del split); sin torneo → plantilla activa
  const [tournamentRoster, mvps] = await Promise.all([
    match.tournament_id ? getTournamentPlayers(match.tournament_id).catch(() => []) : Promise.resolve([]),
    match.mvp_closed_at ? getMatchMvps(id).catch(() => []) : Promise.resolve([]),
  ])
  // Plantilla = jugadores activos no invitados (incluye altas a mitad de split);
  // invitados aparte. Dorsal del split si está en la foto del torneo.
  const numberInSplit = new Map(tournamentRoster.map((tp) => [tp.player_id, tp.number]))
  const active = players.filter((p) => p.active)
  const toEntry = (p: (typeof players)[number]): RosterEntry => ({ player: p, number: numberInSplit.get(p.id) ?? p.number })
  const roster: RosterEntry[] = active.filter((p) => !p.is_guest).map(toEntry)
  const guests: RosterEntry[] = active.filter((p) => p.is_guest).map(toEntry)

  return (
    <main className="safe-top min-h-screen bg-black px-4 py-6 max-w-lg mx-auto pb-10">
      <div className="flex items-center gap-3 mb-5">
        <BackLink href="/" label="Volver al inicio" />
        <h1 className="text-xl font-black text-white tracking-tight leading-tight truncate">vs {match.opponent_name}</h1>
      </div>

      <ConvocatoriaClient
        initialMatch={match}
        players={players}
        roster={roster}
        guests={guests}
        initialAttendance={attendance}
        registeredIds={registeredIds}
        initialMvps={mvps}
        initialStatus={status}
      />
    </main>
  )
}
