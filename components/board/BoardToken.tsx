'use client'

import { useRef } from 'react'
import { GiSoccerBall } from 'react-icons/gi'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import { shortName, type BoardToken as Token } from '@/lib/board'
import type { Player } from '@/lib/types'

/** Desplazamiento máximo (px) para considerar que ha sido un toque y no un arrastre */
const TAP_TOLERANCE = 8

/** Bandera de Bolivia en tres franjas horizontales (rojo, amarillo, verde) */
const TRICOLOR = 'bg-[linear-gradient(to_bottom,#D52B1E_0%,#D52B1E_33.3%,#F9E300_33.3%,#F9E300_66.6%,#007934_66.6%,#007934_100%)] text-black'

interface DragHandlers {
  /** Posición del puntero → porcentaje del campo */
  toPercent: (clientX: number, clientY: number) => { x: number; y: number }
  onMove: (x: number, y: number) => void
  onDragStateChange?: (dragging: boolean) => void
}

/** Arrastre con Pointer Events: funciona igual con el dedo, el ratón o un lápiz */
function useDrag({ toPercent, onMove, onDragStateChange }: DragHandlers, onTap?: () => void) {
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      e.preventDefault()
      // Captura el puntero para seguir el arrastre aunque salga del elemento
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero no activo */ }
      start.current = { x: e.clientX, y: e.clientY, moved: false }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s) return
      if (!s.moved) {
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        if (Math.hypot(dx, dy) < TAP_TOLERANCE) return
        s.moved = true
        onDragStateChange?.(true)
      }
      const p = toPercent(e.clientX, e.clientY)
      onMove(p.x, p.y)
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current
      start.current = null
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
      } catch { /* ya liberado */ }
      if (!s) return
      if (s.moved) onDragStateChange?.(false)
      else onTap?.()
    },
    onPointerCancel: () => {
      if (start.current?.moved) onDragStateChange?.(false)
      start.current = null
    },
  }
}

const baseStyle = (x: number, y: number): React.CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  transform: 'translate(-50%, -50%)',
  touchAction: 'none',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
})

interface PieceProps extends DragHandlers {
  token: Token
  player: Player | null
  /** Tamaño de la ficha en px (depende del ancho del campo) */
  size: number
  showName?: boolean
  onTap?: () => void
}

export function Piece({ token, player, size, showName = true, onTap, ...drag }: PieceProps) {
  const handlers = useDrag(drag, onTap)
  const isOurs = token.side === 'ours'
  const isGk = token.role === 'POR'

  // Nuestras fichas llevan la tricolor boliviana; las del rival van en blanco (portero gris)
  const rivalFace = isGk ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'
  const ring = isOurs ? (isGk ? 'ring-[3px] ring-white' : 'ring-2 ring-black/80') : 'ring-2 ring-zinc-900/60'
  const label = player && showName ? shortName(player) : null
  const aria = isOurs
    ? player
      ? `${player.name}, ficha ${token.label}`
      : `Ficha ${token.label} del Bolivia, sin jugador`
    : `Rival ${token.label}`

  return (
    <button
      type="button"
      {...handlers}
      aria-label={aria}
      className="absolute z-10 flex flex-col items-center cursor-grab active:cursor-grabbing active:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
      style={{ ...baseStyle(token.x, token.y), width: size, pointerEvents: 'auto' }}
    >
      <span
        className={`${isOurs ? TRICOLOR : rivalFace} ${ring} rounded-full flex items-center justify-center font-black tabular-nums shadow-[0_3px_8px_rgba(0,0,0,0.45)] pointer-events-none overflow-hidden`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {player ? (
          // Con foto, la tricolor queda como anillo alrededor de la imagen
          <span className="w-full h-full rounded-full flex items-center justify-center" style={{ padding: isOurs ? Math.max(3, size * 0.11) : 0 }}>
            <PlayerAvatar
              player={player}
              className="w-full h-full"
              fallbackClassName={isOurs ? `${TRICOLOR} text-black font-black` : `${rivalFace} font-black`}
            />
          </span>
        ) : isOurs ? (
          <span className="tricolor-number">{token.label}</span>
        ) : (
          token.label
        )}
      </span>
      {label && (
        <span
          className="mt-0.5 max-w-[4.6rem] truncate rounded px-1 bg-black/55 text-white font-semibold leading-tight pointer-events-none"
          style={{ fontSize: Math.max(9, size * 0.26) }}
        >
          {label}
        </span>
      )}
      {/* Con foto el dorsal no cabe dentro: va en una chapa; sin foto ya se ve en el círculo */}
      {player?.photo_path && (
        <span
          className="absolute -top-1 -right-1 rounded-full bg-black text-bol-yellow font-black tabular-nums flex items-center justify-center pointer-events-none"
          style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.22 }}
        >
          {player.number}
        </span>
      )}
    </button>
  )
}

interface BallProps extends DragHandlers {
  x: number
  y: number
  size: number
}

export function Ball({ x, y, size, ...drag }: BallProps) {
  const handlers = useDrag(drag)
  return (
    <div
      role="img"
      aria-label="Balón"
      {...handlers}
      className="absolute z-10 cursor-grab active:cursor-grabbing active:z-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
      style={{ ...baseStyle(x, y), width: size, height: size }}
    >
      <GiSoccerBall size={size} className="pointer-events-none" />
    </div>
  )
}
