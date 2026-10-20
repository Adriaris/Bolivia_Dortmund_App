import CaptainBadge from '@/components/ui/CaptainBadge'
import type { PlayerStats } from '@/lib/types'

interface PlayerStatsTableProps {
  stats: PlayerStats[]
  mode: 'goals' | 'assists' | 'participations' | 'saves'
}

const config: Record<string, { col: string; accessor: keyof PlayerStats }> = {
  goals:          { col: 'Goles',          accessor: 'goals' },
  assists:        { col: 'Asistencias',    accessor: 'assists' },
  participations: { col: 'Participaciones', accessor: 'participations' },
  saves:          { col: 'Paradas',        accessor: 'saves' },
}

export default function PlayerStatsTable({ stats, mode }: PlayerStatsTableProps) {
  const { col, accessor } = config[mode]
  const filtered = stats.filter((s) => (s[accessor] as number) > 0)

  if (filtered.length === 0) {
    return (
      <p className="text-center text-zinc-600 text-sm py-8">Sin datos aún</p>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#2a2a2a]">
          <th className="text-left py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide w-6">#</th>
          <th className="text-left py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">Jugador</th>
          <th className="text-right py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">{col}</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((s, i) => (
          <tr key={s.player.id} className="border-b border-[#1f1f1f] last:border-0">
            <td className="py-3.5 text-zinc-700 text-xs">{i + 1}</td>
            <td className="py-3.5">
              <span className="font-medium text-white">{s.player.alias ?? s.player.name}</span>
              <span className="ml-2 text-xs text-zinc-600 inline-flex items-center gap-1">
                {s.player.number} · {s.player.position}
                {s.player.is_captain && <CaptainBadge />}
              </span>
            </td>
            <td className="py-3.5 text-right font-black text-white text-lg">
              {s[accessor] as number}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
