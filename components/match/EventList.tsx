import { Pencil } from 'lucide-react'
import { GiSoccerBall, GiGoalKeeper } from 'react-icons/gi'
import { LuCornerUpRight } from 'react-icons/lu'
import type { MatchEventWithPlayers, Player } from '@/lib/types'

const displayName = (p: Player) => p.alias ?? p.name

interface EventListProps {
  events: MatchEventWithPlayers[]
  onEditEvent?: (event: MatchEventWithPlayers) => void
}

const goalTypeLabel: Record<string, string> = {
  normal:    '',
  free_kick: 'Tiro libre',
  penalty:   'Penalti',
}

const periodLabel: Record<string, string> = {
  first_half:  '1ª',
  second_half: '2ª',
}

const periodOrder: Record<string, number> = {
  first_half:  0,
  second_half: 1,
}

function sortEvents(events: MatchEventWithPlayers[]) {
  return [...events].sort((a, b) => {
    const periodDiff = (periodOrder[a.period] ?? 99) - (periodOrder[b.period] ?? 99)
    if (periodDiff !== 0) return periodDiff
    return (a.minute ?? 0) - (b.minute ?? 0)
  })
}

export default function EventList({ events, onEditEvent }: EventListProps) {
  const sorted = sortEvents(events)

  if (events.length === 0) {
    return (
      <p className="text-center text-zinc-600 text-sm py-8">
        Sin eventos registrados
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((event) => {
        const isOurs = event.team_side === 'ours'
        const isSave = event.event_type === 'save'
        const typeLabel = event.goal_type ? goalTypeLabel[event.goal_type] : ''

        return (
          <li
            key={event.id}
            className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
              isSave
                ? 'bg-[#0a1520] border-cyan-900/40'
                : isOurs
                  ? 'bg-[#141414] border-[#2a2a2a]'
                  : 'bg-[#1a0808] border-red-900/30'
            }`}
          >
            {/* Icono + subtipo */}
            <div className="flex flex-col items-center shrink-0 gap-0.5">
              {isSave ? (
                <>
                  <GiGoalKeeper className="w-6 h-6 text-cyan-400" />
                  <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-cyan-600">
                    Parada
                  </span>
                </>
              ) : (
                <>
                  <GiSoccerBall className={`w-6 h-6 ${isOurs ? 'text-white' : 'text-red-500'}`} />
                  {typeLabel ? (
                    <span className={`text-[9px] font-bold uppercase leading-none tracking-wide ${
                      event.goal_type === 'penalty' ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      {typeLabel}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent select-none leading-none">·</span>
                  )}
                </>
              )}
            </div>

            {/* Contenido central */}
            <div className="flex-1 min-w-0">
              {isSave ? (
                <div className="flex items-center gap-2">
                  {event.scorer && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-black bg-cyan-900/60 text-cyan-300 shrink-0">
                      {event.scorer.number}
                    </span>
                  )}
                  <span className="font-bold text-cyan-200 text-sm truncate">
                    {event.scorer ? displayName(event.scorer) : 'Portero'}
                  </span>
                </div>
              ) : isOurs ? (
                <>
                  <div className="flex items-center gap-2">
                    {event.scorer && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-black bg-white text-black shrink-0">
                        {event.scorer.number}
                      </span>
                    )}
                    <span className="font-bold text-white text-sm truncate">
                      {event.scorer ? displayName(event.scorer) : 'Desconocido'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {event.assist ? (
                      <>
                        <LuCornerUpRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-black bg-white/10 text-zinc-300 shrink-0">
                          {event.assist.number}
                        </span>
                        <span className="text-xs text-zinc-500 truncate">{displayName(event.assist)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-transparent select-none leading-none">·</span>
                    )}
                  </div>
                </>
              ) : (
                <span className="font-semibold text-red-400 text-sm">Gol rival</span>
              )}
            </div>

            {/* Minuto + período + editar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className={`text-lg font-black tabular-nums leading-none block ${
                  isOurs ? 'text-white' : 'text-red-400'
                }`}>
                  {event.minute != null ? `${event.minute}'` : '—'}
                </span>
                {event.minute != null && (
                  <span className="text-xs text-zinc-600 font-medium">
                    {periodLabel[event.period]}
                  </span>
                )}
              </div>
              {onEditEvent && (
                <button
                  onClick={() => onEditEvent(event)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-700 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <Pencil size={10} />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
