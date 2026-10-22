'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'

/**
 * Celebración de campeón: confeti + fuegos artificiales en canvas, sin dependencias.
 * Arranca cuando termina la animación del logo (splash) y se dispara en cada
 * carga completa de la app: la variable de módulo se resetea al recargar/reabrir,
 * no en navegación interna (mismo mecanismo que SplashScreen).
 * Respeta prefers-reduced-motion.
 */

// Variable de módulo: persiste durante la sesión de navegación pero
// se resetea al recargar/reabrir la app (igual que el splash)
let alreadyCelebrated = false

// El splash hace fade a los 1100ms y desaparece a los 1600ms (SplashScreen.tsx)
const SPLASH_DURATION = 1600
const DURATION = 14500        // ventana total: los últimos petardos rematan la celebración
const SPAWN_CUTOFF = 6500     // hasta cuándo nace confeti nuevo
const CONFETTI_FADE = 8000    // cuándo empieza a desvanecerse el confeti (~9s fuera)
const BANNER_DURATION = 12000 // cuándo empieza el fade del banner

const CONFETTI_COLORS = ['#fbbf24', '#10b981', '#ef4444', '#3b82f6', '#ffffff', '#f472b6', '#f59e0b']
const FIREWORK_COLORS = ['#fbbf24', '#34d399', '#f87171', '#60a5fa', '#f472b6', '#fde68a']

type ParticleKind = 'confetti' | 'rocket' | 'trail' | 'spark'

interface Particle {
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vrot: number
  life: number   // 1 → 0
  decay: number  // cuánto pierde de vida por frame
  explodeY?: number   // solo cohetes: altura a la que estallan
  sway?: number       // solo confeti: fase del balanceo lateral
  swaySpeed?: number  // solo confeti: velocidad del balanceo
}

interface CelebrationConfettiProps {
  /** Título del banner */
  title?: string
  /** Subtítulo del banner */
  subtitle?: string
  /**
   * true = celebración propia de una pantalla (p. ej. MVP): no consume ni
   * respeta el "una vez por carga" que comparte la celebración de campeón.
   */
  independent?: boolean
}

export default function CelebrationConfetti({
  title = '¡Campeones de liga!',
  subtitle = 'Bolivia Dortmund',
  independent = false,
}: CelebrationConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bannerRef = useRef<HTMLButtonElement | null>(null)
  // El canvas registra aquí cómo disolver el banner en chispas doradas
  const dissolveBannerRef = useRef<(x: number, y: number) => void>(() => {})
  const [show, setShow] = useState(false)
  const [bannerPhase, setBannerPhase] = useState<'in' | 'out' | 'gone'>('in')

  // Espera a que termine el splash y dispara (una vez por carga completa)
  useEffect(() => {
    if (!independent && alreadyCelebrated) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduce) return
    if (!independent) alreadyCelebrated = true
    // Decisión solo-cliente (reduced-motion no existe en SSR); render inicial
    // null en servidor y cliente → sin mismatch de hidratación.
    const t = setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true)
    }, SPLASH_DURATION)
    return () => clearTimeout(t)
  }, [independent])

  // Inicia el fade del banner pasado su tiempo
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setBannerPhase((p) => (p === 'in' ? 'out' : p)), BANNER_DURATION)
    return () => clearTimeout(t)
  }, [show])

  // Al salir, el banner se disuelve en chispas doradas desde su posición
  useEffect(() => {
    if (bannerPhase !== 'out') return
    const rect = bannerRef.current?.getBoundingClientRect()
    dissolveBannerRef.current(
      rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      rect ? rect.top + rect.height / 2 : 130
    )
    const t = setTimeout(() => setBannerPhase('gone'), 500)
    return () => clearTimeout(t)
  }, [bannerPhase])

  // Animación en canvas
  useEffect(() => {
    if (!show) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []

    // Confeti que cae despacio, meciéndose con el aire.
    // `scattered` reparte en altura la tanda inicial; el goteo continuo nace justo arriba.
    const spawnConfetti = (n: number, scattered = false) => {
      for (let i = 0; i < n; i++) {
        particles.push({
          kind: 'confetti',
          x: Math.random() * width,
          y: scattered ? -20 - Math.random() * height * 0.4 : -20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.5 + Math.random() * 0.6,
          size: 5 + Math.random() * 6,
          color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.15,
          life: 1,
          decay: 0,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 0.02 + Math.random() * 0.03,
        })
      }
    }

    // Explosión del fuego artificial: esfera de chispas de un mismo color
    const explode = (cx: number, cy: number) => {
      const color = FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0]
      const count = 64
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.15
        const speed = 2 + Math.random() * 4.5
        particles.push({
          kind: 'spark',
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.6 + Math.random() * 1.6,
          // Algunas chispas blancas mezcladas para dar brillo
          color: i % 6 === 0 ? '#ffffff' : color,
          rot: 0,
          vrot: 0,
          life: 1,
          decay: 0.009 + Math.random() * 0.006,
        })
      }
    }

    // Cohete: sube desde abajo con estela y estalla arriba
    const launchRocket = () => {
      particles.push({
        kind: 'rocket',
        x: width * (0.15 + Math.random() * 0.7),
        y: height + 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(11 + Math.random() * 3),
        size: 2.5,
        color: '#fde68a',
        rot: 0,
        vrot: 0,
        life: 1,
        decay: 0,
        explodeY: height * (0.15 + Math.random() * 0.28),
      })
    }

    // El banner se disuelve en chispas doradas que suben y se apagan
    dissolveBannerRef.current = (cx, cy) => {
      for (let i = 0; i < 40; i++) {
        particles.push({
          kind: 'spark',
          x: cx + (Math.random() - 0.5) * 240,
          y: cy + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -0.5 - Math.random() * 1.2,
          size: 1.2 + Math.random() * 1.6,
          color: i % 3 === 0 ? '#ffffff' : '#fbbf24',
          rot: 0,
          vrot: 0,
          life: 1,
          decay: 0.012 + Math.random() * 0.008,
        })
      }
    }

    // Secuencia: tanda inicial suave + goteo constante (en el bucle) + cohetes espaciados.
    // Los últimos cohetes salen cuando el confeti ya se apaga: los petardos cierran el show.
    spawnConfetti(45, true)
    const timers: ReturnType<typeof setTimeout>[] = []
    ;[300, 1500, 2800, 4200, 5600, 7200, 8800, 10400, 11800].forEach((t) => {
      timers.push(setTimeout(launchRocket, t))
    })

    const start = performance.now()
    let lastSpawn = start
    let raf = 0

    const frame = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, width, height)

      // Goteo constante de confeti (en vez de ráfagas)
      if (elapsed < SPAWN_CUTOFF && now - lastSpawn > 200) {
        spawnConfetti(3)
        lastSpawn = now
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        switch (p.kind) {
          case 'confetti': {
            // Caída lenta con velocidad terminal según tamaño + balanceo con el aire
            const terminal = 0.9 + (p.size - 5) * 0.1
            p.vy = Math.min(p.vy + 0.015, terminal)
            p.sway! += p.swaySpeed!
            p.x += Math.sin(p.sway!) * 0.5
            p.rot += p.vrot
            // Desvanecer el confeti; los petardos siguen y cierran el show
            if (elapsed > CONFETTI_FADE) p.life -= 0.015
            break
          }
          case 'rocket': {
            p.vy += 0.08 // el cohete decelera al subir
            // Estela dorada
            particles.push({
              kind: 'trail',
              x: p.x + (Math.random() - 0.5) * 2,
              y: p.y,
              vx: (Math.random() - 0.5) * 0.4,
              vy: 0.4 + Math.random() * 0.4,
              size: 1 + Math.random() * 1.2,
              color: '#fbbf24',
              rot: 0,
              vrot: 0,
              life: 0.7,
              decay: 0.05,
            })
            // Estalla al llegar a su altura (o si se queda sin impulso)
            if (p.y <= (p.explodeY ?? height * 0.3) || p.vy > -1.5) {
              explode(p.x, p.y)
              particles.splice(i, 1)
              continue
            }
            break
          }
          case 'spark':
            p.vx *= 0.985
            p.vy = p.vy * 0.985 + 0.045
            p.life -= p.decay
            break
          case 'trail':
            p.life -= p.decay
            break
        }

        p.x += p.vx
        p.y += p.vy

        if (p.y > height + 40 || p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        if (p.kind === 'confetti') {
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          // Chispas, estelas y cohetes: puntos redondos con brillo aditivo
          ctx.globalCompositeOperation = 'lighter'
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      // Sigue mientras dure la ventana o queden partículas (tope de seguridad)
      if (elapsed < DURATION || (particles.length > 0 && elapsed < DURATION + 4000)) {
        raf = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      timers.forEach(clearTimeout)
    }
  }, [show])

  if (!show) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-60 pointer-events-none"
      />
      {bannerPhase !== 'gone' && (
        <button
          ref={bannerRef}
          type="button"
          onClick={() => setBannerPhase((p) => (p === 'in' ? 'out' : p))}
          aria-label="Cerrar celebración"
          className={`fixed inset-x-0 top-24 z-61 flex justify-center px-4 ${
            bannerPhase === 'out' ? 'champion-banner-out' : 'champion-banner'
          }`}
        >
          <div className="flex items-center gap-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] px-5 py-4 shadow-xl">
            <Trophy size={22} className="text-amber-400 shrink-0" />
            <div className="text-left">
              <p className="text-base font-black text-white tracking-tight leading-tight">
                {title}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                {subtitle}
              </p>
            </div>
          </div>
        </button>
      )}
    </>
  )
}
