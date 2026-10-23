interface GuestBadgeProps {
  inverted?: boolean
}

/** Etiqueta para jugadores invitados (externos al grupo), mismo estilo que CaptainBadge. */
export default function GuestBadge({ inverted = false }: GuestBadgeProps) {
  return (
    <span className={`text-[10px] font-bold tracking-wide ml-1.5 ${inverted ? 'text-black/50' : 'text-sky-400'}`}>
      INV
    </span>
  )
}
