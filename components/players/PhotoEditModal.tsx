'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import { photoErrorMessage, removePlayerPhoto, uploadPlayerPhotoBlob } from '@/lib/photos'
import PhotoCropper from './PhotoCropper'
import type { Player } from '@/lib/types'

interface PhotoEditModalProps {
  player: Player
  /** true si la edita un admin para otro jugador */
  asAdmin?: boolean
  onClose: () => void
  onChanged: (photoPath: string | null) => void
}

/** Subir, cambiar o quitar la foto de perfil (el propio jugador o un admin). */
export default function PhotoEditModal({ player, asAdmin = false, onClose, onChanged }: PhotoEditModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<Player>(player)
  // Foto elegida pendiente de encuadrar
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('El archivo no es una imagen.')
      return
    }
    setPendingFile(file)
  }

  async function handleCropped(blob: Blob) {
    setBusy('upload')
    setError(null)
    try {
      const path = await uploadPlayerPhotoBlob(current, blob)
      setCurrent({ ...current, photo_path: path })
      onChanged(path)
      setPendingFile(null)
    } catch (err) {
      setError(photoErrorMessage(err))
      setPendingFile(null)
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove() {
    setBusy('remove')
    setError(null)
    try {
      await removePlayerPhoto(current)
      setCurrent({ ...current, photo_path: null })
      onChanged(null)
    } catch (err) {
      setError(photoErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (pendingFile) {
    return (
      <Modal title="Encuadra la foto" onClose={() => !busy && setPendingFile(null)}>
        <PhotoCropper
          file={pendingFile}
          busy={busy === 'upload'}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropped}
        />
      </Modal>
    )
  }

  return (
    <Modal title={asAdmin ? `Foto de ${current.alias ?? current.name}` : 'Tu foto de perfil'} onClose={() => !busy && onClose()}>
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="relative">
          <PlayerAvatar
            player={current}
            className="w-32 h-32"
            fallbackClassName="bg-bol-yellow text-black text-4xl font-black"
          />
          {busy === 'upload' && (
            <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white" />
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 text-center max-w-xs">
          Se verá en la plantilla, en la votación y si sales MVP. Mejor una foto de cara, a poder ser con la camiseta.
        </p>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {error && (
          <p className="w-full text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
        )}

        <div className="w-full flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => inputRef.current?.click()} disabled={busy !== null}>
            <Camera size={16} />
            {current.photo_path ? 'Cambiar foto' : 'Elegir foto'}
          </Button>
          {current.photo_path && (
            <Button variant="secondary" size="lg" fullWidth onClick={handleRemove} disabled={busy !== null}>
              {busy === 'remove' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Quitar foto
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
