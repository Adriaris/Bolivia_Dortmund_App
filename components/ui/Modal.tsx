'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Sin cabecera ni márgenes: el contenido ocupa todo el panel (botón de cerrar flotante) */
  bare?: boolean
}

export default function Modal({ title, onClose, children, bare = false }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg bg-[#141414] border border-[#2a2a2a] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {bare ? (
          <>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-zinc-300 hover:text-white backdrop-blur transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
            <div className="overflow-y-auto flex-1">{children}</div>
          </>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
