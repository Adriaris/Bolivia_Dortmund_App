'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { OUR_LOGO_STARS } from '@/lib/teams'
import { useAuth } from './AuthProvider'
import { signOut } from '@/lib/auth'
import { useScrollLock } from '@/lib/scroll-lock'
import { useAnimatedClose } from '@/lib/use-animated-close'

const TAP_COUNT = 5
const TAP_WINDOW = 2000 // ms

export default function HomeHeader({ season }: { season?: string }) {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [sheet, setSheet] = useState(false)
  const tapsRef = useRef<number[]>([])

  // 5 taps rápidos en el logo → login (estilo Android dev mode)
  const handleLogoTap = () => {
    if (isAdmin) {
      setSheet(true)
      return
    }
    const now = Date.now()
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < TAP_WINDOW), now]
    if (tapsRef.current.length >= TAP_COUNT) {
      tapsRef.current = []
      router.push('/login')
    }
  }

  const handleLogout = async () => {
    await signOut()
    setSheet(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button onClick={handleLogoTap} className="relative w-14 h-14 shrink-0 touch-manipulation">
          {/* sizes 3x el hueco: el escudo nacional del centro se empasta si se sirve a baja resolución */}
          <Image src={OUR_LOGO_STARS} alt="Bolivia Dortmund" fill loading="eager" priority className="object-contain" sizes="168px" quality={100} />
          {isAdmin && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
              <ShieldCheck size={12} className="text-amber-400" />
            </span>
          )}
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Bolivia Dortmund</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            {season ? `Temporada ${season}` : 'Fútbol 7'}
          </p>
        </div>
      </div>

      {/* Admin logout sheet */}
      {sheet && <AdminSheet onLogout={handleLogout} onClose={() => setSheet(false)} />}
    </>
  )
}

/** Hoja inferior con el cierre de sesión del admin (entra y sale animada). */
function AdminSheet({ onLogout, onClose }: { onLogout: () => void; onClose: () => void }) {
  // Bloquea el scroll de la página mientras la hoja está abierta
  useScrollLock()
  const { closing, requestClose } = useAnimatedClose(onClose)

  return (
    <div
      data-closing={closing || undefined}
      className={`modal-backdrop fixed inset-0 z-50 bg-black/70 touch-none ${closing ? 'pointer-events-none' : ''}`}
      onClick={requestClose}
    >
      <div
        className="modal-sheet absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#111] border-t border-[#2a2a2a] rounded-t-3xl px-4 pt-4 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 text-center font-bold">
          Sesión de administrador
        </p>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-red-500/10 text-red-400 font-bold text-base transition-transform duration-75 active:scale-95 touch-manipulation"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
