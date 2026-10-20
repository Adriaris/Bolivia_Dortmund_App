import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentTournament, getStandings } from '@/lib/supabase/queries'
import SyncButton from './SyncButton'
import StandingsTable from './StandingsTable'

export const dynamic = 'force-dynamic'

export default async function ClasificacionPage() {
  const tournament = await getCurrentTournament().catch(() => null)
  const standings = tournament
    ? await getStandings(tournament.id).catch(() => [])
    : []

  const lastSync = standings[0]?.updated_at
    ? new Date(standings[0].updated_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <main className="min-h-screen bg-black px-3 pb-6 max-w-xl mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-3 px-4 pb-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-tight">Clasificación</h1>
            <p className="text-xs text-zinc-600 uppercase tracking-widest">
              {tournament ? `F7 Baix Llobregat ${tournament.season} · ${tournament.short_name}` : 'F7 Baix Llobregat'}
            </p>
          </div>
        </div>
        <SyncButton />
      </div>

      {lastSync && (
        <p className="text-[11px] text-zinc-700 mb-4 text-right px-1">
          Última actualización: {lastSync}
        </p>
      )}

      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-600 text-sm mb-1">Sin datos</p>
          <p className="text-zinc-700 text-xs">Inicia sesión como admin y pulsa &quot;Sincronizar&quot;</p>
        </div>
      ) : (
        <StandingsTable standings={standings} tournamentId={tournament?.id} />
      )}
    </main>
  )
}
