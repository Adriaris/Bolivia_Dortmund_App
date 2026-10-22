'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Ban, ChevronDown, ChevronRight, Loader2, Radio, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import ConvocatoriaHeader from '@/components/attendance/ConvocatoriaHeader'
import AttendanceButtons from '@/components/attendance/AttendanceButtons'
import AttendanceLists from '@/components/attendance/AttendanceLists'
import ShareConvocatoriaButton from '@/components/attendance/ShareConvocatoriaButton'
import type { RosterEntry } from '@/components/attendance/types'
import MvpVoting, { type MvpCandidate } from '@/components/mvp/MvpVoting'
import MvpReveal from '@/components/mvp/MvpReveal'
import { getMatch } from '@/lib/supabase/queries'
import { supabase } from '@/lib/supabase/client'
import {
  attendanceErrorMessage,
  castMvpVote,
  closeMvpVoting,
  getMatchAttendance,
  getMatchMvps,
  getMvpStatus,
  getRegisteredPlayerIds,
  mvpErrorMessage,
  parseMvpError,
  setAttendanceAsAdmin,
  setMyAttendance,
  type MatchAttendanceWithPlayer,
  type MatchMvpWithPlayer,
} from '@/lib/supabase/mvp'
import type { AttendanceStatus, Match, MvpStatus, Player } from '@/lib/types'

type Phase = 'attendance' | 'live' | 'voting' | 'closed' | 'walkover'

const VOTING_POLL_MS = 10_000
const IDLE_POLL_MS = 30_000

interface ConvocatoriaClientProps {
  initialMatch: Match
  players: Player[]
  roster: RosterEntry[]
  initialAttendance: MatchAttendanceWithPlayer[]
  registeredIds: string[]
  initialMvps: MatchMvpWithPlayer[]
  initialStatus: MvpStatus | null
}

function phaseOf(match: Match, status: MvpStatus | null): Phase {
  switch (match.status) {
    case 'pending':
    case 'postponed':
      return 'attendance'
    case 'first_half':
    case 'half_time':
    case 'second_half':
      return 'live'
    case 'walkover':
      return 'walkover'
    case 'finished':
      return match.mvp_closed_at !== null || status?.closed ? 'closed' : 'voting'
  }
}

const EYEBROW: Record<Phase, string> = {
  attendance: 'Convocatoria',
  live: 'Partido en juego',
  voting: 'Votación MVP',
  closed: 'MVP del partido',
  walkover: 'Convocatoria',
}

export default function ConvocatoriaClient({
  initialMatch,
  players,
  roster,
  initialAttendance,
  registeredIds,
  initialMvps,
  initialStatus,
}: ConvocatoriaClientProps) {
  const matchId = initialMatch.id
  const { user, isAdmin, playerId, loading: authLoading } = useAuth()

  const [match, setMatch] = useState<Match>(initialMatch)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [status, setStatus] = useState<MvpStatus | null>(initialStatus)
  const [mvps, setMvps] = useState(initialMvps)
  const [registered, setRegistered] = useState<Set<string>>(() => new Set(registeredIds))
  const [savingMine, setSavingMine] = useState<AttendanceStatus | null>(null)
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fixOpen, setFixOpen] = useState(false)
  // El estado inicial viene del servidor como anónimo: hasta recalcularlo con la sesión
  // no sabemos si "yo" puedo votar
  const [statusIsMine, setStatusIsMine] = useState(false)

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const phase = phaseOf(match, status)
  const joinHref = `/jugadores?soy=1&next=${encodeURIComponent(`/convocatoria/${matchId}`)}`

  // ── Índices ───────────────────────────────────────────────
  const playersById = useMemo(() => {
    const map: Record<string, Player> = {}
    for (const p of players) map[p.id] = p
    for (const a of attendance) if (a.player) map[a.player_id] = a.player
    return map
  }, [players, attendance])

  const numberById = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of players) map[p.id] = p.number
    for (const r of roster) map[r.player.id] = r.number // dorsal del split
    return map
  }, [players, roster])

  const candidates: MvpCandidate[] = useMemo(
    () =>
      attendance
        .filter((a) => a.status === 'yes' && a.player)
        .map((a) => ({ player: a.player as Player, number: numberById[a.player_id] ?? a.player!.number }))
        .sort((x, y) => x.number - y.number),
    [attendance, numberById]
  )

  const myRow = playerId ? attendance.find((a) => a.player_id === playerId) ?? null : null

  // ── Carga ─────────────────────────────────────────────────
  const loadMvps = useCallback(async () => {
    const rows = await getMatchMvps(matchId).catch(() => null)
    if (rows && alive.current) setMvps(rows)
  }, [matchId])

  const refreshAll = useCallback(async () => {
    const [m, a, s, r] = await Promise.all([
      getMatch(matchId).catch(() => null),
      getMatchAttendance(matchId).catch(() => null),
      getMvpStatus(matchId).catch(() => null),
      getRegisteredPlayerIds().catch(() => null),
    ])
    if (!alive.current) return
    if (m) setMatch(m)
    if (a) setAttendance(a)
    if (s) { setStatus(s); setStatusIsMine(true) }
    if (r) setRegistered(new Set(r))
    if (m?.mvp_closed_at || s?.closed) await loadMvps()
  }, [matchId, loadMvps])

  // Recalcular con la sesión (puedo votar, quién falta…) cuando se resuelve el login
  useEffect(() => {
    if (authLoading) return
    void refreshAll()
  }, [authLoading, user?.id, playerId, isAdmin, refreshAll])

  // Polling solo con la pestaña visible: 10 s con la votación abierta, 30 s antes/durante el partido
  useEffect(() => {
    if (phase === 'closed' || phase === 'walkover') return
    const ms = phase === 'voting' ? VOTING_POLL_MS : IDLE_POLL_MS
    const tick = () => {
      if (document.visibilityState === 'visible') void refreshAll()
    }
    const interval = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [phase, refreshAll])

  // Realtime del partido: empieza, termina o se cierra la votación → refrescar al momento
  useEffect(() => {
    const channel = supabase
      .channel(`convocatoria:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          setMatch(payload.new as Match)
          void refreshAll()
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [matchId, refreshAll])

  // ── Acciones ──────────────────────────────────────────────
  const reloadAttendance = async () => {
    const [a, s] = await Promise.all([
      getMatchAttendance(matchId).catch(() => null),
      getMvpStatus(matchId).catch(() => null),
    ])
    if (!alive.current) return
    if (a) setAttendance(a)
    if (s) { setStatus(s); setStatusIsMine(true) }
  }

  const handleMine = async (next: AttendanceStatus) => {
    if (!playerId) return
    setSavingMine(next)
    setActionError(null)
    try {
      await setMyAttendance(matchId, playerId, next)
      await reloadAttendance()
    } catch (err) {
      setActionError(attendanceErrorMessage(err))
      void refreshAll()
    } finally {
      if (alive.current) setSavingMine(null)
    }
  }

  const handleAdminSet = async (pid: string, next: AttendanceStatus | null) => {
    setBusyPlayerId(pid)
    setActionError(null)
    try {
      await setAttendanceAsAdmin(matchId, pid, next)
      await reloadAttendance()
    } catch {
      setActionError('No se ha podido guardar la asistencia. Revisa la conexión.')
    } finally {
      if (alive.current) setBusyPlayerId(null)
    }
  }

  const handleVote = async (votedPlayerId: string) => {
    try {
      const s = await castMvpVote(matchId, votedPlayerId)
      setStatus(s)
      setStatusIsMine(true)
      if (s.closed) await refreshAll()
    } catch (err) {
      const code = parseMvpError(err)
      if (code === 'already_voted' || code === 'voting_closed' || code === 'not_attended') void refreshAll()
      throw new Error(mvpErrorMessage(err))
    }
  }

  const handleCloseVoting = async () => {
    try {
      const s = await closeMvpVoting(matchId)
      setStatus(s)
      await refreshAll()
    } catch (err) {
      throw new Error(mvpErrorMessage(err))
    }
  }

  // ── Render ────────────────────────────────────────────────
  // Admin puede corregir la asistencia en cualquier momento hasta cerrar la votación
  const adminCanEdit = isAdmin && (phase === 'attendance' || phase === 'live' || phase === 'voting')

  const matchLink = (
    <Link
      href={`/matches/${matchId}`}
      className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] text-sm font-semibold text-zinc-300 hover:border-zinc-600 active:bg-[#1f1f1f] transition-colors"
    >
      {phase === 'live' ? 'Seguir el partido en directo' : 'Ver ficha del partido'}
      <ChevronRight size={16} className="text-zinc-600" />
    </Link>
  )

  return (
    <div className="flex flex-col gap-6">
      <ConvocatoriaHeader match={match} eyebrow={EYEBROW[phase]} />

      {/* ── Fase de asistencia ── */}
      {phase === 'attendance' && (
        <>
          {authLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-zinc-600" />
            </div>
          ) : playerId ? (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 px-1">¿Vienes?</h2>
              <AttendanceButtons current={myRow?.status ?? null} saving={savingMine} onChange={handleMine} />
            </section>
          ) : isAdmin ? (
            <p className="flex items-center gap-2 text-xs text-zinc-500 px-1">
              <ShieldCheck size={13} className="text-amber-500" />
              Cuenta admin: marca la asistencia de cualquiera desde la lista.
            </p>
          ) : (
            <div className="rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <UserRound size={20} className="text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">
                  ¿Eres del equipo? Identifícate para decir si vienes y, después del partido, votar al MVP.
                </p>
              </div>
              <Link
                href={joinHref}
                className="inline-flex items-center justify-center py-4 rounded-xl bg-bol-yellow text-black text-base font-black hover:bg-[#e8d400] active:bg-[#d6c400] touch-manipulation"
              >
                Soy jugador
              </Link>
            </div>
          )}

          {actionError && <p className="text-sm text-red-400 text-center -mt-2">{actionError}</p>}

          <AttendanceLists
            roster={roster}
            attendance={attendance}
            numberById={numberById}
            registeredIds={registered}
            meId={playerId}
            editable={adminCanEdit}
            busyPlayerId={busyPlayerId}
            onAdminSet={handleAdminSet}
          />

          <ShareConvocatoriaButton match={match} variant="block" />
        </>
      )}

      {/* ── Partido en juego ── */}
      {phase === 'live' && (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-red-950/20 border border-red-900/40 px-4 py-4">
            <Radio size={18} className="text-red-500 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Partido en juego</p>
              <p className="text-xs text-zinc-500 mt-0.5">Al terminar se abrirá aquí la votación del MVP.</p>
            </div>
          </div>
          {matchLink}
          {actionError && <p className="text-sm text-red-400 text-center">{actionError}</p>}
          <AttendanceLists
            roster={roster}
            attendance={attendance}
            numberById={numberById}
            registeredIds={registered}
            meId={playerId}
            editable={adminCanEdit}
            busyPlayerId={busyPlayerId}
            onAdminSet={handleAdminSet}
            yesTitle="Convocados"
            showNo={isAdmin}
            showNoResponse={isAdmin}
          />
        </>
      )}

      {/* ── Votación abierta ── */}
      {phase === 'voting' && (
        <>
          {status ? (
            <MvpVoting
              status={status}
              candidates={candidates}
              playersById={playersById}
              meId={playerId}
              isAdmin={isAdmin}
              authLoading={authLoading || !statusIsMine}
              joinHref={joinHref}
              onVote={handleVote}
              onCloseVoting={handleCloseVoting}
            />
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-zinc-600" />
            </div>
          )}

          <ShareConvocatoriaButton match={match} variant="block" />

          {/* Quién jugó — admin puede corregirlo mientras la votación siga abierta */}
          <section className="rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <button
              type="button"
              onClick={() => setFixOpen((v) => !v)}
              aria-expanded={fixOpen}
              className="flex items-center justify-between w-full px-4 py-3.5 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <span>
                {isAdmin ? 'Corregir asistencia' : 'Jugaron'}
                <span className="text-zinc-600 tabular-nums ml-1.5">{candidates.length}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-zinc-500 motion-safe:transition-transform motion-safe:duration-300 ${fixOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {fixOpen && (
              <div className="border-t border-[#2a2a2a] p-3 summary-open">
                {isAdmin && (
                  <p className="text-[11px] text-zinc-500 mb-3 px-1">
                    Cambiar quién jugó actualiza quién puede votar y a quién se puede votar.
                  </p>
                )}
                {actionError && <p className="text-sm text-red-400 text-center mb-3">{actionError}</p>}
                <AttendanceLists
                  roster={roster}
                  attendance={attendance}
                  numberById={numberById}
                  registeredIds={registered}
                  meId={playerId}
                  editable={adminCanEdit}
                  busyPlayerId={busyPlayerId}
                  onAdminSet={handleAdminSet}
                  yesTitle="Jugaron"
                  noTitle="No jugaron"
                  showNo={isAdmin}
                  showNoResponse={isAdmin}
                />
              </div>
            )}
          </section>

          {matchLink}
        </>
      )}

      {/* ── Votación cerrada ── */}
      {phase === 'closed' && (
        <>
          <MvpReveal
            mvps={mvps}
            results={status?.results ?? null}
            playersById={playersById}
            numberById={numberById}
          />
          {matchLink}
        </>
      )}

      {/* ── Walkover ── */}
      {phase === 'walkover' && (
        <>
          <div className="flex flex-col items-center gap-2 py-8 px-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-center">
            <Ban size={22} className="text-amber-500" />
            <p className="text-sm font-bold text-white">Ganado por incomparecencia, sin votación</p>
            <p className="text-xs text-zinc-400">El rival no se presentó: no hay MVP en este partido.</p>
          </div>
          {matchLink}
        </>
      )}
    </div>
  )
}
