import Link from 'next/link'
import { ChevronRight, Radio } from 'lucide-react'
import TeamLogo from '@/components/ui/TeamLogo'
import type { Match } from '@/lib/types'

interface MatchCardProps {
  match: Match
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending:     { label: 'Por empezar',     className: 'text-zinc-500' },
  postponed:   { label: 'Aplazado',        className: 'text-amber-500' },
  first_half:  { label: '1ª · EN VIVO',   className: 'text-red-500' },
  half_time:   { label: 'Descanso',        className: 'text-zinc-400' },
  second_half: { label: '2ª · EN VIVO',   className: 'text-red-500' },
  finished:    { label: 'Finalizado',      className: 'text-zinc-600' },
  walkover:    { label: 'No jugado',       className: 'text-amber-500' },
}

// Indicador de resultado V/E/D — mismo tratamiento para todos los partidos jugados
const resultChip: Record<string, string> = {
  V: 'bg-emerald-500/10 text-emerald-400',
  E: 'bg-zinc-500/10 text-zinc-400',
  D: 'bg-red-500/10 text-red-400',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Fecha por confirmar'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function MatchCard({ match }: MatchCardProps) {
  const badge = statusBadge[match.status] ?? statusBadge.pending
  const isLive = match.status === 'first_half' || match.status === 'second_half'
  const isPostponed = match.status === 'postponed'
  const isPlayed = match.status === 'finished' || match.status === 'walkover'
  const result =
    match.our_score > match.opponent_score ? 'V' : match.our_score === match.opponent_score ? 'E' : 'D'

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors"
    >
      {/* Logo rival */}
      <TeamLogo name={match.opponent_name} size={36} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          vs {match.opponent_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {isLive && <Radio size={10} className="text-red-500 animate-pulse" />}
          <span className={`text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
          {!isPostponed && (
            <>
              <span className="text-zinc-700 text-xs">·</span>
              <span className={`text-xs ${match.match_date ? 'text-zinc-600' : 'text-zinc-700 italic'}`}>
                {formatDate(match.match_date)}
              </span>
              {/* Hora y sede solo en partidos por jugar — en jugados sobra información */}
              {!isPlayed && match.match_time && (
                <>
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className="text-xs text-zinc-500">{match.match_time}h</span>
                </>
              )}
              {!isPlayed && match.match_venue && (
                <>
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className="text-xs text-zinc-500">{match.match_venue}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Marcador (solo si no está aplazado o pendiente) */}
      {match.status !== 'pending' && match.status !== 'postponed' ? (
        <div className="flex items-center gap-2 shrink-0">
          {/* Columna fija: el chip y el marcador quedan alineados entre tarjetas */}
          {isPlayed && (
            <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black ${resultChip[result]}`}>
              {result}
            </span>
          )}
          <span className="min-w-20 text-center text-2xl font-black tabular-nums text-white">
            {match.our_score}
            <span className="text-zinc-700 mx-1 font-thin text-lg">—</span>
            {match.opponent_score}
          </span>
        </div>
      ) : (
        <span className="text-sm font-semibold text-zinc-700 shrink-0">vs</span>
      )}

      <ChevronRight size={14} className="text-zinc-700 shrink-0" />
    </Link>
  )
}
