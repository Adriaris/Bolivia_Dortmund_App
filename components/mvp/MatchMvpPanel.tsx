'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'
import ConvocatoriaActions from '@/components/attendance/ConvocatoriaActions'
import ShareConvocatoriaButton from '@/components/attendance/ShareConvocatoriaButton'
import { displayName, mvpTitle, getMatchMvps, type MatchMvpWithPlayer } from '@/lib/supabase/mvp'
import type { Match } from '@/lib/types'

interface MatchMvpPanelProps {
  match: Match
  initialMvps: MatchMvpWithPlayer[]
  isAdmin: boolean
}

/**
 * Bloque de convocatoria/MVP en la ficha del partido:
 * antes → enlace a la convocatoria · terminado → votación abierta o MVP confirmado.
 */
export default function MatchMvpPanel({ match, initialMvps, isAdmin }: MatchMvpPanelProps) {
  const [mvps, setMvps] = useState(initialMvps)
  const closedAt = match.mvp_closed_at
  const href = `/convocatoria/${match.id}`

  // La votación se cierra mientras se mira la ficha (realtime del partido) → cargar el MVP
  useEffect(() => {
    if (!closedAt || mvps.length > 0) return
    let active = true
    getMatchMvps(match.id)
      .then((rows) => { if (active) setMvps(rows) })
      .catch(() => {})
    return () => { active = false }
  }, [closedAt, match.id, mvps.length])

  if (match.status === 'pending' || match.status === 'postponed') {
    return <ConvocatoriaActions match={match} />
  }

  if (match.status !== 'finished') return null

  if (!closedAt) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={href}
          className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#1d1a05] border border-bol-yellow/30 hover:border-bol-yellow/60 active:bg-[#262208] transition-colors"
        >
          <Star size={20} className="text-bol-yellow fill-bol-yellow shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Votación MVP</p>
            <p className="text-xs text-zinc-400 mt-0.5">Abierta · los que jugaron votan al mejor (anónimo)</p>
          </div>
          <ChevronRight size={16} className="text-bol-yellow/70 shrink-0" />
        </Link>
        <ShareConvocatoriaButton match={match} />
      </div>
    )
  }

  if (mvps.length > 0) {
    const shared = mvps.length > 1
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors"
      >
        <span className="w-10 h-10 rounded-full bg-bol-yellow/10 flex items-center justify-center shrink-0">
          <Star size={18} className="text-bol-yellow fill-bol-yellow" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-bol-yellow">
            {mvpTitle(mvps.length)}
          </p>
          <p className="text-sm font-bold text-white truncate mt-0.5">
            {mvps.map((m) => displayName(m.player)).join(' y ')}
          </p>
          <p className="text-xs text-zinc-500 tabular-nums">
            {mvps[0].votes > 0
              ? `${mvps[0].votes} ${mvps[0].votes === 1 ? 'voto' : 'votos'}${shared ? ' cada uno' : ''}`
              : 'Votación por WhatsApp'}
          </p>
        </div>
        <ChevronRight size={16} className="text-zinc-600 shrink-0" />
      </Link>
    )
  }

  // Cerrada sin MVP (sin votos o partido anterior a la votación): solo el admin ve el acceso
  if (!isAdmin) return null
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-2xl border border-[#2a2a2a] text-xs font-semibold text-zinc-500 hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2">
        <Star size={13} />
        Votación MVP · cerrada sin MVP
      </span>
      <ChevronRight size={14} />
    </Link>
  )
}
