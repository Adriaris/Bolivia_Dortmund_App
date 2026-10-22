'use client'

import { useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { signOut } from '@/lib/auth'
import type { Player } from '@/lib/types'

interface PlayerIdentityBarProps {
  /** Jugador de la sesión (null si no hay o aún no se ha cargado la plantilla) */
  player: Player | null
  playerId: string | null
  loading: boolean
  onIdentify: () => void
}

export default function PlayerIdentityBar({ player, playerId, loading, onIdentify }: PlayerIdentityBarProps) {
  const [confirmOut, setConfirmOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      await signOut()
      setConfirmOut(false)
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <div className="h-[60px] mb-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] animate-pulse" />
  }

  if (!playerId) {
    return (
      <button
        type="button"
        onClick={onIdentify}
        className="w-full mb-5 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-bol-yellow text-black text-left hover:bg-[#e8d400] active:bg-[#d6c400] transition-colors touch-manipulation"
      >
        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 shrink-0">
          <UserRound size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-black text-base leading-tight">Soy jugador</span>
          <span className="block text-xs font-medium text-black/70">Identifícate con tu PIN para apuntarte y votar</span>
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#141414] border border-bol-yellow/30">
        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-bol-yellow text-black font-black text-sm shrink-0">
          {player?.number ?? <UserRound size={16} />}
        </span>
        <p className="flex-1 min-w-0 text-sm text-white truncate">
          {player ? (
            <>Eres <strong className="font-bold">{player.name}</strong> · #{player.number}</>
          ) : (
            'Sesión de jugador iniciada'
          )}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOut(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      {confirmOut && (
        <Modal title="Cerrar sesión" onClose={() => setConfirmOut(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-300">
              Para volver a entrar en este móvil necesitarás tu <strong className="text-white">PIN</strong>.
            </p>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmOut(false)}>
                Cancelar
              </Button>
              <Button variant="danger" fullWidth onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
