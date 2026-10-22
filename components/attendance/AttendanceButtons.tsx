'use client'

import { Check, Loader2, X } from 'lucide-react'
import type { AttendanceStatus } from '@/lib/types'

interface AttendanceButtonsProps {
  current: AttendanceStatus | null
  saving: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
}

/** "Voy / No voy" grandes, para una mano. */
export default function AttendanceButtons({ current, saving, onChange }: AttendanceButtonsProps) {
  const disabled = saving !== null

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('yes')}
          disabled={disabled}
          aria-pressed={current === 'yes'}
          className={`flex flex-col items-center justify-center gap-1.5 py-6 rounded-2xl font-black text-lg touch-manipulation select-none transition-colors disabled:opacity-60 ${
            current === 'yes'
              ? 'bg-bol-green text-white ring-2 ring-emerald-400/60'
              : 'bg-[#141414] border border-[#2a2a2a] text-white hover:bg-[#1f1f1f] active:bg-[#2a2a2a]'
          }`}
        >
          {saving === 'yes' ? <Loader2 size={26} className="animate-spin" /> : <Check size={26} strokeWidth={3} />}
          Voy
        </button>
        <button
          type="button"
          onClick={() => onChange('no')}
          disabled={disabled}
          aria-pressed={current === 'no'}
          className={`flex flex-col items-center justify-center gap-1.5 py-6 rounded-2xl font-black text-lg touch-manipulation select-none transition-colors disabled:opacity-60 ${
            current === 'no'
              ? 'bg-bol-red text-white ring-2 ring-red-400/60'
              : 'bg-[#141414] border border-[#2a2a2a] text-white hover:bg-[#1f1f1f] active:bg-[#2a2a2a]'
          }`}
        >
          {saving === 'no' ? <Loader2 size={26} className="animate-spin" /> : <X size={26} strokeWidth={3} />}
          No voy
        </button>
      </div>
      <p className="text-center text-xs text-zinc-500">
        {current === 'yes'
          ? 'Estás apuntado. Puedes cambiarlo hasta que empiece el partido.'
          : current === 'no'
            ? 'Has dicho que no vienes. Puedes cambiarlo hasta que empiece el partido.'
            : 'Aún no has respondido.'}
      </p>
    </div>
  )
}
