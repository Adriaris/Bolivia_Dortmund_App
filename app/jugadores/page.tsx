'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { getPlayers, createPlayer } from '@/lib/supabase/queries'
import { getRegisteredPlayerIds } from '@/lib/auth'
import { safeNextPath } from '@/lib/players'
import { useAuth } from '@/components/auth/AuthProvider'
import Button from '@/components/ui/Button'
import CaptainBadge from '@/components/ui/CaptainBadge'
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRegistered = useCallback(async () => {
    const ids = await getRegisteredPlayerIds().catch(() => null)
    if (ids) setRegisteredIds(ids)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [data] = await Promise.all([getPlayers().catch(() => []), loadRegistered()])
    setPlayers(data)
    setLoading(false)
  }, [loadRegistered])

  useEffect(() => { void load() }, [load])

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
      await createPlayer({ number: Number(number), name: name.trim(), position })
      setShowForm(false)
      setNumber('')
      setName('')
      setPosition('DEF')
      await load()
    } catch {
      setError('Error al crear el jugador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-6 max-w-lg mx-auto">
      {/* Header sticky */}
      <div className="sticky-header sticky z-10 bg-black -mx-4 px-4 pb-3 mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Plantilla</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">Jugadores registrados</p>
        </div>
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

      {/* Identidad del jugador en este móvil */}
      <PlayerIdentityBar
        player={me}
        playerId={playerId}
        loading={authLoading}
        onIdentify={() => setShowAccess(true)}
      />

      {/* Formulario nuevo jugador */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 mb-6 flex flex-col gap-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nuevo jugador</p>

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

      {/* Lista */}
      {loading ? (
        <p className="text-center text-zinc-600 text-sm py-16">Cargando...</p>
      ) : (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 px-4 py-3.5 ${
                i < players.length - 1 ? 'border-b border-[#1f1f1f]' : ''
              }`}
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] text-white font-black text-sm shrink-0">
                {p.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <p className="text-zinc-600 text-xs flex items-center">
                  {positionLabel[p.position as Position] ?? p.position}
                  {p.is_captain && <CaptainBadge />}
                </p>
              </div>
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
              <span className="text-xs font-bold text-zinc-700 uppercase">{p.position}</span>
            </div>
          ))}
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
