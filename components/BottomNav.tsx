'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HiHome,           HiOutlineHome,
  HiCalendarDays,   HiOutlineCalendarDays,
  HiChartBar,       HiOutlineChartBar,
  HiUsers,          HiOutlineUsers,
  HiTableCells,     HiOutlineTableCells,
} from 'react-icons/hi2'
import { useState } from 'react'

const tabs = [
  { href: '/',               outline: HiOutlineHome,          fill: HiHome,          label: 'Inicio'        },
  { href: '/proximos',       outline: HiOutlineCalendarDays,  fill: HiCalendarDays,  label: 'Próximos'      },
  { href: '/clasificacion',  outline: HiOutlineTableCells,    fill: HiTableCells,    label: 'Tabla'         },
  { href: '/estadisticas',   outline: HiOutlineChartBar,      fill: HiChartBar,      label: 'Stats'         },
  { href: '/jugadores',      outline: HiOutlineUsers,         fill: HiUsers,         label: 'Plantilla'     },
]

const HIDDEN_ON = ['/matches/']

const tabBase = 'flex-1 flex flex-col items-center gap-1 pt-2 pb-3 select-none touch-manipulation'

export default function BottomNav() {
  const pathname = usePathname()
  const [poppingKey, setPoppingKey] = useState<string | null>(null)

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a0a] border-t border-[#1f1f1f]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(({ href, outline: OutlineIcon, fill: FillIcon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const Icon = active ? FillIcon : OutlineIcon

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={tabBase}
              onClick={() => setPoppingKey(href)}
            >
              <span
                className={poppingKey === href ? 'tab-pop' : ''}
                onAnimationEnd={() => setPoppingKey(null)}
              >
                <Icon size={24} className={active ? 'text-bol-yellow' : 'text-zinc-500'} />
              </span>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-bol-yellow' : 'text-zinc-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
