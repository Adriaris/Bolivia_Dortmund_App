'use client'

import { useEffect, useState } from 'react'
import { GiSoccerBall, GiGoalKeeper, GiTrophyCup } from 'react-icons/gi'
import { LuCornerUpRight } from 'react-icons/lu'
import { getCurrentTournament, getPlayers, getMatches, getMatchEvents } from '@/lib/supabase/queries'
import { computePlayerStats, filterPlayerStats } from '@/lib/stats'
import { getMvpsByMatchIds } from '@/lib/supabase/mvp'
import PlayerStatsTable from '@/components/stats/PlayerStatsTable'
import StatsPodium from '@/components/stats/StatsPodium'
import type { PlayerStats, StatMode, Tournament } from '@/lib/types'

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
  { key: 'goals',          label: 'Goles',      icon: <GiSoccerBall size={18} /> },
  { key: 'assists',        label: 'Asistencias', icon: <LuCornerUpRight size={18} /> },
  { key: 'participations', label: 'G/A',         icon: <GAIcon /> },
  { key: 'saves',          label: 'Paradas',     icon: <GiGoalKeeper size={20} /> },
  { key: 'mvps',           label: 'MVP',         icon: <GiTrophyCup size={18} /> },
]

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [tab, setTab] = useState<Tab>('goals')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [players, matches, current] = await Promise.all([
        getPlayers().catch(() => []),
        getMatches().catch(() => []),
        getCurrentTournament().catch(() => null),
      ])
      setTournament(current)
      // Solo los partidos del split en curso — el histórico vive en /temporadas
      const currentMatches = current
        ? matches.filter((m) => m.tournament_id === current.id)
        : matches
      const [eventsArrays, mvpsByMatch] = await Promise.all([
        Promise.all(currentMatches.map((m) => getMatchEvents(m.id).catch(() => []))),
        getMvpsByMatchIds(currentMatches.map((m) => m.id)).catch(() => ({})),
      ])
      setStats(computePlayerStats(players, eventsArrays.flat(), Object.values(mvpsByMatch).flat()))
      setLoading(false)
    }
    load()
  }, [])

  const { topScorers, topAssists, topParticipations, topSaves, topMvps } = filterPlayerStats(stats)
  const tableData =
    tab === 'goals' ? topScorers
    : tab === 'assists' ? topAssists
    : tab === 'saves' ? topSaves
    : tab === 'mvps' ? topMvps
    : topParticipations

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5">
        <h1 className="text-xl font-black text-white tracking-tight leading-tight">Estadísticas</h1>
        <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">
          {tournament ? `${tournament.short_name} · ${tournament.season}` : 'Temporada'}
        </p>
      </div>

      {/* Tabs */}
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

      {/* Contenido */}
      {loading ? (
        <p className="text-center text-zinc-600 text-sm py-16">Cargando...</p>
      ) : (
        <div key={tab} className="stats-content">
          <StatsPodium stats={tableData} mode={tab} />
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 py-2">
            <PlayerStatsTable stats={tableData} mode={tab} />
          </div>
        </div>
      )}
    </main>
  )
}
