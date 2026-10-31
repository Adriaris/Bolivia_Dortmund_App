'use client'

import { useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useScrollLock } from '@/lib/scroll-lock'
import { useAnimatedClose } from '@/lib/use-animated-close'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Sin cabecera ni márgenes: el contenido ocupa todo el panel (botón de cerrar flotante) */
  bare?: boolean
  /** false mientras se está guardando: la X, el fondo y Escape no hacen nada */
  closable?: boolean
}

export default function Modal({ title, onClose, children, bare = false, closable = true }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  // Cerrar = animación de salida y, al terminar, onClose (el padre desmonta).
  // Si el padre no puede cerrar ahora (closable=false) no se inicia la salida:
  // si no, el modal se desvanecería y seguiría montado.
  const { closing, requestClose: startClose } = useAnimatedClose(onClose)
  const requestClose = useCallback(() => {
    if (closable) startClose()
  }, [closable, startClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [requestClose])

  // Bloquea el scroll de la página (en <html>, ver lib/scroll-lock.ts)
  useScrollLock()

  return (
    <div
      ref={backdropRef}
      data-closing={closing || undefined}
      className={`modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm touch-none ${closing ? 'pointer-events-none' : ''}`}
      onClick={(e) => { if (e.target === backdropRef.current) requestClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg bg-[#141414] border border-[#2a2a2a] rounded-t-3xl sm:rounded-2xl shadow-2xl modal-panel flex flex-col overflow-hidden"
      >
        {bare ? (
          <>
            <button
              onClick={requestClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-zinc-300 hover:text-white backdrop-blur transition-[color,transform] active:scale-90"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
            <div className="modal-scroll flex-1">{children}</div>
          </>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            onClick={requestClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-[color,background-color,transform] active:scale-90"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-scroll flex-1 px-5 py-4">
          {children}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
