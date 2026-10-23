'use client'

import { Check, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { displayName, type MatchAttendanceWithPlayer } from '@/lib/supabase/mvp'
import type { AttendanceStatus, Player } from '@/lib/types'
import GuestBadge from '@/components/ui/GuestBadge'
import type { RosterEntry } from './types'

interface AttendanceListsProps {
  roster: RosterEntry[]
  /** Invitados activos: solo un admin los apunta (sección propia) */
  guests?: RosterEntry[]
  attendance: MatchAttendanceWithPlayer[]
  numberById: Record<string, number>
  registeredIds: Set<string>
  meId: string | null
  /** Admin: controles para fijar la asistencia de cualquiera */
  editable?: boolean
  busyPlayerId?: string | null
  onAdminSet?: (playerId: string, status: AttendanceStatus | null) => void
  /** Títulos y secciones visibles según la fase del partido */
  yesTitle?: string
  noTitle?: string
  showNo?: boolean
  showNoResponse?: boolean
}

interface RowData {
  player: Player
  number: number
  status: AttendanceStatus | null
  byAdmin: boolean
}

export default function AttendanceLists({
  roster,
  guests = [],
  attendance,
  numberById,
  registeredIds,
  meId,
  editable = false,
  busyPlayerId = null,
  onAdminSet,
  yesTitle = 'Van',
  noTitle = 'No van',
  showNo = true,
  showNoResponse = true,
}: AttendanceListsProps) {
  const toRow = (a: MatchAttendanceWithPlayer): RowData | null =>
    a.player
      ? {
          player: a.player,
          number: numberById[a.player_id] ?? a.player.number,
          status: a.status,
          byAdmin: a.updated_by_admin,
        }
      : null

  const byNumber = (x: RowData, y: RowData) => x.number - y.number
  const yes = attendance.filter((a) => a.status === 'yes').map(toRow).filter((r): r is RowData => r !== null).sort(byNumber)
  const no = attendance.filter((a) => a.status === 'no').map(toRow).filter((r): r is RowData => r !== null).sort(byNumber)
  const answered = new Set(attendance.map((a) => a.player_id))
  const pending: RowData[] = roster
    .filter((r) => !answered.has(r.player.id))
    .map((r) => ({ player: r.player, number: r.number, status: null, byAdmin: false }))
  const pendingGuests: RowData[] = guests
    .filter((r) => !answered.has(r.player.id))
    .map((r) => ({ player: r.player, number: r.number, status: null, byAdmin: false }))
    .sort(byNumber)

  const unregisteredYes = yes.filter((r) => !registeredIds.has(r.player.id)).length

  const renderRow = (row: RowData, tone: 'yes' | 'no' | 'none') => {
    const isMe = row.player.id === meId
    const busy = busyPlayerId === row.player.id
    return (
      <li
        key={row.player.id}
        className="flex items-center gap-3 px-3 py-2.5 border-b border-[#1f1f1f] last:border-0"
      >
        <span
          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black tabular-nums ${
            tone === 'yes'
              ? 'bg-emerald-500/10 text-emerald-400'
              : tone === 'no'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-[#1f1f1f] text-zinc-500'
          }`}
        >
          {row.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${tone === 'none' ? 'text-zinc-400' : 'text-white font-medium'}`}>
            {displayName(row.player)}
            {row.player.is_guest && <GuestBadge />}
            {isMe && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-bol-yellow">tú</span>}
          </p>
          {(tone === 'yes' && !registeredIds.has(row.player.id)) || row.byAdmin ? (
            <p className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
              {tone === 'yes' && !registeredIds.has(row.player.id) && <span>Sin cuenta · no vota</span>}
              {tone === 'yes' && !registeredIds.has(row.player.id) && row.byAdmin && <span>·</span>}
              {row.byAdmin && (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> marcado por admin
                </span>
              )}
            </p>
          ) : null}
        </div>

        {editable && onAdminSet && (
          <div className="flex items-center gap-1 shrink-0" aria-label={`Asistencia de ${displayName(row.player)}`}>
            {busy ? (
              <span className="w-9 h-9 flex items-center justify-center">
                <Loader2 size={15} className="animate-spin text-zinc-500" />
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAdminSet(row.player.id, 'yes')}
                  disabled={row.status === 'yes'}
                  aria-label="Marcar que va"
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1f1f1f] text-zinc-500 hover:text-emerald-400 disabled:bg-emerald-500/15 disabled:text-emerald-400 touch-manipulation"
                >
                  <Check size={15} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => onAdminSet(row.player.id, 'no')}
                  disabled={row.status === 'no'}
                  aria-label="Marcar que no va"
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1f1f1f] text-zinc-500 hover:text-red-400 disabled:bg-red-500/15 disabled:text-red-400 touch-manipulation"
                >
                  <X size={15} strokeWidth={3} />
                </button>
                {row.status !== null && (
                  <button
                    type="button"
                    onClick={() => onAdminSet(row.player.id, null)}
                    aria-label="Quitar respuesta"
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#1f1f1f] text-zinc-600 hover:text-white touch-manipulation"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </li>
    )
  }

  const section = (
    title: string,
    rows: RowData[],
    tone: 'yes' | 'no' | 'none',
    dot: string,
    empty: string,
    note?: string
  ) => (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {title}
          <span className="text-zinc-600 tabular-nums">{rows.length}</span>
        </h3>
        {note && <span className="text-[10px] text-zinc-600">{note}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-700 px-1 py-2">{empty}</p>
      ) : (
        <ul className="rounded-2xl bg-[#141414] border border-[#2a2a2a] overflow-hidden">
          {rows.map((r) => renderRow(r, tone))}
        </ul>
      )}
    </section>
  )

  return (
    <div className="flex flex-col gap-5">
      {section(
        yesTitle,
        yes,
        'yes',
        'bg-emerald-500',
        'Nadie todavía',
        unregisteredYes > 0 ? `${unregisteredYes} sin cuenta` : undefined
      )}
      {showNo && section(noTitle, no, 'no', 'bg-red-500', 'Nadie')}
      {showNoResponse && section('Sin responder', pending, 'none', 'bg-zinc-600', 'Han respondido todos')}
      {editable && guests.length > 0 &&
        section(
          'Invitados',
          pendingGuests,
          'none',
          'bg-sky-500',
          'Todos los invitados están en las listas de arriba',
          'los apunta un admin'
        )}
    </div>
  )
}
