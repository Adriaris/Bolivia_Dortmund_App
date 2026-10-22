'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { PIN_LENGTH } from '@/lib/players'

interface PinInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'new-password' | 'current-password'
  autoFocus?: boolean
  invalid?: boolean
}

export default function PinInput({ id, label, value, onChange, autoComplete, autoFocus, invalid }: PinInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={PIN_LENGTH}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          placeholder="••••••"
          className={[
            'w-full pl-12 pr-12 py-3.5 rounded-xl bg-[#1f1f1f] border text-white text-center text-2xl font-black tracking-[0.5em] tabular-nums',
            'focus:outline-none transition-colors placeholder:text-zinc-700',
            invalid ? 'border-red-700 focus:border-red-500' : 'border-[#2a2a2a] focus:border-zinc-500',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white transition-colors"
          aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
