'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import CelebrationConfetti from '@/components/CelebrationConfetti'
import { displayName, mvpTitle, type MatchMvpWithPlayer, type MvpPlayer } from '@/lib/supabase/mvp'
import type { MvpResult, Player } from '@/lib/types'

interface MvpRevealProps {
  mvps: MatchMvpWithPlayer[]
  /** Recuento por candidato (get_mvp_status con la votación cerrada) */
  results: MvpResult[] | null
  playersById: Record<string, Player>
  numberById: Record<string, number>
  celebrate?: boolean
}

export default function MvpReveal({ mvps, results, playersById, numberById, celebrate = true }: MvpRevealProps) {
  // Las barras arrancan vacías y se rellenan tras el primer frame (sin animación si reduced-motion)
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const playerFor = (id: string): MvpPlayer | null =>
    playersById[id] ?? mvps.find((m) => m.player_id === id)?.player ?? null
  const numberFor = (id: string): number | null =>
    numberById[id] ?? playerFor(id)?.number ?? null

  // Ganadores: match_mvps; si aún no ha llegado, el máximo del recuento
  const ranking = [...(results ?? [])].sort((a, b) => b.votes - a.votes)
  const maxVotes = ranking[0]?.votes ?? 0
  const winners: { id: string; votes: number }[] =
    mvps.length > 0
      ? mvps.map((m) => ({ id: m.player_id, votes: m.votes }))
      : ranking.filter((r) => r.votes === maxVotes && maxVotes > 0).map((r) => ({ id: r.player_id, votes: r.votes }))

  if (winners.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 px-4 rounded-2xl bg-[#141414] border border-[#2a2a2a] text-center">
        <Star size={22} className="text-zinc-600" />
        <p className="text-sm font-bold text-white">Sin MVP</p>
        <p className="text-xs text-zinc-500">Este partido no tiene MVP: no hubo votos.</p>
      </div>
    )
  }

  const shared = winners.length > 1
  const winnerNames = winners.map((w) => displayName(playerFor(w.id))).join(' y ')
  const winnerIds = new Set(winners.map((w) => w.id))

  return (
    <div className="flex flex-col gap-5">
      {celebrate && (
        <CelebrationConfetti
          independent
          title={`¡${mvpTitle(winners.length)}!`}
          subtitle={winnerNames}
        />
      )}

      <div className="relative overflow-hidden rounded-2xl border border-bol-yellow/30 bg-linear-to-b from-[#1d1a05] to-[#141414] px-4 py-6 text-center">
        <span aria-hidden className="tricolor-bar absolute inset-x-0 top-0 rounded-none!" />
        <div className="flex items-center justify-center gap-2">
          <Star size={16} className="text-bol-yellow fill-bol-yellow" />
          <p className="text-xs font-bold uppercase tracking-widest text-bol-yellow">
            {mvpTitle(winners.length)}
          </p>
        </div>
        <div className={`mt-4 flex ${shared ? 'flex-wrap justify-center gap-x-6 gap-y-4' : 'justify-center'}`}>
          {winners.map((w) => {
            const num = numberFor(w.id)
            return (
              <div key={w.id} className="flex flex-col items-center gap-2">
                <span className="w-16 h-16 rounded-full bg-bol-yellow text-black flex items-center justify-center text-2xl font-black tabular-nums shadow-[0_0_30px_rgba(249,227,0,0.25)]">
                  {num ?? '–'}
                </span>
                <p className="text-lg font-black text-white leading-tight">{displayName(playerFor(w.id))}</p>
                <p className="text-xs text-zinc-400 tabular-nums">
                  {/* votes = 0 → MVP cargado a mano (votación hecha fuera de la app) */}
                  {w.votes > 0 ? `${w.votes} ${w.votes === 1 ? 'voto' : 'votos'}` : 'Votación por WhatsApp'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {ranking.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">Recuento</h3>
          <ul className="flex flex-col gap-2 rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 py-3">
            {ranking.map((r, i) => {
              const isWinner = winnerIds.has(r.player_id)
              const width = maxVotes > 0 ? (r.votes / maxVotes) * 100 : 0
              return (
                <li key={r.player_id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs truncate text-zinc-300">
                    <span className="text-zinc-600 tabular-nums mr-1.5">{numberFor(r.player_id) ?? ''}</span>
                    {displayName(playerFor(r.player_id))}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-[#1f1f1f] overflow-hidden">
                    <div
                      className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out ${
                        isWinner ? 'bg-bol-yellow' : 'bg-zinc-600'
                      }`}
                      style={{ width: filled ? `${width}%` : '0%', transitionDelay: `${i * 120}ms` }}
                    />
                  </div>
                  <span className={`w-6 text-right text-sm font-black tabular-nums ${isWinner ? 'text-bol-yellow' : 'text-zinc-400'}`}>
                    {r.votes}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
