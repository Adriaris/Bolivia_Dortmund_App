import { CalendarDays, CalendarX } from 'lucide-react'
import { getUpcomingMatches } from '@/lib/supabase/queries'
import MatchCard from '@/components/matches/MatchCard'
import SyncFixturesButton from './SyncFixturesButton'

export const dynamic = 'force-dynamic'

export default async function ProximosPage() {
  const matches = await getUpcomingMatches().catch(() => [])

  const today = new Date().toISOString().slice(0, 10)
  const postponed = matches.filter((m) => m.status === 'postponed')
  // Partidos pending con fecha pasada se muestran como aplazados
  const pendingPastDate = matches.filter((m) => m.status === 'pending' && m.match_date && m.match_date < today)
  const pending = matches.filter((m) => m.status === 'pending' && (!m.match_date || m.match_date >= today))
  const allPostponed = [...postponed, ...pendingPastDate]

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Próximos partidos</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Calendario</p>
        </div>
        <SyncFixturesButton />
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays size={32} className="text-zinc-700 mb-3" />
          <p className="text-zinc-600 text-sm">No hay partidos programados</p>
          <p className="text-zinc-700 text-xs mt-1">Los partidos se sincronizan automáticamente</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Partidos aplazados (arriba) */}
          {allPostponed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CalendarX size={14} className="text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  Aplazados
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {allPostponed.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}

          {/* Partidos pendientes ordenados por fecha */}
          {pending.length > 0 && (
            <section>
              <div className="flex flex-col gap-2">
                {pending.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
