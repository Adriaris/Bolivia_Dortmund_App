'use client'

import { useMemo, useState } from 'react'
import ConvocatoriaHeader from '@/components/attendance/ConvocatoriaHeader'
import MvpVoting, { type MvpCandidate } from '@/components/mvp/MvpVoting'
import MvpReveal from '@/components/mvp/MvpReveal'
import MvpBadge from '@/components/mvp/MvpBadge'
import { mvpTitle, type MatchMvpWithPlayer } from '@/lib/supabase/mvp'
import type { Match, MvpResult, MvpStatus, Player } from '@/lib/types'

// ── Datos inventados ─────────────────────────────────────────
const SQUAD: [number, string, string | null][] = [
  [5, 'Aarón Padilla Grajeda', null],
  [7, 'Fran Torres Pereyra', 'Fran'],
  [8, 'Pau Calpe Tomé', null],
  [11, 'Carlos Barriga Arqué', 'Carlos'],
  [13, 'Erik González Andreu', null],
  [24, 'Adrià León Aris', 'Adrià'],
  [29, 'Pablo Jiménez Prieto', null],
  [66, 'Invitado de ejemplo', null],
]
const PLAYERS: Player[] = SQUAD.map(([number, name, alias]) => ({
  id: `p${number}`,
  number,
  name,
  alias,
  position: 'MED',
  is_captain: false,
  active: true,
  is_admin: false,
  is_guest: number === 66,
  created_at: '2026-10-01',
}))
const ME = 'p24'
const byId: Record<string, Player> = Object.fromEntries(PLAYERS.map((p) => [p.id, p]))
const numberById: Record<string, number> = Object.fromEntries(PLAYERS.map((p) => [p.id, p.number]))
const candidates: MvpCandidate[] = PLAYERS.map((p) => ({ player: p, number: p.number }))

const MATCH: Match = {
  id: 'demo',
  opponent_name: 'La Farga FC',
  match_date: '2026-10-23',
  match_time: '22:00',
  match_venue: 'Camp Municipal',
  status: 'finished',
  our_score: 4,
  opponent_score: 3,
  current_period: 'second_half',
  is_clock_running: false,
  period_started_at: null,
  first_half_elapsed_seconds: 1500,
  second_half_elapsed_seconds: 1500,
  tournament_id: null,
  mvp_closed_at: null,
  created_at: '2026-10-01',
  updated_at: '2026-10-23',
}

// Votos de los demás (7 votantes además de mí), ocultos hasta el cierre
const OTHERS_SINGLE: Record<string, string> = { p5: 'p7', p7: 'p11', p8: 'p7', p11: 'p7', p13: 'p66', p29: 'p11', p66: 'p7' }
// Empate: Fran y Carlos van 3–3 entre los demás; tu voto decide si hay doble MVP
const OTHERS_TIE: Record<string, string> = { p5: 'p7', p7: 'p11', p8: 'p7', p11: 'p7', p13: 'p11', p29: 'p11', p66: 'p8' }

type Scenario = 'single' | 'tie'
type View = 'voting' | 'reveal' | 'none'

function tally(votes: Record<string, string>): MvpResult[] {
  const counts: Record<string, number> = {}
  for (const voted of Object.values(votes)) counts[voted] = (counts[voted] ?? 0) + 1
  return Object.entries(counts)
    .map(([player_id, v]) => ({ player_id, votes: v }))
    .sort((a, b) => b.votes - a.votes)
}

export default function MvpPreviewClient() {
  const [scenario, setScenario] = useState<Scenario>('single')
  const [view, setView] = useState<View>('voting')
  const [isAdmin, setIsAdmin] = useState(true)
  const [alreadyVoted, setAlreadyVoted] = useState(4) // cuántos de los demás han votado ya
  const [myVote, setMyVote] = useState<string | null>(null)
  const [replay, setReplay] = useState(0)

  const others = scenario === 'single' ? OTHERS_SINGLE : OTHERS_TIE
  const voters = Object.keys(others)
  const castOthers = Object.fromEntries(voters.slice(0, alreadyVoted).map((v) => [v, others[v]]))
  const eligible = voters.length + 1

  const status: MvpStatus = {
    match_id: 'demo',
    voting_open: view === 'voting',
    closed: view !== 'voting',
    eligible,
    voted: alreadyVoted + (myVote ? 1 : 0),
    all_voted: alreadyVoted === voters.length && myVote !== null,
    me_player_id: ME,
    me_attended: true,
    me_has_voted: myVote !== null,
    me_voted_player_id: myVote,
    can_vote: view === 'voting',
    pending_player_ids: [
      ...voters.slice(alreadyVoted),
      ...(myVote ? [] : [ME]),
    ],
    results: null,
  }

  const finalResults = useMemo(
    () => tally({ ...castOthers, ...(myVote ? { [ME]: myVote } : {}) }),
    [castOthers, myVote]
  )
  const max = finalResults[0]?.votes ?? 0
  const mvps: MatchMvpWithPlayer[] = finalResults
    .filter((r) => r.votes === max && max > 0)
    .map((r) => ({ match_id: 'demo', player_id: r.player_id, votes: r.votes, player: byId[r.player_id] }))

  const reset = (s: Scenario = scenario) => {
    setScenario(s)
    setView('voting')
    setMyVote(null)
    setAlreadyVoted(4)
  }

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-white text-black' : 'bg-[#1f1f1f] text-zinc-400 hover:text-white'}`

  return (
    <main className="safe-top min-h-screen bg-black px-4 py-6 max-w-lg mx-auto pb-28 flex flex-col gap-6">
      {/* Panel de control de la demo */}
      <div className="rounded-2xl border border-dashed border-sky-800 bg-sky-950/20 p-3 flex flex-col gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-sky-400">Vista previa local · datos inventados</p>
        <p className="text-[11px] text-zinc-500">
          Eres Adrià (admin). {scenario === 'tie'
            ? 'Empate: Fran y Carlos van 3–3 entre los demás; si votas a otro, habrá doble MVP.'
            : 'MVP único: Fran gana con claridad.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={chip(scenario === 'single')} onClick={() => reset('single')}>Escenario: MVP único</button>
          <button className={chip(scenario === 'tie')} onClick={() => reset('tie')}>Escenario: empate</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(view === 'voting')} onClick={() => setView('voting')}>Votación</button>
          <button
            className={chip(view === 'reveal')}
            onClick={() => { setAlreadyVoted(voters.length); setView('reveal'); setReplay((n) => n + 1) }}
          >
            Revelación
          </button>
          <button className={chip(view === 'none')} onClick={() => setView('none')}>Sin votos</button>
          <button className={chip(isAdmin)} onClick={() => setIsAdmin((v) => !v)}>{isAdmin ? 'Viendo como admin' : 'Viendo como jugador'}</button>
        </div>
        {view === 'voting' && (
          <div className="flex flex-wrap gap-2">
            <button
              className={chip(false)}
              disabled={alreadyVoted >= voters.length}
              onClick={() => setAlreadyVoted((n) => Math.min(voters.length, n + 1))}
            >
              + Simular que vota otro
            </button>
            <button className={chip(false)} onClick={() => reset()}>Reiniciar</button>
          </div>
        )}
        {view === 'reveal' && (
          <div className="flex flex-wrap gap-2 items-center">
            <button className={chip(false)} onClick={() => setReplay((n) => n + 1)}>Repetir animación</button>
            <span className="text-[11px] text-zinc-500">Tarjeta de resultado:</span>
            <MvpBadge mvps={mvps} />
          </div>
        )}
      </div>

      <ConvocatoriaHeader
        match={{ ...MATCH, mvp_closed_at: view === 'voting' ? null : '2026-10-24' }}
        eyebrow={view === 'voting' ? 'Votación MVP' : view === 'reveal' && mvps.length > 0 ? mvpTitle(mvps.length) : 'MVP del partido'}
      />

      {view === 'voting' && (
        <MvpVoting
          status={status}
          candidates={candidates}
          playersById={byId}
          meId={ME}
          isAdmin={isAdmin}
          authLoading={false}
          joinHref="#"
          onVote={async (id) => { setMyVote(id) }}
          onCloseVoting={async () => { setView('reveal'); setReplay((n) => n + 1) }}
        />
      )}

      {view === 'reveal' && (
        <MvpReveal
          key={`${replay}-${scenario}`}
          mvps={mvps}
          results={finalResults}
          playersById={byId}
          numberById={numberById}
        />
      )}

      {view === 'none' && (
        <MvpReveal key="none" mvps={[]} results={[]} playersById={byId} numberById={numberById} celebrate={false} />
      )}
    </main>
  )
}
