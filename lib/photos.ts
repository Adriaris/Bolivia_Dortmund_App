import { supabase } from './supabase/client'
import type { Player } from './types'

// Fotos de perfil en el bucket público 'avatars' de Supabase Storage.
// La imagen se recorta en cuadrado y se comprime EN EL MÓVIL antes de subirla
// (~512 px, WebP o JPEG ≈ 50-100 KB): sube rápido con datos y apenas ocupa.

const BUCKET = 'avatars'
const SIZE = 512
const QUALITY = 0.85

/** URL pública de una foto (null si no hay). */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Respeta la orientación EXIF de las fotos de móvil
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/** Recorta al centro en cuadrado, reduce a 512 px y comprime (WebP; JPEG si el navegador no sabe WebP). */
export async function compressToSquare(file: File): Promise<Blob> {
  const image = await loadImage(file)
  const width = image.width
  const height = image.height
  const side = Math.min(width, height)
  const out = Math.min(SIZE, side)
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')
  ctx.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, out, out)
  if ('close' in image) image.close()

  let blob = await canvasToBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg')
  if (!blob) throw new Error('compress_failed')
  return blob
}

/** Sube la foto de un jugador (el propio jugador o un admin) y borra la anterior. Devuelve la nueva ruta. */
export async function uploadPlayerPhoto(
  player: Pick<Player, 'id' | 'photo_path'>,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not_an_image')
  const blob = await compressToSquare(file)
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${player.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (uploadError) throw uploadError

  const { error: rpcError } = await supabase.rpc('set_player_photo', { p_player_id: player.id, p_path: path })
  if (rpcError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw rpcError
  }

  if (player.photo_path && player.photo_path !== path) {
    await supabase.storage.from(BUCKET).remove([player.photo_path]) // si falla, solo queda un archivo huérfano
  }
  return path
}

/** Quita la foto de un jugador. */
export async function removePlayerPhoto(player: Pick<Player, 'id' | 'photo_path'>): Promise<void> {
  const { error } = await supabase.rpc('set_player_photo', { p_player_id: player.id, p_path: null })
  if (error) throw error
  if (player.photo_path) await supabase.storage.from(BUCKET).remove([player.photo_path])
}

/** Mensaje en español para un error de subida. */
export function photoErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  if (msg.includes('not_an_image')) return 'El archivo no es una imagen.'
  if (msg.includes('not_allowed') || /row-level security|Unauthorized|403/i.test(msg))
    return 'Solo puedes cambiar tu propia foto.'
  if (msg.includes('compress_failed') || msg.includes('canvas_unavailable'))
    return 'No se pudo procesar la foto. Prueba con otra (JPG o PNG).'
  return 'No se pudo subir la foto. Inténtalo de nuevo.'
}
