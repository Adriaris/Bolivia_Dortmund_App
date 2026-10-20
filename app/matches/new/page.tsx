'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createMatch, getTournaments } from '@/lib/supabase/queries'
import { CURRENT_OPPONENTS } from '@/lib/teams'
import Button from '@/components/ui/Button'
import TeamLogo from '@/components/ui/TeamLogo'
import type { Tournament } from '@/lib/types'

// Rivales del split en curso — se mantiene en lib/teams.ts al cambiar de temporada
const OPPONENT_TEAMS = CURRENT_OPPONENTS

export default function NewMatchPage() {
  const router = useRouter()
  const [opponentName, setOpponentName] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [matchTime, setMatchTime] = useState('')
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTournaments().then((data) => {
      setTournaments(data)
      // Torneo activo por defecto; si no hay, el más reciente
      const current = data.find((t) => t.is_current) ?? data[0]
      if (current) setTournamentId(current.id)
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!opponentName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const match = await createMatch({
        opponent_name: opponentName.trim(),
        match_date: matchDate,
        match_time: matchTime.trim() || null,
        tournament_id: tournamentId,
      })
      router.push(`/matches/${match.id}`)
    } catch {
      setError('Error al crear el partido. Comprueba la conexión.')
      setLoading(false)
    }
  }

  return (
    <main className="safe-top min-h-screen bg-black px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-lg font-bold text-white">Nuevo partido</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Torneo */}
        {tournaments.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Torneo
            </label>
            <div className="flex flex-col gap-2">
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTournamentId(t.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    tournamentId === t.id
                      ? 'bg-white/5 border-white text-white'
                      : 'bg-[#141414] border-[#2a2a2a] text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-semibold">{t.short_name}</span>
                  <span className="text-xs text-zinc-500">{t.season}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rival */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Rival
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OPPONENT_TEAMS.map((team) => {
              const selected = opponentName === team
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => setOpponentName(team)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-white/5 border-white text-white'
                      : 'bg-[#141414] border-[#2a2a2a] text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <TeamLogo name={team} size={36} />
                  <span className="text-sm font-medium leading-tight">{team}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fecha */}
        <div>
          <label htmlFor="date" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Fecha
          </label>
          <input
            id="date"
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-white text-base focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Hora (opcional) */}
        <div>
          <label htmlFor="time" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Hora <span className="text-zinc-700 normal-case font-normal">(opcional)</span>
          </label>
          <input
            id="time"
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl bg-[#141414] border border-[#2a2a2a] text-white text-base focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-4 py-3 rounded-xl">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          variant="primary"
          fullWidth
          disabled={loading || !opponentName}
          className="mt-2"
        >
          {loading ? 'Creando...' : 'Crear partido'}
        </Button>
      </form>
    </main>
  )
}
