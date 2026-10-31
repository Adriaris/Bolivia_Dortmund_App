import { PITCH } from '@/lib/board'

/**
 * Campo de fútbol 7 en vertical (nuestra portería abajo). Solo dibujo: las fichas
 * van encima, posicionadas en porcentaje, así que el SVG escala con el contenedor.
 */
export default function Pitch() {
  const W = PITCH.width
  const L = PITCH.length
  const cx = W / 2
  // Medidas aproximadas de F7 (en metros)
  const areaW = 27
  const areaD = 11
  const goalW = 6
  const goalD = 1.6
  const spot = 9
  const circleR = 6
  const stripes = 10
  const stripeH = L / stripes

  return (
    <svg
      viewBox={`${-goalD - 1} ${-goalD - 1} ${W + 2 * (goalD + 1)} ${L + 2 * (goalD + 1)}`}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      focusable="false"
    >
      {/* Césped con franjas */}
      <rect x={-goalD - 1} y={-goalD - 1} width={W + 2 * (goalD + 1)} height={L + 2 * (goalD + 1)} fill="#1f6b32" />
      {Array.from({ length: stripes }, (_, i) => (
        <rect
          key={i}
          x={0}
          y={i * stripeH}
          width={W}
          height={stripeH}
          fill={i % 2 === 0 ? '#2c7a3f' : '#27703a'}
        />
      ))}

      <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={0.35} strokeLinejoin="round">
        {/* Límites y medio campo */}
        <rect x={0} y={0} width={W} height={L} />
        <line x1={0} y1={L / 2} x2={W} y2={L / 2} />
        <circle cx={cx} cy={L / 2} r={circleR} />

        {/* Área rival (arriba) */}
        <rect x={cx - areaW / 2} y={0} width={areaW} height={areaD} />
        <path d={`M ${cx - 4.5} ${areaD} A 5 5 0 0 0 ${cx + 4.5} ${areaD}`} />
        <rect x={cx - goalW / 2} y={-goalD} width={goalW} height={goalD} fill="rgba(0,0,0,0.25)" />

        {/* Área nuestra (abajo) */}
        <rect x={cx - areaW / 2} y={L - areaD} width={areaW} height={areaD} />
        <path d={`M ${cx - 4.5} ${L - areaD} A 5 5 0 0 1 ${cx + 4.5} ${L - areaD}`} />
        <rect x={cx - goalW / 2} y={L} width={goalW} height={goalD} fill="rgba(0,0,0,0.25)" />

        {/* Córners */}
        <path d={`M 0 1.2 A 1.2 1.2 0 0 0 1.2 0`} />
        <path d={`M ${W - 1.2} 0 A 1.2 1.2 0 0 0 ${W} 1.2`} />
        <path d={`M 0 ${L - 1.2} A 1.2 1.2 0 0 1 1.2 ${L}`} />
        <path d={`M ${W - 1.2} ${L} A 1.2 1.2 0 0 1 ${W} ${L - 1.2}`} />
      </g>

      {/* Puntos: centro y penaltis */}
      <g fill="rgba(255,255,255,0.85)">
        <circle cx={cx} cy={L / 2} r={0.45} />
        <circle cx={cx} cy={spot} r={0.45} />
        <circle cx={cx} cy={L - spot} r={0.45} />
      </g>
    </svg>
  )
}
