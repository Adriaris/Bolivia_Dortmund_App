import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface BackLinkProps {
  href: string
  /** Texto accesible: "Volver al inicio", "Volver a la plantilla"… */
  label: string
  className?: string
}

/** Botón de volver de las cabeceras: solo el chevrón, sin borde ni fondo (estilo de la Pizarra). */
export default function BackLink({ href, label, className = '' }: BackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-800 transition-colors shrink-0 touch-manipulation ${className}`}
    >
      <ChevronLeft size={20} />
    </Link>
  )
}
