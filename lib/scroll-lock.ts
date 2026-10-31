'use client'

import { useEffect } from 'react'

/**
 * Bloqueo del scroll de la página mientras hay un modal u hoja abierta.
 *
 * Se bloquea en `<html>` y no en `<body>`: en globals.css el `<html>` lleva
 * `overflow-x: clip`, y según la especificación CSS el `overflow` del body solo
 * se propaga al viewport cuando el del html es `visible` en ambos ejes. Por eso
 * `document.body.style.overflow = 'hidden'` no bloqueaba nada: el viewport seguía
 * siendo desplazable y, además, convertía el body en un contenedor de scroll que
 * rompía los headers `position: sticky`.
 *
 * Contador de referencias: si hay dos capas abiertas a la vez (ficha de jugador
 * sobre otro modal, etc.) el scroll se libera al cerrar la última.
 */
let locks = 0
let previous: { overflow: string; overscroll: string } | null = null

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (locks++ > 0) return
  const html = document.documentElement
  previous = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior }
  html.style.overflow = 'hidden'
  // Sin rebote elástico de la página en iOS/Android mientras el modal está abierto
  html.style.overscrollBehavior = 'none'
}

export function unlockScroll() {
  if (typeof document === 'undefined' || locks === 0) return
  if (--locks > 0) return
  const html = document.documentElement
  html.style.overflow = previous?.overflow ?? ''
  html.style.overscrollBehavior = previous?.overscroll ?? ''
  previous = null
}

/** Bloquea el scroll de fondo mientras `active` sea true (por defecto, mientras el componente esté montado). */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    lockScroll()
    return unlockScroll
  }, [active])
}
