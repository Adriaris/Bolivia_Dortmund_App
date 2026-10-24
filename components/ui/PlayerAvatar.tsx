import { photoUrl } from '@/lib/photos'
import type { Player } from '@/lib/types'

interface PlayerAvatarProps {
  player: Pick<Player, 'name' | 'alias' | 'number' | 'photo_path'> | null | undefined
  /** Clases de tamaño/forma del círculo (p. ej. "w-9 h-9") */
  className?: string
  /** Qué mostrar si no hay foto: el dorsal o la inicial */
  fallback?: 'number' | 'initial'
  /** Clases del círculo sin foto (fondo, color y tamaño del texto) */
  fallbackClassName?: string
  /** Dorsal a mostrar si difiere del actual (dorsal del split) */
  number?: number | null
}

/** Foto de perfil redonda; sin foto, dorsal o inicial como hasta ahora. */
export default function PlayerAvatar({
  player,
  className = 'w-9 h-9',
  fallback = 'number',
  fallbackClassName = 'bg-[#2a2a2a] text-white text-sm font-black',
  number,
}: PlayerAvatarProps) {
  const url = photoUrl(player?.photo_path)
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto ya comprimida a 512 px en el bucket público
      <img
        src={url}
        alt={player ? `Foto de ${player.alias ?? player.name}` : ''}
        loading="lazy"
        decoding="async"
        className={`${className} rounded-full object-cover shrink-0 bg-[#1f1f1f]`}
      />
    )
  }
  const label =
    fallback === 'initial'
      ? (player?.alias ?? player?.name ?? '?').trim().charAt(0).toUpperCase()
      : String(number ?? player?.number ?? '')
  return (
    <span className={`${className} ${fallbackClassName} rounded-full flex items-center justify-center shrink-0 tabular-nums`}>
      {label}
    </span>
  )
}
