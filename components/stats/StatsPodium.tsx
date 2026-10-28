import PlayerAvatar from '@/components/ui/PlayerAvatar'
import type { PlayerStats, StatMode } from '@/lib/types'
import PlayerLink from '@/components/players/PlayerLink'

interface StatsPodiumProps {
  stats: PlayerStats[]
  mode: StatMode
}

const accessor: Record<string, keyof PlayerStats> = {
  goals: 'goals',
  assists: 'assists',
  participations: 'participations',
  saves: 'saves',
  mvps: 'mvps',
}

const medals = [
  {
    pos: 2,
    order: 'order-1',
    barH: 'h-20',
    avatarBg: 'bg-zinc-700',
    avatarBorder: 'border-zinc-400',
    avatarText: 'text-zinc-300',
    valueColor: 'text-zinc-300',
    barGradient: 'from-zinc-500 to-zinc-700',
    label: '2',
    labelColor: 'text-zinc-300',
    glow: '',
  },
  {
    pos: 1,
    order: 'order-2',
    barH: 'h-32',
    avatarBg: 'bg-amber-950',
    avatarBorder: 'border-amber-400',
    avatarText: 'text-amber-300',
    valueColor: 'text-amber-400',
    barGradient: 'from-amber-400 to-amber-600',
    label: '1',
    labelColor: 'text-amber-900',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.3)]',
  },
  {
    pos: 3,
    order: 'order-3',
    barH: 'h-12',
    avatarBg: 'bg-orange-950',
    avatarBorder: 'border-orange-600',
    avatarText: 'text-orange-400',
    valueColor: 'text-orange-500',
    barGradient: 'from-orange-600 to-orange-800',
    label: '3',
    labelColor: 'text-orange-200',
    glow: '',
  },
]

export default function StatsPodium({ stats, mode }: StatsPodiumProps) {
  const key = accessor[mode]
  const filtered = stats.filter((s) => (s[key] as number) > 0)

  if (filtered.length < 1) return null

  return (
    <div className="flex items-end justify-center gap-2 mb-8 px-2">
      {medals.map(({ pos, order, barH, avatarBg, avatarBorder, avatarText, valueColor, barGradient, label, labelColor, glow }) => {
        const entry = filtered[pos - 1]
        if (!entry) return <div key={pos} className={`flex-1 ${order}`} />

        const value = entry[key] as number
        const alias = entry.player.alias ?? entry.player.name.split(' ')[0]

        return (
          <div key={pos} className={`flex-1 flex flex-col items-center ${order}`}>
            <PlayerLink player={entry.player} className="flex flex-col items-center w-full">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full border-2 ${avatarBorder} mb-1.5 overflow-hidden`}>
              <PlayerAvatar
                player={entry.player}
                fallback="initial"
                className="w-full h-full"
                fallbackClassName={`${avatarBg} text-base font-black ${avatarText}`}
              />
            </div>

            {/* Nombre */}
            <p className="text-sm font-bold text-white text-center leading-tight truncate w-full px-1 mb-2">
              {alias}
            </p>
            </PlayerLink>

            {/* Plataforma con valor dentro */}
            <div className={`w-full ${barH} bg-linear-to-b ${barGradient} rounded-t-xl ${glow} flex items-center justify-center`}>
              <span className={`text-2xl font-black tabular-nums ${labelColor}`}>{value}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
