'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { OUR_LOGO_STARS } from '@/lib/teams'

// Variable de módulo: persiste durante la sesión de navegación pero
// se resetea al recargar/reabrir la app
let alreadyShown = false

export default function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>(() =>
    alreadyShown ? 'done' : 'in'
  )

  useEffect(() => {
    if (alreadyShown) return
    alreadyShown = true
    const fadeOut = setTimeout(() => setPhase('out'), 1400)
    const hide    = setTimeout(() => setPhase('done'), 1900)
    return () => { clearTimeout(fadeOut); clearTimeout(hide) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden ${
        phase === 'out' ? 'splash-fade-out' : ''
      }`}
    >
      {/* Halo tricolor difuso detrás del escudo — rojo / amarillo / verde de la bandera */}
      <div
        aria-hidden
        className={`absolute inset-0 ${phase === 'in' ? 'splash-bg' : ''}`}
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 28%, rgba(213, 43, 30, 0.28), transparent 70%),' +
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249, 227, 0, 0.16), transparent 70%),' +
            'radial-gradient(ellipse 70% 45% at 50% 72%, rgba(0, 121, 52, 0.30), transparent 70%)',
        }}
      />

      {/* Escudo — sizes 2x el hueco para que llegue nítido en retina */}
      <div className={`relative w-44 h-44 ${phase === 'in' ? 'splash-logo' : ''}`}>
        <Image
          src={OUR_LOGO_STARS}
          alt="Bolivia Dortmund"
          fill
          priority
          className="object-contain"
          sizes="352px"
          quality={100}
        />
      </div>
    </div>
  )
}
