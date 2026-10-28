'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, ChevronRight, Loader2, Star } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import { useAuth } from '@/components/auth/AuthProvider'
import { getPlayer, getPlayerProfile } from '@/lib/supabase/queries'
import type { Player, PlayerProfileStats, Position } from '@/lib/types'
import type { PlayerRef } from './PlayerProfileProvider'
import PhotoEditModal from './PhotoEditModal'

const positionLabel: Record<Position, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
  CAR: 'Carrilero',
}

/** Nombre en dos líneas tipo cromo: alias (o nombre de pila) grande y el resto debajo. */
function splitName(p: PlayerRef): { main: string; rest: string | null } {
  const full = (p.name ?? '').trim()
  if (p.alias && p.alias.trim() && p.alias.trim() !== full) return { main: p.alias.trim(), rest: full || null }
  const [first, ...others] = full.split(/\s+/)
  return { main: first || 'Jugador', rest: others.length ? others.join(' ') : null }
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

interface PlayerProfileModalProps {
  initial: PlayerRef
  onClose: () => void
}

/** Ficha del jugador: foto, dorsal, nombre, posición y sus números del split. */
export default function PlayerProfileModal({ initial, onClose }: PlayerProfileModalProps) {
  const { isAdmin, playerId } = useAuth()
  const [player, setPlayer] = useState<PlayerRef>(initial)
  const [stats, setStats] = useState<PlayerProfileStats | null>(null)
  const [error, setError] = useState(false)
  const [editPhoto, setEditPhoto] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getPlayer(initial.id), getPlayerProfile(initial.id)])
      .then(([p, s]) => {
        if (!alive) return
        if (p) setPlayer(p)
        setStats(s)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [initial.id])

  const full = player as Player
  const canEditPhoto = isAdmin || playerId === player.id
  const isKeeper = player.position === 'POR'
  const name = player.name ?? player.alias ?? 'Jugador'

  if (editPhoto && player.name) {
    return (
      <PhotoEditModal
        player={full}
        asAdmin={playerId !== player.id}
        onClose={() => setEditPhoto(false)}
        onChanged={(path) => setPlayer({ ...player, photo_path: path })}
      />
    )
  }

  const nameParts = splitName(player)
  const keeperOrSaves = isKeeper || (stats?.saves ?? 0) > 0
  const secondary: string[] = []
  if (stats) {
    secondary.push(`${stats.matches} ${stats.matches === 1 ? 'partido jugado' : 'partidos jugados'}`)
    if (keeperOrSaves) secondary.push(`${stats.saves} ${stats.saves === 1 ? 'parada' : 'paradas'}`)
    if (!keeperOrSaves || stats.goals + stats.assists > 0) {
      const ga = stats.goals + stats.assists
      secondary.push(`${ga} ${ga === 1 ? 'participación de gol' : 'participaciones de gol'}`)
    }
  }
  const tags = [
    player.position ? positionLabel[player.position as Position] ?? player.position : null,
    player.is_captain ? 'Capitán' : null,
    player.is_guest ? 'Invitado' : null,
  ].filter(Boolean)

  const headline: { label: string; value: number | undefined; accent?: boolean }[] = keeperOrSaves && isKeeper
    ? [
        { label: 'Paradas', value: stats?.saves },
        { label: 'Partidos', value: stats?.matches },
        { label: stats?.mvps === 1 ? 'MVP' : 'MVPs', value: stats?.mvps, accent: true },
      ]
    : [
        { label: stats?.goals === 1 ? 'Gol' : 'Goles', value: stats?.goals },
        { label: stats?.assists === 1 ? 'Asistencia' : 'Asistencias', value: stats?.assists },
        { label: stats?.mvps === 1 ? 'MVP' : 'MVPs', value: stats?.mvps, accent: true },
      ]
  // Para el portero, la línea secundaria no repite lo que ya va arriba
  const secondaryLine = isKeeper
    ? secondary.filter((t) => !/parada|partido/.test(t))
    : secondary

  return (
    <Modal title={`Ficha de ${name}`} bare onClose={onClose}>
      {/* Cabecera tipo cromo: dorsal gigante de fondo y franja tricolor */}
      <header className="relative overflow-hidden px-5 pt-9 pb-6 bg-linear-to-b from-[#1f1c06] via-[#161505] to-[#141414]">
        <span aria-hidden className="tricolor-bar absolute inset-x-0 top-0 rounded-none!" />
        {player.number != null && (
          <span
            aria-hidden
            className="absolute -right-3 -bottom-9 text-[9.5rem] leading-none font-black tabular-nums text-bol-yellow/[0.07] select-none pointer-events-none"
          >
            {player.number}
          </span>
        )}

        <div className="relative flex items-end gap-4">
          <div className="relative shrink-0">
            <PlayerAvatar
              player={player.name ? full : undefined}
              fallback="initial"
              className="w-28 h-28 ring-4 ring-[#141414] outline-2 outline-bol-yellow/60"
              fallbackClassName="bg-[#1f1f1f] text-bol-yellow text-5xl font-black"
            />
            {canEditPhoto && player.name && (
              <button
                type="button"
                onClick={() => setEditPhoto(true)}
                aria-label="Cambiar foto"
                className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center border-2 border-[#141414]"
              >
                <Camera size={14} />
              </button>
            )}
          </div>

          <div className="min-w-0 pb-1">
            <h2 className="text-[1.75rem] font-black text-white leading-[1.05] break-words">{nameParts.main}</h2>
            {nameParts.rest && <p className="text-base text-zinc-400 leading-tight mt-0.5">{nameParts.rest}</p>}
            <p className="mt-2 text-sm text-zinc-300">
              {player.number != null && <span className="font-black text-bol-yellow tabular-nums">#{player.number}</span>}
              {tags.length > 0 && <span className="text-zinc-500">{player.number != null ? '  ·  ' : ''}{tags.join(' · ')}</span>}
            </p>
          </div>
        </div>
      </header>

      {/* Números del split: sin cajas, separados por líneas finas */}
      <section className="px-5 pt-1 pb-5">
        <p className="text-sm text-zinc-500 mb-4">
          {stats?.tournament ? `Esta temporada · ${stats.tournament}` : 'Esta temporada'}
        </p>
        {error ? (
          <p className="text-sm text-zinc-500">No se pudieron cargar las estadísticas.</p>
        ) : (
          <>
            <div className="flex divide-x divide-[#262626]">
              {headline.map((h) => (
                <div key={h.label} className="flex-1 text-center">
                  <p
                    className={`text-[2.75rem] leading-none font-black tabular-nums ${
                      h.accent && (h.value ?? 0) > 0 ? 'text-bol-yellow' : 'text-white'
                    } ${h.value === undefined ? 'animate-pulse text-zinc-700' : ''}`}
                  >
                    {h.value ?? '–'}
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">{h.label}</p>
                </div>
              ))}
            </div>
            {secondaryLine.length > 0 && (
              <p className="mt-5 text-sm text-zinc-400 text-center">{secondaryLine.join('  ·  ')}</p>
            )}
            {!stats && (
              <div className="mt-5 flex justify-center">
                <Loader2 size={16} className="animate-spin text-zinc-600" />
              </div>
            )}
          </>
        )}
      </section>

      {/* Partidos en los que fue MVP */}
      {stats && stats.mvp_matches.length > 0 && (
        <section className="px-5 pb-6">
          <h3 className="text-sm font-semibold text-white mb-1">
            {stats.mvp_matches.length === 1 ? 'Su partido como MVP' : 'Sus partidos como MVP'}
          </h3>
          <ul>
            {stats.mvp_matches.map((m) => (
              <li key={m.match_id} className="border-b border-[#222] last:border-0">
                <Link
                  href={`/convocatoria/${m.match_id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 py-3 text-[15px] text-zinc-200 hover:text-white"
                >
                  <Star size={16} className="text-bol-yellow fill-bol-yellow shrink-0" />
                  <span className="flex-1 truncate">vs {m.opponent}</span>
                  <span className="text-sm text-zinc-500 tabular-nums">{formatDate(m.date)}</span>
                  <ChevronRight size={15} className="text-zinc-600" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </Modal>
  )
}
