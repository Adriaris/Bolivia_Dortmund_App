'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Pencil, Copy, Check, ChevronDown } from 'lucide-react'
import { GiSoccerBall, GiGoalKeeper } from 'react-icons/gi'
import Scoreboard from '@/components/match/Scoreboard'
import Clock from '@/components/match/Clock'
import MatchControls from '@/components/match/MatchControls'
import EventList from '@/components/match/EventList'
import OurGoalModal from '@/components/match/OurGoalModal'
import OpponentGoalModal from '@/components/match/OpponentGoalModal'
import SaveModal from '@/components/match/SaveModal'
import EditEventModal from '@/components/match/EditEventModal'
import EditMatchModal from '@/components/match/EditMatchModal'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  updateMatch,
  addGoal,
  addSave,
  getMatch,
  getMatchEvents,
  startClock,
  pauseClock,
  finishMatch,

  deleteMatch,
  deleteMatchEvent,
  updateMatchEvent,
} from '@/lib/supabase/queries'
import { supabase } from '@/lib/supabase/client'
import { computeElapsedSeconds, computeMatchMinute } from '@/lib/clock'
import type { GoalType, Match, MatchEventWithPlayers, Period, Player, Tournament } from '@/lib/types'

const goalTypeSuffix: Record<string, string> = {
  normal: '',
  free_kick: ' TL',
  penalty: ' PEN',
}

function buildScorerLines(events: MatchEventWithPlayers[]): { key: string; text: string }[] {
  const ourGoals = events.filter((e) => e.event_type === 'goal' && e.team_side === 'ours')
  const byScorer = new Map<string, { name: string; minutes: string[] }>()

  for (const e of ourGoals) {
    const key = e.scorer_player_id ?? '__unknown__'
    const name = e.scorer ? (e.scorer.alias ?? e.scorer.name) : 'Desconocido'
    const suffix = goalTypeSuffix[e.goal_type ?? 'normal'] ?? ''
    const min = e.minute != null ? `${e.minute}'${suffix}` : `—'`
    if (!byScorer.has(key)) byScorer.set(key, { name, minutes: [] })
    byScorer.get(key)!.minutes.push(min)
  }

  return Array.from(byScorer.entries()).map(([key, { name, minutes }]) => ({
    key,
    text: `${name} ${minutes.join(', ')}`,
  }))
}

interface LiveMatchClientProps {
  initialMatch: Match
  initialEvents: MatchEventWithPlayers[]
  players: Player[]
  tournaments: Tournament[]
}

type ModalState =
  | { type: 'none' }
  | { type: 'our_goal' }
  | { type: 'opponent_goal' }
  | { type: 'save' }
  | { type: 'edit_event'; event: MatchEventWithPlayers }
  | { type: 'edit_match' }

export default function LiveMatchClient({
  initialMatch,
  initialEvents,
  players,
  tournaments,
}: LiveMatchClientProps) {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [match, setMatch] = useState<Match>(initialMatch)
  const [events, setEvents] = useState<MatchEventWithPlayers[]>(initialEvents)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [loading, setLoading] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopyLine = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const refresh = useCallback(async () => {
    const [updatedMatch, updatedEvents] = await Promise.all([
      getMatch(match.id),
      getMatchEvents(match.id),
    ])
    setMatch(updatedMatch)
    setEvents(updatedEvents)
  }, [match.id])

  // ── Realtime (partido + eventos) ──────────────────────────
  useEffect(() => {
    let isActive = true

    const syncEvents = async () => {
      try {
        const updatedEvents = await getMatchEvents(match.id)
        if (isActive) setEvents(updatedEvents)
      } catch {
        // Si falla temporalmente, mantenemos el estado actual.
      }
    }

    const channel = supabase
      .channel(`live_match:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            router.push('/')
            return
          }
          setMatch(payload.new as Match)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          void syncEvents()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refresh()
        }
      })

    return () => {
      isActive = false
      void supabase.removeChannel(channel)
    }
  }, [match.id, refresh, router])

  // ── Clock ──────────────────────────────────────────────────
  const handleStart = async () => {
    setLoading(true)
    try {
      const period =
        match.status === 'pending' || match.status === 'postponed' || match.status === 'first_half'
          ? 'first_half'
          : 'second_half'
      setMatch(await startClock(match.id, period))
    } finally { setLoading(false) }
  }

  const handlePause = async () => {
    setLoading(true)
    try {
      const elapsed = computeElapsedSeconds(match, match.current_period)
      setMatch(await pauseClock(match.id, elapsed, match.current_period))
    } finally { setLoading(false) }
  }

  const handleSecondHalf = async () => {
    setLoading(true)
    try {
      if (match.is_clock_running) {
        await pauseClock(match.id, computeElapsedSeconds(match, 'first_half'), 'first_half')
      }
      setMatch(await updateMatch(match.id, {
        current_period: 'second_half',
        status: 'half_time',
        is_clock_running: false,
        period_started_at: null,
      }))
    } finally { setLoading(false) }
  }

  const handleFinish = async () => {
    if (!confirm('¿Finalizar el partido?')) return
    setLoading(true)
    try {
      const elapsed = computeElapsedSeconds(match, match.current_period)
      setMatch(await finishMatch(match.id, elapsed, match.current_period))
    } finally { setLoading(false) }
  }

  // ── Goals ──────────────────────────────────────────────────
  const handleOurGoal = async ({ scorerId, assistId, goalType }: {
    scorerId: string; assistId: string | null; goalType: GoalType
  }) => {
    setLoading(true)
    try {
      await addGoal({
        match_id: match.id,
        team_side: 'ours',
        minute: computeMatchMinute(match),
        period: match.current_period,
        goal_type: goalType,
        scorer_player_id: scorerId,
        assist_player_id: assistId,
      })
      await updateMatch(match.id, { our_score: match.our_score + 1 })
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  const handleOpponentGoal = async (goalType: GoalType) => {
    setLoading(true)
    try {
      await addGoal({
        match_id: match.id,
        team_side: 'opponent',
        minute: computeMatchMinute(match),
        period: match.current_period,
        goal_type: goalType,
      })
      await updateMatch(match.id, { opponent_score: match.opponent_score + 1 })
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async (goalkeeperPlayerId: string | null) => {
    setLoading(true)
    try {
      await addSave({
        match_id: match.id,
        minute: computeMatchMinute(match),
        period: match.current_period,
        goalkeeper_player_id: goalkeeperPlayerId,
      })
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  // ── Edit event ─────────────────────────────────────────────
  const handleEditEventSave = async (updates: {
    scorer_player_id: string | null
    assist_player_id: string | null
    goal_type: GoalType | null
    minute: number | null
    period: Period
  }) => {
    if (modal.type !== 'edit_event') return
    setLoading(true)
    try {
      await updateMatchEvent(modal.event.id, updates)
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  const handleDeleteEvent = async () => {
    if (modal.type !== 'edit_event') return
    setLoading(true)
    try {
      const event = modal.event
      await deleteMatchEvent(event.id)
      // Ajustar marcador solo para goles (las paradas no afectan el marcador)
      if (event.event_type === 'goal') {
        if (event.team_side === 'ours') {
          await updateMatch(match.id, { our_score: Math.max(0, match.our_score - 1) })
        } else {
          await updateMatch(match.id, { opponent_score: Math.max(0, match.opponent_score - 1) })
        }
      }
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  // ── Edit match ─────────────────────────────────────────────
  const handleEditMatchSave = async (updates: Partial<Match>) => {
    setLoading(true)
    try {
      // Walkover (no presentado): guardar marcador sin crear eventos de gol (no afecta estadísticas)
      if (updates.status === 'walkover') {
        setMatch(await updateMatch(match.id, updates))
        setModal({ type: 'none' })
        await refresh()
        return
      }

      const newOurScore = updates.our_score ?? match.our_score
      const newOppScore = updates.opponent_score ?? match.opponent_score
      const ourDiff = newOurScore - match.our_score
      const oppDiff = newOppScore - match.opponent_score
      const minute = computeMatchMinute(match)
      const period = match.current_period

      const goalPromises: Promise<unknown>[] = []
      for (let i = 0; i < ourDiff; i++) {
        goalPromises.push(addGoal({
          match_id: match.id,
          team_side: 'ours',
          minute,
          period,
          goal_type: 'normal',
          scorer_player_id: null,
          assist_player_id: null,
        }))
      }
      for (let i = 0; i < oppDiff; i++) {
        goalPromises.push(addGoal({
          match_id: match.id,
          team_side: 'opponent',
          minute,
          period,
          goal_type: 'normal',
        }))
      }
      await Promise.all(goalPromises)

      setMatch(await updateMatch(match.id, updates))
      setModal({ type: 'none' })
      await refresh()
    } finally { setLoading(false) }
  }

  const handleDeleteMatch = async () => {
    setLoading(true)
    try {
      await deleteMatch(match.id)
      router.push('/')
    } finally { setLoading(false) }
  }

  const isActive = match.status === 'first_half' || match.status === 'second_half'

  return (
    <div className="flex flex-col gap-5">
      {/* Marcador + botón editar partido (solo admin) */}
      <div className="relative">
        <Scoreboard match={match} />
        {isAdmin && (
          <button
            onClick={() => setModal({ type: 'edit_match' })}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-zinc-500 hover:text-white hover:bg-black/60 transition-colors"
            title="Editar partido"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Cronómetro */}
      <Clock match={match} />

      {/* Controles (solo admin) */}
      {isAdmin && (
        <MatchControls
          match={match}
          onStart={handleStart}
          onPause={handlePause}
          onSecondHalf={handleSecondHalf}
          onFinish={handleFinish}

          loading={loading}
        />
      )}

      {/* Botones de gol/parada (solo admin, solo cuando activo) */}
      {isAdmin && match.status !== 'finished' && match.status !== 'walkover' && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setModal({ type: 'our_goal' })}
              disabled={!isActive || loading}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-100 active:bg-zinc-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <GiSoccerBall size={26} />
              Gol nuestro
            </button>
            <button
              onClick={() => setModal({ type: 'opponent_goal' })}
              disabled={!isActive || loading}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] text-red-400 font-bold text-sm hover:bg-[#1f1f1f] active:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <GiSoccerBall size={26} />
              Gol rival
            </button>
          </div>
          <button
            onClick={() => setModal({ type: 'save' })}
            disabled={!isActive || loading}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#0a1520] border border-cyan-900/40 text-cyan-400 font-bold text-sm hover:bg-[#0f1f30] active:bg-[#162840] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <GiGoalKeeper size={22} />
            Parada
          </button>
        </div>
      )}

      {/* Eventos — en walkover se muestra aviso visual en lugar de la lista vacía */}
      {match.status === 'walkover' ? (
        <div className="border-t border-[#1f1f1f] pt-4">
          <div className="flex flex-col items-center gap-2 py-8 px-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-center">
            <Ban size={22} className="text-amber-500" />
            <p className="text-sm font-bold text-white">Partido no disputado</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El rival no se presentó.
              <br />
              Victoria oficial {match.our_score}–{match.opponent_score} para el Bolivia Dortmund.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#1f1f1f] pt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">
            Eventos
          </h2>
          <EventList
            events={events}
            onEditEvent={isAdmin ? (event) => setModal({ type: 'edit_event', event }) : undefined}
          />
        </div>
      )}

      {/* Resumen partido — solo admin, solo finalizado */}
      {isAdmin && match.status === 'finished' && (() => {
        const lines = buildScorerLines(events)
        if (lines.length === 0) return null
        return (
          <div className="rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <span>Resumen partido</span>
              <ChevronDown
                size={16}
                className={`text-zinc-500 transition-transform duration-300 ${summaryOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {summaryOpen && (
              <div className="border-t border-[#2a2a2a] summary-open">
                {lines.map(({ key, text }) => (
                  <div key={key} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1f1f1f] last:border-0">
                    <span className="text-sm text-white font-medium flex-1">{text}</span>
                    <button
                      onClick={() => handleCopyLine(key, text)}
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copiedKey === key
                          ? 'bg-green-950/50 text-green-400'
                          : 'bg-[#1f1f1f] text-zinc-500 hover:text-white'
                      }`}
                    >
                      {copiedKey === key ? <Check size={11} /> : <Copy size={11} />}
                      {copiedKey === key ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Modales ── */}
      {modal.type === 'our_goal' && (
        <OurGoalModal
          players={players}
          onSave={handleOurGoal}
          onClose={() => setModal({ type: 'none' })}
          loading={loading}
        />
      )}
      {modal.type === 'opponent_goal' && (
        <OpponentGoalModal
          opponentName={match.opponent_name}
          onSave={handleOpponentGoal}
          onClose={() => setModal({ type: 'none' })}
          loading={loading}
        />
      )}
      {modal.type === 'save' && (
        <SaveModal
          players={players}
          onSave={handleSave}
          onClose={() => setModal({ type: 'none' })}
          loading={loading}
        />
      )}
      {modal.type === 'edit_event' && (
        <EditEventModal
          event={modal.event}
          players={players}
          onSave={handleEditEventSave}
          onDelete={handleDeleteEvent}
          onClose={() => setModal({ type: 'none' })}
          loading={loading}
        />
      )}
      {modal.type === 'edit_match' && (
        <EditMatchModal
          match={match}
          tournaments={tournaments}
          onSave={handleEditMatchSave}
          onDelete={handleDeleteMatch}
          onClose={() => setModal({ type: 'none' })}
          loading={loading}
        />
      )}
    </div>
  )
}
