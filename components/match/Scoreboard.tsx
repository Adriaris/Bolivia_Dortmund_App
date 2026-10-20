import TeamLogo from '@/components/ui/TeamLogo'
import { OUR_TEAM } from '@/lib/teams'
import type { Match } from '@/lib/types'

interface ScoreboardProps {
  match: Match
}

const statusLabel: Record<string, string> = {
  pending:     'Por empezar',
  first_half:  '1ª Parte',
  half_time:   'Descanso',
  second_half: '2ª Parte',
  finished:    'Finalizado',
  walkover:    'No jugado',
}

// Segunda línea de detalle (más pequeña) para estados que la necesiten
const statusDetail: Record<string, string> = {
  walkover: 'Rival no presentado',
}

const statusDot: Record<string, string> = {
  first_half:  'bg-white animate-pulse',
  second_half: 'bg-white animate-pulse',
  half_time:   'bg-zinc-500',
  pending:     'bg-zinc-600',
  finished:    'bg-zinc-600',
  walkover:    'bg-emerald-500',
}

export default function Scoreboard({ match }: ScoreboardProps) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 py-6">
      {/* Equipos + marcador */}
      <div className="flex items-start justify-between gap-2">
        {/* Nosotros */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo name={OUR_TEAM} size={72} />
          <span className="w-full text-[10px] text-zinc-500 text-center leading-tight wrap-break-word">
            {OUR_TEAM}
          </span>
        </div>

        {/* Marcador central — solo números: nunca ensancha la columna */}
        <div className="flex items-center gap-2 shrink-0 pt-3">
          <span className="text-5xl font-black tabular-nums text-white leading-none">
            {match.our_score}
          </span>
          <span className="text-xl font-thin text-zinc-700">—</span>
          <span className="text-5xl font-black tabular-nums text-white leading-none">
            {match.opponent_score}
          </span>
        </div>

        {/* Rival */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo name={match.opponent_name} size={72} />
          <span className="w-full text-[10px] text-zinc-500 text-center leading-tight wrap-break-word">
            {match.opponent_name}
          </span>
        </div>
      </div>

      {/* Estado — discreto, en dos líneas si hay detalle: los escudos mandan */}
      <div className="flex flex-col items-center gap-0.5 mt-4 px-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[match.status] ?? 'bg-zinc-600'}`} />
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest text-center">
            {statusLabel[match.status] ?? match.status}
          </p>
        </div>
        {statusDetail[match.status] && (
          <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider text-center">
            {statusDetail[match.status]}
          </p>
        )}
      </div>
    </div>
  )
}
