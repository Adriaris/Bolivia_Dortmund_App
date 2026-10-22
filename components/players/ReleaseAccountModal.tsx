'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { releasePlayer, signOut } from '@/lib/auth'
import type { Player } from '@/lib/types'

interface ReleaseAccountModalProps {
  player: Player
  /** true si el admin está liberando su propio jugador (se cerrará su sesión) */
  isSelf: boolean
  onClose: () => void
  onReleased: () => void
}

export default function ReleaseAccountModal({ player, isSelf, onClose, onReleased }: ReleaseAccountModalProps) {
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRelease() {
    setReleasing(true)
    setError(null)
    try {
      const res = await releasePlayer(player.id)
      if (!res.ok) {
        setError(res.error ?? 'No se pudo liberar la cuenta.')
        return
      }
      if (isSelf) await signOut().catch(() => {})
      onReleased()
      onClose()
    } catch {
      setError('Sin conexión. Inténtalo de nuevo.')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <Modal title="Liberar jugador" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-300">
          Se borrará la cuenta de <strong className="text-white">{player.name}</strong> (#{player.number}) y perderá la
          sesión en sus móviles. Tendrá que volver a registrarse con un <strong className="text-white">PIN nuevo</strong>.
        </p>
        <p className="text-xs text-zinc-500">Sus asistencias y votos ya emitidos se conservan.</p>
        {isSelf && (
          <p className="text-sm text-bol-yellow bg-bol-yellow/10 border border-bol-yellow/30 px-3 py-2 rounded-xl">
            Es tu propio jugador: se cerrará tu sesión en este móvil.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth onClick={handleRelease} disabled={releasing}>
            {releasing ? 'Liberando...' : 'Liberar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
