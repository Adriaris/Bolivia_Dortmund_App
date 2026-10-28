'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, Camera, ChevronRight, Loader2, Star } from 'lucide-react'
import { GiGoalKeeper, GiSoccerBall } from 'react-icons/gi'
import { LuCornerUpRight } from 'react-icons/lu'
import Modal from '@/components/ui/Modal'
import CaptainBadge from '@/components/ui/CaptainBadge'
import GuestBadge from '@/components/ui/GuestBadge'
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

  const statTiles: { label: string; value: number | undefined; icon: React.ReactNode; show: boolean }[] = [
    { label: 'Partidos', value: stats?.matches, icon: <CalendarCheck size={15} />, show: true },
    { label: 'Goles', value: stats?.goals, icon: <GiSoccerBall size={16} />, show: true },
    { label: 'Asistencias', value: stats?.assists, icon: <LuCornerUpRight size={16} />, show: true },
    { label: 'G/A', value: stats ? stats.goals + stats.assists : undefined, icon: <span className="text-[11px] font-black">G+A</span>, show: true },
    { label: 'Paradas', value: stats?.saves, icon: <GiGoalKeeper size={17} />, show: isKeeper || (stats?.saves ?? 0) > 0 },
    { label: 'MVP', value: stats?.mvps, icon: <Star size={15} className="text-bol-yellow fill-bol-yellow" />, show: true },
  ]

  return (
    <Modal title="Ficha del jugador" onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">
        {/* Cabecera */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative">
            <span className="block rounded-full p-1 bg-linear-to-b from-bol-yellow/70 to-bol-yellow/10">
              <PlayerAvatar
                player={player.name ? full : undefined}
                number={player.number}
                className="w-28 h-28"
                fallbackClassName="bg-[#1f1f1f] text-bol-yellow text-4xl font-black"
              />
            </span>
            {canEditPhoto && player.name && (
              <button
                type="button"
                onClick={() => setEditPhoto(true)}
                aria-label="Cambiar foto"
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center border-2 border-[#141414]"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
          <div>
            <p className="text-xl font-black text-white leading-tight">{name}</p>
            <p className="text-sm text-zinc-400 mt-1 flex items-center justify-center">
              {player.number != null && <span className="font-black text-bol-yellow tabular-nums mr-2">#{player.number}</span>}
              {player.position ? positionLabel[player.position as Position] ?? player.position : ''}
              {player.is_captain && <CaptainBadge />}
              {player.is_guest && <GuestBadge />}
            </p>
            {player.alias && player.alias !== player.name && (
              <p className="text-xs text-zinc-600 mt-0.5">«{player.alias}»</p>
            )}
          </div>
        </div>

        {/* Números del split */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">
            {stats?.tournament ?? 'Temporada actual'}
          </p>
          {error ? (
            <p className="text-sm text-zinc-500 px-1">No se pudieron cargar las estadísticas.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {statTiles
                .filter((t) => t.show)
                .map((t) => (
                  <div key={t.label} className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-3 flex flex-col items-center gap-1">
                    <span className="text-zinc-500 h-4 flex items-center">{t.icon}</span>
                    <span className="text-2xl font-black text-white tabular-nums leading-none">
                      {t.value ?? <Loader2 size={18} className="animate-spin text-zinc-600" />}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t.label}</span>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* MVPs */}
        {stats && stats.mvp_matches.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">MVP del partido</p>
            <ul className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden">
              {stats.mvp_matches.map((m) => (
                <li key={m.match_id} className="border-b border-[#222] last:border-0">
                  <Link
                    href={`/convocatoria/${m.match_id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#222]"
                  >
                    <Star size={13} className="text-bol-yellow fill-bol-yellow shrink-0" />
                    <span className="flex-1 truncate">vs {m.opponent}</span>
                    <span className="text-xs text-zinc-600">{formatDate(m.date)}</span>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  )
}
