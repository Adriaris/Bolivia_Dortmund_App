'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'

export default function SyncFixturesButton() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)

  if (!isAdmin) return null

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-fixtures', { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('Error al sincronizar partidos')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors text-xs font-semibold disabled:opacity-50"
    >
      <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Sincronizando…' : 'Sincronizar'}
    </button>
  )
}
