'use client'

import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import ShareConvocatoriaButton from './ShareConvocatoriaButton'
import type { Match } from '@/lib/types'

interface ConvocatoriaActionsProps {
  match: Pick<Match, 'id' | 'opponent_name' | 'match_date' | 'match_time' | 'status'>
  /** true → solo se muestra a admins (listas con muchas tarjetas) */
  adminOnly?: boolean
}

/**
 * Fila de acciones bajo una tarjeta de partido: enlace a la convocatoria
 * y, para admins, botón de compartir. Va FUERA del <Link> de la tarjeta.
 */
export default function ConvocatoriaActions({ match, adminOnly = false }: ConvocatoriaActionsProps) {
  const { isAdmin } = useAuth()
  if (adminOnly && !isAdmin) return null

  return (
    <div className="flex items-center gap-2 mt-2">
      <Link
        href={`/convocatoria/${match.id}`}
        className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-300 text-xs font-semibold hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors touch-manipulation"
      >
        <ClipboardCheck size={13} className="text-bol-yellow" />
        {isAdmin ? 'Ver convocatoria' : '¿Vienes? Marca tu asistencia'}
      </Link>
      <ShareConvocatoriaButton match={match} />
    </div>
  )
}
