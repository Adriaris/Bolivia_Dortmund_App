import Image from 'next/image'
import { getTeamLogo } from '@/lib/teams'

interface TeamLogoProps {
  name: string
  size?: number
  className?: string
}

export default function TeamLogo({ name, size = 40, className = '' }: TeamLogoProps) {
  const src = getTeamLogo(name)

  if (!src) {
    // Fallback: círculo con inicial
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 ${className}`}
      >
        <span className="text-zinc-400 font-black" style={{ fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 ${className}`}
    >
      <Image
        src={src}
        alt={name}
        fill
        className="object-contain"
        sizes={`${size}px`}
        // Los escudos servidos vía /api/proxy-image ya vienen cacheados del proxy
        unoptimized={src.startsWith('/api/')}
      />
    </div>
  )
}
