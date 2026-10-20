import Link from 'next/link'
import { ChevronRight, TableProperties, Trophy } from 'lucide-react'
import { getMatches, getTournaments, getStandings, getUpcomingMatches } from '@/lib/supabase/queries'
import MatchCard from '@/components/matches/MatchCard'
import NextMatchCard from '@/components/matches/NextMatchCard'
import HomeHeader from '@/components/auth/HomeHeader'
import HomeRealtimeUpdater from '@/components/HomeRealtimeUpdater'
import CelebrationConfetti from '@/components/CelebrationConfetti'
import { OUR_STANDINGS_TEAM } from '@/lib/teams'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [matches, upcoming, tournaments, standings] = await Promise.all([
    getMatches().catch(() => []),
    getUpcomingMatches().catch(() => []),
    getTournaments().catch(() => []),
    getStandings().catch(() => []),
  ])

  const currentTournament = tournaments.find((t) => t.is_current) ?? tournaments[0] ?? null
  const pastTournaments = tournaments.filter((t) => t.id !== currentTournament?.id)

  const ourStanding = currentTournament
    ? standings.find(
        (s) =>
          s.tournament_id === currentTournament.id &&
          s.team.toLowerCase() === OUR_STANDINGS_TEAM.toLowerCase()
      )
    : undefined
  // Campeones de liga: primeros en la clasificación del split en curso
  const isChampion = ourStanding?.pos === 1
  const championSubtitle = currentTournament
    ? `Bolivia Dortmund · ${currentTournament.short_name} ${currentTournament.season}`
    : 'Bolivia Dortmund'

  const live = matches.filter(
    (m) => m.status === 'first_half' || m.status === 'half_time' || m.status === 'second_half'
  )
  // 'finished' + 'walkover' (ganados por incomparecencia) cuentan como partidos jugados
  const finished = matches.filter((m) => m.status === 'finished' || m.status === 'walkover')
  const today = new Date().toISOString().slice(0, 10)
  const nextMatch = upcoming.find((m) => m.status === 'pending' && m.match_date && m.match_date >= today) ?? null

  const currentMatches = currentTournament
    ? finished.filter((m) => m.tournament_id === currentTournament.id)
    : []

  // Stats del split en curso: posición de la liga si disponible, si no los propios
  const ownPts = currentMatches.reduce((s, m) =>
    s + (m.our_score > m.opponent_score ? 3 : m.our_score === m.opponent_score ? 1 : 0), 0)
  const ownGd = currentMatches.reduce((s, m) => s + m.our_score - m.opponent_score, 0)
  const pos  = ourStanding?.pos ?? null
  const sPts = ourStanding?.pts ?? ownPts
  const sPj  = ourStanding?.played ?? currentMatches.length
  const sGd  = ourStanding?.gd ?? ownGd

  // Partidos sin torneo asignado
  const unassigned = finished.filter((m) => !m.tournament_id)

  // Temporadas anteriores: campeón = primero de la clasificación archivada
  const pastSummaries = pastTournaments.map((t) => {
    const table = standings.filter((s) => s.tournament_id === t.id)
    const ours = table.find((s) => s.team.toLowerCase() === OUR_STANDINGS_TEAM.toLowerCase())
    return { tournament: t, champion: ours?.pos === 1, pts: ours?.pts ?? null }
  })

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      <HomeRealtimeUpdater />
      {isChampion && <CelebrationConfetti subtitle={championSubtitle} />}
      {/* Header sticky — .sticky-header en globals.css gestiona top y safe-area padding */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5">
        <HomeHeader season={currentTournament?.season} />
        <div className="tricolor-bar mt-3" />
      </div>

      {/* Próximo partido */}
      {nextMatch && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            Próximo partido
          </h2>
          <NextMatchCard match={nextMatch} />
        </section>
      )}

      {/* Partidos en vivo */}
      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            En vivo
          </h2>
          <div className="flex flex-col gap-2">
            {live.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-8">
        {/* Split en curso */}
        {currentTournament && (
          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-base font-bold uppercase tracking-widest text-zinc-400">
                {currentTournament.short_name}
              </h2>
              <span className="text-sm text-zinc-600 font-medium">{currentTournament.season}</span>
            </div>

            {/* Stats + enlace a clasificación */}
            <Link href="/clasificacion">
              <div className="mb-4 rounded-2xl border border-[#2a2a2a] bg-[#111] overflow-hidden active:opacity-60 transition-opacity">
                <div className="flex items-center">
                  {[
                    {
                      label: 'POS',
                      value: pos !== null ? `${pos}º` : '—',
                      color: pos === 1 ? 'text-amber-400' : 'text-white',
                    },
                    { label: 'PTS', value: sPts, color: 'text-white' },
                    { label: 'PJ',  value: sPj,  color: 'text-zinc-400' },
                    {
                      label: 'DG',
                      value: sGd > 0 ? `+${sGd}` : String(sGd),
                      color: sGd > 0 ? 'text-green-400' : sGd < 0 ? 'text-red-400' : 'text-zinc-500',
                    },
                  ].map(({ label, value, color }, i) => (
                    <div key={label} className={`flex-1 flex flex-col items-center justify-center h-16 ${i > 0 ? 'border-l border-[#2a2a2a]' : ''}`}>
                      <span className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1.5">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#2a2a2a] bg-[#0d0d0d]">
                  <div className="flex items-center gap-2">
                    <TableProperties size={13} className="text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ver tabla de clasificación</span>
                  </div>
                  <ChevronRight size={13} className="text-zinc-600" />
                </div>
              </div>
            </Link>

            {currentMatches.length === 0 ? (
              <p className="text-zinc-700 text-xs text-center py-4">
                Aún no hay partidos registrados este split
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {currentMatches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </section>
        )}

        {/* Temporadas anteriores */}
        {pastSummaries.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Temporadas anteriores
            </h2>
            <div className="flex flex-col gap-2">
              {pastSummaries.map(({ tournament, champion, pts }) => (
                <Link
                  key={tournament.id}
                  href={`/temporadas/${tournament.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    champion ? 'bg-amber-400/10' : 'bg-[#2a2a2a]'
                  }`}>
                    <Trophy size={16} className={champion ? 'text-amber-400' : 'text-zinc-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {tournament.short_name} · {tournament.season}
                    </p>
                    <p className={`text-xs mt-0.5 ${champion ? 'text-amber-400 font-semibold' : 'text-zinc-600'}`}>
                      {champion ? `🏆 Campeones${pts !== null ? ` · ${pts} pts` : ''}` : tournament.name}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-700 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {unassigned.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">
              Sin torneo
            </h2>
            <div className="flex flex-col gap-2">
              {unassigned.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
