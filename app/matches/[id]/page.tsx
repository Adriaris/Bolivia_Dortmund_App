import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getMatch, getMatchEvents, getPlayers, getTournaments } from '@/lib/supabase/queries'
import TeamLogo from '@/components/ui/TeamLogo'
import { getMatchMvps } from '@/lib/supabase/mvp'
import LiveMatchClient from './LiveMatchClient'

export const dynamic = 'force-dynamic'

export default async function MatchPage(props: PageProps<'/matches/[id]'>) {
  const { id } = await props.params

  const [match, events, players, tournaments, mvps] = await Promise.all([
    getMatch(id).catch(() => null),
    getMatchEvents(id).catch(() => []),
    getPlayers().catch(() => []),
    getTournaments().catch(() => []),
    getMatchMvps(id).catch(() => []),
  ])

  if (!match) notFound()

  return (
    <main className="safe-top min-h-screen bg-black px-4 py-6 max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>
        <TeamLogo name={match.opponent_name} size={32} />
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white truncate">
            vs {match.opponent_name}
          </h1>
          <p className="text-xs text-zinc-600">
            {match.match_date
              ? new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })
                + (match.match_time ? ` · ${match.match_time}h` : '')
                + (match.match_venue ? ` · ${match.match_venue}` : '')
              : 'Fecha por confirmar'}
          </p>
        </div>
      </div>

      <LiveMatchClient
        initialMatch={match}
        initialEvents={events}
        players={players}
        tournaments={tournaments}
        initialMvps={mvps}
      />
    </main>
  )
}
