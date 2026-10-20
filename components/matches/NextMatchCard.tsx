import Link from 'next/link'
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import TeamLogo from '@/components/ui/TeamLogo'
import type { Match } from '@/lib/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Fecha por confirmar'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function NextMatchCard({ match }: { match: Match }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors"
    >
      <TeamLogo name={match.opponent_name} size={36} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-base truncate">
          vs {match.opponent_name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Calendar size={11} className="text-zinc-500" />
          <span className={`text-xs capitalize ${match.match_date ? 'text-zinc-500' : 'text-zinc-700 italic'}`}>
            {formatDate(match.match_date)}
          </span>
        </div>
        {(match.match_time || match.match_venue) && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {match.match_time && (
              <>
                <Clock size={11} className="text-zinc-500" />
                <span className="text-xs text-zinc-400 font-semibold">{match.match_time}h</span>
              </>
            )}
            {match.match_time && match.match_venue && <span className="text-zinc-700 text-xs">·</span>}
            {match.match_venue && (
              <>
                <MapPin size={11} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">{match.match_venue}</span>
              </>
            )}
          </div>
        )}
      </div>

      <ChevronRight size={14} className="text-zinc-600 shrink-0" />
    </Link>
  )
}
