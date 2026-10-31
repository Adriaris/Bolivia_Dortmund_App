'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cropToBlob, type CropArea } from '@/lib/photos'

interface PhotoCropperProps {
  file: File
  busy?: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4

interface Offset {
  x: number
  y: number
}

/**
 * Encuadre de la foto antes de subirla: arrastrar para mover, pellizcar / rueda /
 * barra para acercar. La zona dentro del círculo es la que se guarda (cuadrada).
 * Sin dependencias: pointer events + transform CSS.
 */
export default function PhotoCropper({ file, busy = false, onCancel, onConfirm }: PhotoCropperProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [viewport, setViewport] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)
  const [cropping, setCropping] = useState(false)

  // Valores actuales para los gestos y la rueda (evita cierres obsoletos)
  const zoomRef = useRef(1)
  const offsetRef = useRef<Offset>({ x: 0, y: 0 })

  // Gestos en curso (no provocan render)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  // URL temporal de la imagen elegida
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Tamaño del recuadro (se adapta al ancho del móvil)
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setViewport(el.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Escala para que la imagen cubra el recuadro con zoom 1
  const baseScale = natural && viewport ? viewport / Math.min(natural.w, natural.h) : 1
  const scale = baseScale * zoom

  const clamp = useCallback(
    (o: Offset, z: number): Offset => {
      if (!natural || !viewport) return o
      const s = baseScale * z
      const maxX = Math.max(0, (natural.w * s - viewport) / 2)
      const maxY = Math.max(0, (natural.h * s - viewport) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [natural, viewport, baseScale]
  )

  // Única vía para cambiar zoom/posición: siempre dentro de los límites
  const update = useCallback(
    (z: number, o: Offset) => {
      const zc = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
      const oc = clamp(o, zc)
      zoomRef.current = zc
      offsetRef.current = oc
      setZoom(zc)
      setOffset(oc)
    },
    [clamp]
  )

  // Cambia el zoom manteniendo fijo el centro del recuadro
  const applyZoom = useCallback(
    (next: number) => {
      const prevZ = zoomRef.current
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
      const o = offsetRef.current
      update(z, { x: (o.x * z) / prevZ, y: (o.y * z) / prevZ })
    },
    [update]
  )

  // Al cambiar el tamaño del recuadro o cargar la imagen, recolocar dentro de los límites
  useEffect(() => {
    update(zoomRef.current, offsetRef.current)
  }, [viewport, natural, update])

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const curr = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, curr)

    if (pointers.current.size === 1) {
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      const o = offsetRef.current
      update(zoomRef.current, { x: o.x + dx, y: o.y + dy })
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current.dist > 0) applyZoom((pinch.current.zoom * dist) / pinch.current.dist)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  // Rueda del ratón (ordenador). Listener nativo para poder evitar el scroll de la página.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * 0.0015))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyZoom])

  const reset = () => update(1, { x: 0, y: 0 })

  async function handleConfirm() {
    const img = imgRef.current
    if (!img || !natural || !viewport) return
    setCropping(true)
    setError(null)
    try {
      // Zona visible del recuadro en píxeles de la imagen original
      const size = viewport / scale
      const area: CropArea = {
        x: natural.w / 2 - offset.x / scale - size / 2,
        y: natural.h / 2 - offset.y / scale - size / 2,
        size,
      }
      onConfirm(await cropToBlob(img, area))
    } catch {
      setError('No se pudo procesar la foto. Prueba con otra (JPG o PNG).')
    } finally {
      setCropping(false)
    }
  }

  const working = busy || cropping

  return (
    <div className="flex flex-col items-center gap-4 pb-2">
      <div
        ref={viewportRef}
        className="relative w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden bg-black touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Encuadre de la foto: arrastra para mover, pellizca para acercar"
        role="application"
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen local (objectURL) a recortar
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setError('No se pudo abrir la imagen. Prueba con otra (JPG o PNG).')}
            className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
            style={
              natural
                ? {
                    width: natural.w,
                    height: natural.h,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                  }
                : { opacity: 0 }
            }
          />
        )}

        {/* Guía: lo de fuera del círculo se oscurece; la foto se verá redonda */}
        {natural && (
          <div className="absolute inset-0 rounded-full pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-inset ring-white/80" />
        )}

        {!natural && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        )}

        {working && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Zoom */}
      <div className="w-full max-w-[300px] flex items-center gap-3">
        <button
          type="button"
          onClick={() => applyZoom(zoom - 0.25)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1f1f1f] text-zinc-400 hover:text-white"
          aria-label="Alejar"
          disabled={working}
        >
          <ZoomOut size={16} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="flex-1 accent-[#F9E300] touch-none"
          aria-label="Zoom"
          disabled={working || !natural}
        />
        <button
          type="button"
          onClick={() => applyZoom(zoom + 0.25)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1f1f1f] text-zinc-400 hover:text-white"
          aria-label="Acercar"
          disabled={working}
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Arrastra para mover · pellizca o usa la barra para acercar
        {(zoom !== 1 || offset.x !== 0 || offset.y !== 0) && (
          <>
            {' · '}
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-zinc-300 underline-offset-2 hover:underline">
              <RotateCcw size={11} /> Centrar
            </button>
          </>
        )}
      </p>

      {error && (
        <p className="w-full text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
      )}

      <div className="w-full grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={working}>
          Cancelar
        </Button>
        <Button size="lg" onClick={handleConfirm} disabled={working || !natural}>
          Usar foto
        </Button>
      </div>
    </div>
  )
}
