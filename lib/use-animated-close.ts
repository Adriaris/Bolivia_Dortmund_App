'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Duración de la animación de salida de modales/hojas (debe coincidir con globals.css). */
export const MODAL_CLOSE_MS = 180

/**
 * Cierre con animación: `requestClose()` marca el modal como "cerrándose" (el CSS
 * reproduce la salida) y llama a `onClose` cuando termina, para que el padre lo
 * desmonte. Si el sistema pide reducir el movimiento, cierra al instante.
 */
export function useAnimatedClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(() => onCloseRef.current(), reduced ? 0 : MODAL_CLOSE_MS)
  }, [])

  return { closing, requestClose }
}
