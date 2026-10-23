import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Trophy } from 'lucide-react'
import {
  getMatches,
  getMatchEvents,
  getStandings,
  getTournament,
  getTournamentPlayers,
} from '@/lib/supabase/queries'
import { computePlayerStats } from '@/lib/stats'
import { OUR_STANDINGS_TEAM } from '@/lib/teams'
import MatchCard from '@/components/matches/MatchCard'
import { getMvpsForMatches } from '@/lib/supabase/mvp'
import CaptainBadge from '@/components/ui/CaptainBadge'
import GuestBadge from '@/components/ui/GuestBadge'
import StandingsTable from '@/app/clasificacion/StandingsTable'
import ArchiveStatsTabs from './ArchiveStatsTabs'
import type { Player, Position } from '@/lib/types'

export const dynamic = 'force-dynamic'

const positionLabel: Record<Position, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
  CAR: 'Carrilero',
}

export default async function TemporadaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tournament = await getTournament(id).catch(() => null)
  if (!tournament) notFound()

  const [standings, allMatches, roster] = await Promise.all([
    getStandings(tournament.id).catch(() => []),
    getMatches().catch(() => []),
    getTournamentPlayers(tournament.id).catch(() => []),
  ])

  const matches = allMatches.filter(
    (m) =>
      m.tournament_id === tournament.id &&
      (m.status === 'finished' || m.status === 'walkover')
  )

  // Stats del split con el dorsal/posición que cada jugador tenía entonces
  const playersOfSeason: Player[] = roster.map((tp) => ({
    ...tp.player,
    number: tp.number,
    position: tp.position,
    is_captain: tp.is_captain,
  }))
  const [eventsArrays, mvps] = await Promise.all([
    Promise.all(matches.map((m) => getMatchEvents(m.id).catch(() => []))),
    getMvpsForMatches(matches),
  ])
  const stats = computePlayerStats(playersOfSeason, eventsArrays.flat())

  const ourStanding = standings.find(
    (s) => s.team.toLowerCase() === OUR_STANDINGS_TEAM.toLowerCase()
  )
  const isChampion = ourStanding?.pos === 1

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5 flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-white tracking-tight leading-tight truncate">
            {tournament.short_name} · {tournament.season}
          </h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Temporada archivada</p>
        </div>
        {isChampion && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 shrink-0">
            <Trophy size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">Campeones</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Resumen */}
        {ourStanding && (
          <section>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] overflow-hidden">
              <div className="flex items-center">
                {[
                  {
                    label: 'POS',
                    value: `${ourStanding.pos}º`,
                    color: ourStanding.pos === 1 ? 'text-amber-400' : 'text-white',
                  },
                  { label: 'PTS', value: ourStanding.pts, color: 'text-white' },
                  { label: 'PJ',  value: ourStanding.played, color: 'text-zinc-400' },
                  {
                    label: 'DG',
                    value: ourStanding.gd > 0 ? `+${ourStanding.gd}` : String(ourStanding.gd),
                    color: ourStanding.gd > 0 ? 'text-green-400' : ourStanding.gd < 0 ? 'text-red-400' : 'text-zinc-500',
                  },
                ].map(({ label, value, color }, i) => (
                  <div key={label} className={`flex-1 flex flex-col items-center justify-center h-16 ${i > 0 ? 'border-l border-[#2a2a2a]' : ''}`}>
                    <span className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1.5">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Clasificación final */}
        {standings.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Clasificación final
            </h2>
            <StandingsTable standings={standings} tournamentId={tournament.id} />
          </section>
        )}

        {/* Estadísticas del split */}
        {stats.some((s) => s.goals + s.assists + s.saves > 0) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Estadísticas
            </h2>
            <ArchiveStatsTabs stats={stats} />
          </section>
        )}

        {/* Partidos */}
        {matches.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Partidos ({matches.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matches.map((m) => <MatchCard key={m.id} match={m} mvps={mvps[m.id]} />)}
            </div>
          </section>
        )}

        {/* Plantilla de aquel split */}
        {roster.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Plantilla
            </h2>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              {roster.map((tp, i) => (
                <div
                  key={tp.player_id}
                  className={`flex items-center gap-4 px-4 py-3.5 ${
                    i < roster.length - 1 ? 'border-b border-[#1f1f1f]' : ''
                  }`}
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] text-white font-black text-sm shrink-0">
                    {tp.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tp.player.name}</p>
                    <p className="text-zinc-600 text-xs flex items-center">
                      {positionLabel[tp.position as Position] ?? tp.position}
                      {tp.is_captain && <CaptainBadge />}
                      {tp.player.is_guest && <GuestBadge />}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-zinc-700 uppercase">{tp.position}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
