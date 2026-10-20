'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { signIn } from '@/lib/auth'
import Button from '@/components/ui/Button'

const DOMAIN = '@bvd04.fc'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(username.trim().toLowerCase() + DOMAIN, password)
      router.push('/')
      router.refresh()
    } catch {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <main className="safe-top min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-4">
            <Lock size={24} className="text-black" />
          </div>
          <h1 className="text-xl font-black text-white">Acceso admin</h1>
          <p className="text-xs text-zinc-600 mt-1 uppercase tracking-widest">Bolivia Dortmund</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              autoCapitalize="none"
              className="w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-white text-base focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-white text-base focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" variant="primary" fullWidth disabled={loading} className="mt-2">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  )
}
