'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Lock, Star, UserRound } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { displayName } from '@/lib/supabase/mvp'
import type { MvpStatus, Player } from '@/lib/types'

export interface MvpCandidate {
  player: Player
  number: number
}

interface MvpVotingProps {
  status: MvpStatus
  /** Asistentes 'yes' (incluido yo: se filtra aquí) */
  candidates: MvpCandidate[]
  playersById: Record<string, Player>
  meId: string | null
  isAdmin: boolean
  authLoading: boolean
  joinHref: string
  onVote: (playerId: string) => Promise<void>
  onCloseVoting: () => Promise<void>
}

export default function MvpVoting({
  status,
  candidates,
  playersById,
  meId,
  isAdmin,
  authLoading,
  joinHref,
  onVote,
  onCloseVoting,
}: MvpVotingProps) {
  const [selected, setSelected] = useState<MvpCandidate | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = Math.max(0, status.eligible - status.voted)
  const pct = status.eligible > 0 ? Math.round((status.voted / status.eligible) * 100) : 0
  const choices = candidates.filter((c) => c.player.id !== meId)
  const myVote = candidates.find((c) => c.player.id === status.me_voted_player_id) ?? null

  const handleVote = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await onVote(selected.player.id)
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleClose = async () => {
    setBusy(true)
    setError(null)
    try {
      await onCloseVoting()
      setConfirmClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const pendingNames = (status.pending_player_ids ?? [])
    .map((id) => playersById[id])
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => a.number - b.number)

  return (
    <div className="flex flex-col gap-5">
      {/* Progreso — nunca resultados parciales */}
      <div className="rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Star size={14} className="text-bol-yellow fill-bol-yellow" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Votación MVP abierta</h2>
        </div>
        <p className="text-lg font-black text-white tabular-nums">
          {status.voted} de {status.eligible} han votado
          {missing > 0 && <span className="text-zinc-500 font-semibold text-sm"> · faltan {missing}</span>}
        </p>
        <div className="mt-3 h-2 rounded-full bg-[#1f1f1f] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-bol-yellow motion-safe:transition-[width] motion-safe:duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          {status.all_voted
            ? 'Han votado todos. El MVP se desvela cuando un admin cierre la votación.'
            : 'El MVP se desvela cuando un admin cierre la votación. Hasta entonces puedes cambiar tu voto.'}
        </p>
      </div>

      {/* Mi situación */}
      {authLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-zinc-600" />
        </div>
      ) : status.can_vote ? (
        <section className="flex flex-col gap-3">
          {status.me_has_voted && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/30 border border-emerald-900/40 px-4 py-4">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  Has votado a {myVote ? displayName(myVote.player) : 'un compañero'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Es anónimo: solo tú ves tu voto. Puedes cambiarlo abajo.</p>
              </div>
            </div>
          )}
          <div className="px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
              {status.me_has_voted ? '¿Cambiar tu voto?' : '¿Quién ha sido el mejor?'}
            </h3>
            <p className="text-xs text-zinc-600">
              Toca a un compañero. El voto es anónimo y puedes cambiarlo hasta que se cierre la votación.
            </p>
          </div>
          {choices.length === 0 ? (
            <p className="text-xs text-zinc-600 px-1">No hay otros asistentes a los que votar.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {choices.map((c) => (
                <li key={c.player.id}>
                  <button
                    type="button"
                    disabled={c.player.id === status.me_voted_player_id}
                    aria-pressed={c.player.id === status.me_voted_player_id}
                    onClick={() => { setError(null); setSelected(c) }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors touch-manipulation ${
                      c.player.id === status.me_voted_player_id
                        ? 'bg-bol-yellow/10 border-bol-yellow/60 cursor-default'
                        : 'bg-[#141414] border-[#2a2a2a] hover:border-bol-yellow/60 active:bg-[#1f1f1f]'
                    }`}
                  >
                    <span className="w-9 h-9 shrink-0 rounded-full bg-[#1f1f1f] flex items-center justify-center text-sm font-black text-bol-yellow tabular-nums">
                      {c.number}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">
                      {displayName(c.player)}
                    </span>
                    {c.player.id === status.me_voted_player_id ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-bol-yellow shrink-0">
                        <Star size={14} className="fill-bol-yellow" /> Tu voto
                      </span>
                    ) : (
                      <Star size={16} className="text-zinc-700 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : !meId ? (
        <div className="rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <UserRound size={20} className="text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300">
              {isAdmin
                ? 'Estás con la cuenta de admin, que no vota. Para votar entra con tu cuenta de jugador.'
                : 'Para votar tienes que identificarte como jugador. Solo votan los que vinieron al partido.'}
            </p>
          </div>
          {!isAdmin && (
            <Link
              href={joinHref}
              className="inline-flex items-center justify-center py-3.5 rounded-xl bg-bol-yellow text-black text-sm font-bold hover:bg-[#e8d400] active:bg-[#d6c400] touch-manipulation"
            >
              Soy jugador
            </Link>
          )}
        </div>
      ) : !status.me_attended ? (
        <div className="flex items-start gap-3 rounded-2xl bg-[#141414] border border-[#2a2a2a] px-4 py-4">
          <Lock size={18} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-300">
            No constas como asistente a este partido, así que no puedes votar.
            <span className="block text-xs text-zinc-500 mt-1">Si jugaste, pide a un admin que te marque como asistente.</span>
          </p>
        </div>
      ) : null}

      {error && !selected && !confirmClose && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Admin: quién falta y cierre manual */}
      {isAdmin && !authLoading && (
        <section className="rounded-2xl border border-amber-900/40 bg-amber-950/10 px-4 py-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Admin · faltan por votar</h3>
          {pendingNames.length === 0 ? (
            <p className="text-xs text-zinc-500">
              {status.eligible === 0
                ? 'Nadie puede votar todavía: marca quién jugó y que tengan cuenta.'
                : 'Han votado todos. Cuando quieras, cierra la votación para desvelar el MVP.'}
            </p>
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">
              {pendingNames.map((p) => displayName(p)).join(', ')}
            </p>
          )}
          <Button variant="secondary" size="lg" fullWidth onClick={() => { setError(null); setConfirmClose(true) }}>
            <Lock size={16} />
            Cerrar votación
          </Button>
        </section>
      )}

      {selected && (
        <Modal title={status.me_has_voted ? 'Cambiar voto' : 'Confirmar voto'} onClose={() => !busy && setSelected(null)}>
          <div className="flex flex-col gap-4 pb-2">
            <p className="text-sm text-zinc-300">
              {status.me_has_voted && myVote ? (
                <>
                  ¿Cambiar tu voto de <span className="font-bold text-white">{displayName(myVote.player)}</span> a{' '}
                  <span className="font-bold text-white">{displayName(selected.player)}</span>?
                </>
              ) : (
                <>
                  ¿Votar a <span className="font-bold text-white">{displayName(selected.player)}</span> como MVP del partido?
                </>
              )}
            </p>
            <p className="text-xs text-zinc-500">El voto es anónimo. Podrás cambiarlo hasta que un admin cierre la votación.</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => setSelected(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button variant="primary" size="lg" onClick={handleVote} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                {status.me_has_voted ? 'Cambiar' : 'Votar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmClose && (
        <Modal title="Cerrar votación" onClose={() => !busy && setConfirmClose(false)}>
          <div className="flex flex-col gap-4 pb-2">
            <p className="text-sm text-zinc-300">
              El MVP se decidirá con los <span className="font-bold text-white">{status.voted}</span>{' '}
              {status.voted === 1 ? 'voto emitido' : 'votos emitidos'} hasta ahora.
              {missing > 0 && ` Los ${missing} que faltan ya no podrán votar.`}
            </p>
            {status.voted === 0 && (
              <p className="text-xs text-amber-500">Nadie ha votado: el partido quedará sin MVP.</p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => setConfirmClose(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button variant="danger" size="lg" onClick={handleClose} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
