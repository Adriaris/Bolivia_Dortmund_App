'use client'

import { useState } from 'react'
import { TEAM_LOGOS } from '@/lib/teams'
import type { Standing } from '@/lib/types'
import TeamResults from './TeamResults'

const COLS = 'grid-cols-[1.5rem_2rem_1fr_2.5rem_2rem_2rem_2rem_2rem_2.5rem]'

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function getLocalLogo(team: string): string | null {
  const normalize = (s: string) => decodeHtmlEntities(s).toLowerCase().trim()
  const entry = Object.entries(TEAM_LOGOS).find(
    ([key]) => normalize(key) === normalize(team)
  )
  return entry ? entry[1] : null
}

// Logo local si existe; si no, el escudo scrapeado de la liga vía proxy
function resolveLogo(team: string, remoteUrl: string | null): string | null {
  const local = getLocalLogo(team)
  if (local) return local
  if (remoteUrl) return `/api/proxy-image?url=${encodeURIComponent(remoteUrl)}`
  return null
}

interface StandingsTableProps {
  standings: Standing[]
  tournamentId?: string
}

export default function StandingsTable({ standings, tournamentId }: StandingsTableProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-[#1f1f1f]">
        {/* Cabecera */}
        <div className={`grid ${COLS} bg-[#0a0a0a] px-3 py-2 border-b border-[#1f1f1f]`}>
          {['#', '', 'Equipo', 'PTS', 'J', 'G', 'E', 'P', 'DG'].map((h, i) => (
            <span
              key={i}
              className={`text-[10px] font-bold uppercase tracking-widest text-zinc-600 ${i > 2 ? 'text-center' : ''}`}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Filas */}
        {standings.map((s, idx) => {
          const logo = resolveLogo(s.team, s.logo_url)
          return (
            <div
              key={s.id}
              onClick={() => setSelectedTeam(s.team)}
              className={`grid ${COLS} px-3 py-2.5 items-center cursor-pointer active:bg-[#181818] transition-colors
                ${idx < standings.length - 1 ? 'border-b border-[#141414]' : ''}
                ${idx % 2 === 0 ? 'bg-[#0d0d0d]' : 'bg-[#0a0a0a]'}
              `}
            >
              <span className="text-xs text-zinc-600 font-mono">{s.pos}</span>

              <div className="w-6 h-6 flex items-center justify-center">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={s.team} width={24} height={24} className="object-contain" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-800" />
                )}
              </div>

              <span className="text-sm font-medium text-white truncate pr-2">{decodeHtmlEntities(s.team)}</span>
              <span className="text-sm font-black text-white text-center">{s.pts}</span>
              <span className="text-xs text-zinc-400 text-center">{s.played}</span>
              <span className="text-xs text-zinc-400 text-center">{s.wins}</span>
              <span className="text-xs text-zinc-400 text-center">{s.draws}</span>
              <span className="text-xs text-zinc-400 text-center">{s.losses}</span>
              <span className={`text-xs font-semibold text-center ${
                s.gd > 0 ? 'text-green-500' : s.gd < 0 ? 'text-red-500' : 'text-zinc-500'
              }`}>
                {s.gd > 0 ? `+${s.gd}` : s.gd}
              </span>
            </div>
          )
        })}
      </div>

      {selectedTeam && (
        <TeamResults
          team={selectedTeam}
          tournamentId={tournamentId}
          logoByTeam={Object.fromEntries(
            standings.map((s) => [s.team, resolveLogo(s.team, s.logo_url)])
          )}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  )
}
