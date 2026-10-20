'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

export default function SyncButton() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!isAdmin) return null

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    try {
      const [standingsRes, fixturesRes] = await Promise.all([
        fetch('/api/sync-standings', { method: 'POST' }),
        fetch('/api/sync-fixtures', { method: 'POST' }),
      ])
      const standingsData = await standingsRes.json()
      const fixturesData = await fixturesRes.json()
      if (!standingsRes.ok) throw new Error(standingsData.error)
      if (!fixturesRes.ok) throw new Error(fixturesData.error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-xs font-medium disabled:opacity-50"
      >
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Sincronizando…' : 'Sincronizar'}
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
