'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClipboardList, Loader2, Plus, UserMinus, UserPlus, X } from 'lucide-react'
import { getPlayers, createPlayer, getCurrentTournament, setPlayerGuest } from '@/lib/supabase/queries'
import { getRegisteredPlayerIds } from '@/lib/auth'
import { safeNextPath } from '@/lib/players'
import { useAuth } from '@/components/auth/AuthProvider'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
import GuestBadge from '@/components/ui/GuestBadge'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import PlayerLink from '@/components/players/PlayerLink'
import { PHOTO_CHANGED_EVENT, type PhotoChangedDetail } from '@/components/players/PhotoEditModal'
import PlayerIdentityBar from '@/components/players/PlayerIdentityBar'
import PlayerAccessModal from '@/components/players/PlayerAccessModal'
import ReleaseAccountModal from '@/components/players/ReleaseAccountModal'
import type { Player, Position } from '@/lib/types'

const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL', 'CAR']

const positionLabel: Record<Position, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
  CAR: 'Carrilero',
}

// useSearchParams exige un límite de Suspense (deep link ?soy=1&next=/convocatoria/<id>)
export default function JugadoresPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <JugadoresContent />
    </Suspense>
  )
}

function JugadoresContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, playerId, loading: authLoading } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAccess, setShowAccess] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<Player | null>(null)

  const wantsAccess = searchParams.get('soy') === '1'
  const nextPath = safeNextPath(searchParams.get('next'))
  const deepLinkHandled = useRef(false)

  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [position, setPosition] = useState<Position>('DEF')
  const [isGuest, setIsGuest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadRegistered = useCallback(async () => {
    const ids = await getRegisteredPlayerIds().catch(() => null)
    if (ids) setRegisteredIds(ids)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [data, tournament] = await Promise.all([
      getPlayers().catch(() => []),
      getCurrentTournament().catch(() => null),
      loadRegistered(),
    ])
    setPlayers(data)
    setCurrentTournamentId(tournament?.id ?? null)
    setLoading(false)
  }, [loadRegistered])

  useEffect(() => { void load() }, [load])

  // Fotos cambiadas desde la ficha del jugador
  useEffect(() => {
    const onPhoto = (e: Event) => {
      const { playerId: id, photoPath } = (e as CustomEvent<PhotoChangedDetail>).detail
      setPlayers((prev) => prev.map((x) => (x.id === id ? { ...x, photo_path: photoPath } : x)))
    }
    window.addEventListener(PHOTO_CHANGED_EVENT, onPhoto)
    return () => window.removeEventListener(PHOTO_CHANGED_EVENT, onPhoto)
  }, [])

  // Deep link: ?soy=1 abre el selector; si ya hay jugador en sesión, ir directo a `next`
  useEffect(() => {
    if (!wantsAccess || authLoading || loading || deepLinkHandled.current) return
    deepLinkHandled.current = true
    if (playerId) {
      if (nextPath) router.replace(nextPath)
      return
    }
    setShowAccess(true)
  }, [wantsAccess, authLoading, loading, playerId, nextPath, router])

  const me = playerId ? players.find((p) => p.id === playerId) ?? null : null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !number) return
    setSaving(true)
    setError(null)
    try {
      // Los de plantilla entran ya en la foto del split; los invitados, cuando juegan
      await createPlayer(
        { number: Number(number), name: name.trim(), position, is_guest: isGuest },
        isGuest ? null : currentTournamentId
      )
      setShowForm(false)
      setNumber('')
      setName('')
      setPosition('DEF')
      setIsGuest(false)
      await load()
    } catch {
      setError('Error al crear el jugador.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleGuest(p: Player) {
    setTogglingId(p.id)
    setError(null)
    try {
      await setPlayerGuest(p.id, !p.is_guest)
      setPlayers((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_guest: !p.is_guest } : x)))
    } catch {
      setError('No se pudo cambiar el tipo de jugador.')
    } finally {
      setTogglingId(null)
    }
  }

  const setPhotoPath = (id: string, photoPath: string | null) =>
    setPlayers((prev) => prev.map((x) => (x.id === id ? { ...x, photo_path: photoPath } : x)))

  const squad = players.filter((p) => !p.is_guest)
  const guests = players.filter((p) => p.is_guest)

  const renderList = (list: Player[]) => (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
      {list.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 px-4 py-3.5 ${i < list.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}
        >
          <PlayerLink player={p} className="flex items-center gap-3 flex-1 min-w-0">
          <PlayerAvatar player={p} className="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{p.name}</p>
            <p className="text-zinc-600 text-xs flex items-center">
              {p.photo_path && <span className="tabular-nums mr-1.5">#{p.number}</span>}
              {positionLabel[p.position as Position] ?? p.position}
              {p.is_captain && <CaptainBadge />}
              {p.is_guest && <GuestBadge />}
            </p>
          </div>
          </PlayerLink>
          {registeredIds.has(p.id) && (
            isAdmin ? (
              <button
                type="button"
                onClick={() => setReleaseTarget(p)}
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border border-[#333] px-2 py-1 rounded-lg hover:text-red-400 hover:border-red-900 transition-colors shrink-0"
                aria-label={`Liberar la cuenta de ${p.name}`}
              >
                Liberar
              </button>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 shrink-0">
                Registrado
              </span>
            )
          )}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => handleToggleGuest(p)}
              disabled={togglingId === p.id}
              title={p.is_guest ? 'Pasar a la plantilla' : 'Pasar a invitados'}
              aria-label={p.is_guest ? `Pasar a ${p.name} a la plantilla` : `Pasar a ${p.name} a invitados`}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#333] text-zinc-500 hover:text-white transition-colors shrink-0 disabled:opacity-50"
            >
              {togglingId === p.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : p.is_guest ? (
                <UserPlus size={14} />
              ) : (
                <UserMinus size={14} />
              )}
            </button>
          ) : (
            <span className="text-xs font-bold text-zinc-700 uppercase">{p.position}</span>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Plantilla</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Jugadores registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pizarra"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-zinc-200 text-sm font-bold hover:text-white hover:border-zinc-500 transition-colors"
          >
            <ClipboardList size={15} className="text-bol-yellow" />
            Pizarra
          </Link>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
            >
              {showForm ? <X size={15} /> : <Plus size={15} />}
              {showForm ? 'Cancelar' : 'Añadir'}
            </button>
          )}
        </div>
      </div>

      {/* Identidad del jugador en este móvil */}
      <PlayerIdentityBar
        player={me}
        playerId={playerId}
        loading={authLoading}
        onIdentify={() => setShowAccess(true)}
        onPhotoChanged={(path) => playerId && setPhotoPath(playerId, path)}
      />

      {/* Formulario nuevo jugador */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 mb-6 flex flex-col gap-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nuevo jugador</p>

          {/* Tipo */}
          <div>
            <label className="block text-xs text-zinc-600 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: 'Plantilla' },
                { value: true, label: 'Invitado' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setIsGuest(opt.value)}
                  aria-pressed={isGuest === opt.value}
                  className={[
                    'py-2 rounded-lg text-sm font-bold transition-colors',
                    isGuest === opt.value ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isGuest && (
              <p className="text-[11px] text-zinc-500 mt-2">
                Externo al grupo. Juega y puntúa como los demás, pero solo un admin puede apuntarlo a un partido.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {/* Número */}
            <div className="w-24">
              <label className="block text-xs text-zinc-600 mb-1.5">Dorsal</label>
              <input
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="10"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-center text-lg font-black focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            {/* Nombre */}
            <div className="flex-1">
              <label className="block text-xs text-zinc-600 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre Apellido"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
          </div>

          {/* Posición */}
          <div>
            <label className="block text-xs text-zinc-600 mb-1.5">Posición</label>
            <div className="flex gap-2 flex-wrap">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                    position === pos
                      ? 'bg-white text-black'
                      : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={saving}>
            {saving ? 'Guardando...' : 'Crear jugador'}
          </Button>
        </form>
      )}

      {/* Listas */}
      {error && !showForm && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl mb-4">{error}</p>
      )}
      {loading ? (
        <p className="text-center text-zinc-600 text-sm py-16">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {renderList(squad)}
          {(guests.length > 0 || isAdmin) && (
            <section>
              <div className="px-1 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Invitados <span className="text-zinc-600 tabular-nums">{guests.length}</span>
                </h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Externos al grupo. Votan el MVP solo en los partidos a los que un admin los apunta.
                </p>
              </div>
              {guests.length > 0 ? (
                renderList(guests)
              ) : (
                <p className="text-xs text-zinc-700 px-1 py-2">
                  Ningún invitado. Añádelo con «Añadir» y tipo «Invitado».
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {showAccess && (
        <PlayerAccessModal
          players={players}
          registeredIds={registeredIds}
          nextPath={nextPath}
          onClose={() => setShowAccess(false)}
          onRegisteredChange={loadRegistered}
        />
      )}

      {releaseTarget && (
        <ReleaseAccountModal
          player={releaseTarget}
          isSelf={releaseTarget.id === playerId}
          onClose={() => setReleaseTarget(null)}
          onReleased={loadRegistered}
        />
      )}
    </main>
  )
}
