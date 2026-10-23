'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { OUR_TEAM } from '@/lib/teams'
import { mvpTitle } from '@/lib/supabase/mvp'
import type { Match } from '@/lib/types'

type ShareableMatch = Pick<Match, 'id' | 'opponent_name' | 'match_date' | 'match_time' | 'status'> &
  Partial<Pick<Match, 'our_score' | 'opponent_score'>>

interface ShareConvocatoriaButtonProps {
  match: ShareableMatch
  /** 'chip' = botón compacto bajo una tarjeta · 'block' = botón ancho */
  variant?: 'chip' | 'block'
  className?: string
  /** Votación cerrada: nombres del MVP (o de los MVP si hay empate) → comparte el resultado */
  mvpNames?: string[]
}

function formatShareDate(match: ShareableMatch): string {
  if (!match.match_date) return 'fecha por confirmar'
  const date = new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return match.match_time ? `${date} ${match.match_time}h` : date
}

export function buildShareText(match: ShareableMatch, origin: string, mvpNames?: string[]): string {
  const url = `${origin}/convocatoria/${match.id}`
  if (mvpNames && mvpNames.length > 0) {
    const score =
      match.our_score != null && match.opponent_score != null
        ? ` ${match.our_score}-${match.opponent_score} `
        : ' vs '
    const who =
      mvpNames.length === 1
        ? `${mvpNames[0]}, MVP del partido`
        : `${mvpTitle(mvpNames.length)}: ${mvpNames.slice(0, -1).join(', ')} y ${mvpNames[mvpNames.length - 1]}`
    return `🏆 ${who}\n${OUR_TEAM}${score}${match.opponent_name}\nMira la votación:\n${url}`
  }
  if (match.status === 'finished') {
    return `⭐ ${OUR_TEAM} vs ${match.opponent_name}\nSi jugaste, vota al MVP del partido (es anónimo):\n${url}`
  }
  return `⚽ ${OUR_TEAM} vs ${match.opponent_name} · ${formatShareDate(match)}\n¿Vienes? Marca tu asistencia y después vota al MVP:\n${url}`
}

/** Comparte el enlace de la convocatoria (WhatsApp o menú nativo). Solo admins. */
export default function ShareConvocatoriaButton({
  match,
  variant = 'chip',
  className = '',
  mvpNames,
}: ShareConvocatoriaButtonProps) {
  const { isAdmin } = useAuth()
  const [opened, setOpened] = useState(false)

  if (!isAdmin) return null

  const label =
    mvpNames && mvpNames.length > 0
      ? 'Compartir MVP'
      : match.status === 'finished'
        ? 'Compartir votación MVP'
        : 'Compartir convocatoria'

  const handleShare = async () => {
    const text = buildShareText(match, window.location.origin, mvpNames)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
        return
      } catch (err) {
        // El usuario cerró el menú: no hacer nada
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    setOpened(true)
    setTimeout(() => setOpened(false), 2000)
  }

  const base =
    'inline-flex items-center justify-center gap-2 font-semibold touch-manipulation select-none transition-colors'
  const styles =
    variant === 'block'
      ? 'w-full py-3.5 rounded-2xl bg-bol-green text-white text-sm hover:bg-[#008a3c] active:bg-[#006a2d]'
      : 'px-3.5 py-2.5 rounded-xl bg-[#0d1f14] border border-emerald-900/50 text-emerald-400 text-xs hover:bg-[#12291b] active:bg-[#173322]'

  return (
    <button type="button" onClick={handleShare} className={`${base} ${styles} ${className}`}>
      {opened ? <Check size={variant === 'block' ? 16 : 13} /> : <Share2 size={variant === 'block' ? 16 : 13} />}
      {label}
    </button>
  )
}
