import { Calendar, Clock, MapPin } from 'lucide-react'
import TeamLogo from '@/components/ui/TeamLogo'
import { OUR_TEAM } from '@/lib/teams'
import type { Match } from '@/lib/types'

function formatLongDate(dateStr: string | null): string {
  if (!dateStr) return 'Fecha por confirmar'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Cabecera de la convocatoria: escudos, marcador si se ha jugado, fecha/hora/sede. */
export default function ConvocatoriaHeader({ match, eyebrow }: { match: Match; eyebrow: string }) {
  const showScore = match.status !== 'pending' && match.status !== 'postponed'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 pt-5 pb-4">
      <span aria-hidden className="tricolor-edge" />
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-bol-yellow">{eyebrow}</p>

      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo name={OUR_TEAM} size={56} />
          <span className="w-full text-[11px] text-zinc-400 text-center leading-tight truncate">{OUR_TEAM}</span>
        </div>
        {showScore ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-4xl font-black tabular-nums text-bol-yellow leading-none">{match.our_score}</span>
            <span className="text-lg font-thin text-zinc-700">—</span>
            <span className="text-4xl font-black tabular-nums text-white leading-none">{match.opponent_score}</span>
          </div>
        ) : (
          <span className="text-lg font-black text-zinc-600 shrink-0">vs</span>
        )}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo name={match.opponent_name} size={56} />
          <span className="w-full text-[11px] text-zinc-400 text-center leading-tight truncate">{match.opponent_name}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap mt-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-zinc-300 capitalize">
          <Calendar size={12} className="text-zinc-500" />
          {match.status === 'postponed' ? 'Aplazado · fecha por confirmar' : formatLongDate(match.match_date)}
        </span>
        {match.match_time && match.status !== 'postponed' && (
          <span className="inline-flex items-center gap-1.5 text-zinc-300 font-semibold">
            <Clock size={12} className="text-zinc-500" />
            {match.match_time}h
          </span>
        )}
        {match.match_venue && (
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <MapPin size={12} className="text-zinc-500" />
            {match.match_venue}
          </span>
        )}
      </div>
    </div>
  )
}
