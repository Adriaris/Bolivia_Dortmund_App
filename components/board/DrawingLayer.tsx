'use client'

import { useRef, useState } from 'react'
import { clampPct, PITCH, type Stroke } from '@/lib/board'

interface DrawingLayerProps {
  strokes: Stroke[]
  /** Con el lápiz activo la capa captura el puntero y las fichas quedan bloqueadas */
  active: boolean
  color: string
  toPercent: (clientX: number, clientY: number) => { x: number; y: number }
  onStroke: (stroke: Stroke) => void
}

const toUnits = ([x, y]: [number, number]) => `${(x / 100) * PITCH.width},${(y / 100) * PITCH.length}`

function Path({ stroke }: { stroke: Stroke }) {
  if (stroke.points.length === 0) return null
  const d = stroke.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toUnits(p)}`).join(' ')
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke.color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}
    />
  )
}

/** Dibujo a mano alzada sobre el campo; los trazos se guardan en porcentaje y escalan con él */
export default function DrawingLayer({ strokes, active, color, toPercent, onStroke }: DrawingLayerProps) {
  const [current, setCurrent] = useState<Stroke | null>(null)
  const drawing = useRef<Stroke | null>(null)

  const addPoint = (clientX: number, clientY: number) => {
    const s = drawing.current
    if (!s) return
    const p = toPercent(clientX, clientY)
    const point: [number, number] = [clampPct(p.x), clampPct(p.y)]
    const last = s.points[s.points.length - 1]
    // Ignora movimientos mínimos para no acumular puntos de más
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.4) return
    s.points = [...s.points, point]
    setCurrent({ ...s })
  }

  const finish = () => {
    const s = drawing.current
    drawing.current = null
    setCurrent(null)
    if (s) {
      // Un toque sin movimiento deja un punto visible
      if (s.points.length === 1) s.points = [s.points[0], [s.points[0][0] + 0.01, s.points[0][1]]]
      onStroke(s)
    }
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${PITCH.width} ${PITCH.length}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-[15]"
        aria-hidden="true"
      >
        {strokes.map((s, i) => <Path key={i} stroke={s} />)}
        {current && <Path stroke={current} />}
      </svg>
      {active && (
        <div
          className="absolute inset-0 z-30 cursor-crosshair"
          style={{ touchAction: 'none' }}
          aria-label="Zona de dibujo"
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return
            e.preventDefault()
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* puntero no activo */ }
            const p = toPercent(e.clientX, e.clientY)
            drawing.current = { color, points: [[clampPct(p.x), clampPct(p.y)]] }
            setCurrent({ ...drawing.current })
          }}
          onPointerMove={(e) => addPoint(e.clientX, e.clientY)}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      )}
    </>
  )
}
