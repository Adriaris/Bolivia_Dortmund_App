import { Star } from 'lucide-react'
import { displayName, type MatchMvpWithPlayer } from '@/lib/supabase/mvp'

interface MvpBadgeProps {
  mvps: MatchMvpWithPlayer[] | undefined
  className?: string
}

/** "MVP · Nombre" compacto para tarjetas de partido. Sin MVP → nada. */
export default function MvpBadge({ mvps, className = '' }: MvpBadgeProps) {
  if (!mvps || mvps.length === 0) return null
  const names = mvps.map((m) => displayName(m.player)).join(', ')
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 text-[11px] text-zinc-400 ${className}`}>
      <Star size={10} className="text-bol-yellow fill-bol-yellow shrink-0" />
      <span className="font-bold text-bol-yellow shrink-0">MVP</span>
      <span className="text-zinc-700">·</span>
      <span className="truncate">{names}</span>
    </span>
  )
}
