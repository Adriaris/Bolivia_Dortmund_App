'use client'

import { useState } from 'react'
import { GiSoccerBall, GiGoalKeeper, GiTrophyCup } from 'react-icons/gi'
import { LuCornerUpRight } from 'react-icons/lu'
import { filterPlayerStats } from '@/lib/stats'
import PlayerStatsTable from '@/components/stats/PlayerStatsTable'
import StatsPodium from '@/components/stats/StatsPodium'
import type { PlayerStats, StatMode } from '@/lib/types'

type Tab = StatMode

function GAIcon() {
  return (
    <span className="flex items-center gap-0.5">
      <GiSoccerBall size={13} />
      <span className="text-[10px] font-black leading-none">/</span>
      <LuCornerUpRight size={12} />
    </span>
  )
}

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'goals',          label: 'Goles',       icon: <GiSoccerBall size={18} /> },
  { key: 'assists',        label: 'Asistencias', icon: <LuCornerUpRight size={18} /> },
  { key: 'participations', label: 'G/A',         icon: <GAIcon /> },
  { key: 'saves',          label: 'Paradas',     icon: <GiGoalKeeper size={20} /> },
  { key: 'mvps',           label: 'MVP',         icon: <GiTrophyCup size={18} /> },
]

// Tabs de estadísticas del archivo: recibe las stats ya calculadas en el servidor
export default function ArchiveStatsTabs({ stats }: { stats: PlayerStats[] }) {
  const [tab, setTab] = useState<Tab>('goals')

  const { topScorers, topAssists, topParticipations, topSaves, topMvps } = filterPlayerStats(stats)
  const tableData =
    tab === 'goals' ? topScorers
    : tab === 'assists' ? topAssists
    : tab === 'saves' ? topSaves
    : tab === 'mvps' ? topMvps
    : topParticipations

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-1">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((t) => {
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                title={t.key === 'participations' ? 'Goles + Asistencias' : t.label}
                className={[
                  'flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-semibold tracking-wide transition-colors',
                  isActive
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-zinc-100',
                ].join(' ')}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div key={tab} className="stats-content">
        <StatsPodium stats={tableData} mode={tab} />
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 py-2">
          <PlayerStatsTable stats={tableData} mode={tab} />
        </div>
      </div>
    </div>
  )
}
