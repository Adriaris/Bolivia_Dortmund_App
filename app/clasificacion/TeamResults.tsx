'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { LeagueResult } from '@/lib/types'
import { getLeagueResultsByTeam } from '@/lib/supabase/queries'
import { TEAM_LOGOS } from '@/lib/teams'

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

interface TeamResultsProps {
  team: string
  tournamentId?: string
  // Escudos resueltos por la tabla (local o proxy de la liga)
  logoByTeam?: Record<string, string | null>
  onClose: () => void
}

export default function TeamResults({ team, tournamentId, logoByTeam, onClose }: TeamResultsProps) {
  const [results, setResults] = useState<LeagueResult[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLeagueResultsByTeam(team, tournamentId)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [team, tournamentId])

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  // Drag-to-dismiss handlers
  const onTouchStart = (e: React.TouchEvent) => {
    // Only allow drag from top of scroll
    const scrollEl = sheetRef.current?.querySelector('[data-scroll]')
    if (scrollEl && scrollEl.scrollTop > 0) return
    dragStart.current = e.touches[0].clientY
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return
    const dy = e.touches[0].clientY - dragStart.current
    if (dy > 0) {
      setDragY(dy)
    }
  }

  const onTouchEnd = () => {
    if (dragStart.current === null) return
    dragStart.current = null
    if (dragY > 120) {
      close()
    } else {
      setDragY(0)
    }
  }

  // Solo partidos jugados (con marcador)
  const played = results.filter((r) => r.home_score !== null && r.away_score !== null)

  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-300 ${visible && dragY === 0 ? 'bg-black/70' : 'bg-black/0'}`}
      onClick={close}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#111] rounded-t-3xl border-t border-[#222] overflow-hidden transition-transform duration-300 ease-out"
        style={{
          maxHeight: '92vh',
          transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1f1f1f]">
          {(() => {
            const logo = logoByTeam?.[team] ?? getLocalLogo(team)
            return logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={team} width={36} height={36} className="object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-800" />
            )
          })()}
          <h2 className="text-lg font-bold text-white">{decodeHtmlEntities(team)}</h2>
        </div>

        {/* Body */}
        <div data-scroll className="overflow-y-auto px-4 pt-3 pb-28" style={{ maxHeight: 'calc(92vh - 6.5rem)' }}>
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-8">Cargando...</p>
          ) : played.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">
              Sin resultados disponibles.
              <br />
              <span className="text-zinc-700 text-xs">Sincroniza los fixtures desde la liga.</span>
            </p>
          ) : (
            <div className="space-y-2">
              {played.map((r) => {
                const isHome = r.home_team === team
                const opponent = isHome ? r.away_team : r.home_team
                const ourScore = isHome ? r.home_score! : r.away_score!
                const theirScore = isHome ? r.away_score! : r.home_score!
                const won = ourScore > theirScore
                const draw = ourScore === theirScore
                const resultColor = won ? 'text-green-500' : draw ? 'text-yellow-500' : 'text-red-500'
                const resultBg = won ? 'bg-green-500/10' : draw ? 'bg-yellow-500/10' : 'bg-red-500/10'
                const resultLetter = won ? 'V' : draw ? 'E' : 'D'
                const opponentLogo = logoByTeam?.[opponent] ?? getLocalLogo(opponent)

                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]"
                  >
                    {/* Result badge */}
                    <span className={`w-8 h-8 rounded-lg ${resultBg} flex items-center justify-center text-sm font-bold ${resultColor}`}>
                      {resultLetter}
                    </span>

                    {/* Opponent */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {opponentLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opponentLogo} alt={opponent} width={24} height={24} className="object-contain shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0" />
                      )}
                      <span className="text-[15px] text-zinc-300 truncate">{decodeHtmlEntities(opponent)}</span>
                    </div>

                    {/* Score */}
                    <span className="text-[15px] font-bold text-white tabular-nums">
                      {ourScore} - {theirScore}
                    </span>

                    {/* Date */}
                    {r.match_date && (
                      <span className="text-xs text-zinc-600 w-16 text-right shrink-0">
                        {formatDate(r.match_date)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
