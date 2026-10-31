'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw, Sparkles, UserX } from 'lucide-react'
import Pitch from './Pitch'
import { Ball, Piece } from './BoardToken'
import PlayerPickerModal from './PlayerPickerModal'
import {
  applyFormation,
  assignPlayer,
  autoFill,
  clearPlayers,
  FORMATION_KEYS,
  initialBoard,
  loadBoard,
  moveBall,
  moveToken,
  PITCH,
  resetPositions,
  saveBoard,
  type BoardSide,
  type BoardState,
} from '@/lib/board'
import type { Player } from '@/lib/types'

interface TacticsBoardProps {
  players: Player[]
}

const RATIO = PITCH.width / PITCH.length

export default function TacticsBoard({ players }: TacticsBoardProps) {
  // Solo se renderiza en cliente (next/dynamic sin SSR), así que podemos leer el
  // estado guardado al inicializar sin desajustes de hidratación
  const [board, setBoard] = useState<BoardState>(() => loadBoard() ?? initialBoard())
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  // Tamaño del campo: el mayor que quepa en el hueco disponible manteniendo la proporción
  const areaRef = useRef<HTMLDivElement>(null)
  const pitchRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      let w = width
      let h = w / RATIO
      if (h > height) { h = height; w = h * RATIO }
      setSize({ w: Math.floor(w), h: Math.floor(h) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cada cambio se guarda en el móvil: la pizarra sobrevive a recargas
  useEffect(() => {
    saveBoard(board)
  }, [board])

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const rect = pitchRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return { x: 50, y: 50 }
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
  }, [])

  const playerById = new Map(players.map((p) => [p.id, p]))
  const pickerToken = pickerFor ? board.tokens.find((t) => t.id === pickerFor) ?? null : null
  const assignedCount = board.tokens.filter((t) => t.side === 'ours' && t.playerId).length
  const tokenSize = Math.max(30, Math.min(48, Math.round(size.w * 0.115)))

  const formationRow = (side: BoardSide, label: string) => (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-12 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-1 min-w-0">
        {FORMATION_KEYS.map((f) => {
          const active = board.formation[side] === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setBoard((b) => applyFormation(b, side, f))}
              aria-pressed={active}
              className={[
                'flex-1 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors touch-manipulation',
                active
                  ? side === 'ours' ? 'bg-bol-yellow text-black' : 'bg-white text-black'
                  : 'bg-[#1f1f1f] text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {f}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Campo */}
      <div ref={areaRef} className="flex-1 min-h-0 flex items-center justify-center">
        <div
          ref={pitchRef}
          className={`relative rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)] select-none ${dragging ? 'cursor-grabbing' : ''}`}
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
        >
          <Pitch />
          {size.w > 0 && (
            <>
              {board.tokens.map((t) => (
                <Piece
                  key={t.id}
                  token={t}
                  player={t.playerId ? playerById.get(t.playerId) ?? null : null}
                  size={tokenSize}
                  toPercent={toPercent}
                  onMove={(x, y) => setBoard((b) => moveToken(b, t.id, x, y))}
                  onDragStateChange={setDragging}
                  onTap={t.side === 'ours' ? () => setPickerFor(t.id) : undefined}
                />
              ))}
              <Ball
                x={board.ball.x}
                y={board.ball.y}
                size={Math.round(tokenSize * 0.55)}
                toPercent={toPercent}
                onMove={(x, y) => setBoard((b) => moveBall(b, x, y))}
                onDragStateChange={setDragging}
              />
            </>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-3 flex flex-col gap-2.5 shrink-0">
        {formationRow('ours', 'BVD')}
        {formationRow('rival', 'Rival')}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setBoard((b) => autoFill(b, players))}
            disabled={players.length === 0}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1f1f1f] text-zinc-300 hover:text-white text-xs font-bold transition-colors touch-manipulation disabled:opacity-40"
          >
            <Sparkles size={13} /> Auto
          </button>
          <button
            type="button"
            onClick={() => setBoard((b) => clearPlayers(b))}
            disabled={assignedCount === 0}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1f1f1f] text-zinc-300 hover:text-white text-xs font-bold transition-colors touch-manipulation disabled:opacity-40"
          >
            <UserX size={13} /> Quitar
          </button>
          <button
            type="button"
            onClick={() => setBoard((b) => resetPositions(b))}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1f1f1f] text-zinc-300 hover:text-white text-xs font-bold transition-colors touch-manipulation"
          >
            <RotateCcw size={13} /> Recolocar
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 text-center leading-snug">
          Arrastra las fichas y el balón. Toca una ficha amarilla o verde para elegir qué jugador es.
        </p>
      </div>

      {pickerToken && (
        <PlayerPickerModal
          token={pickerToken}
          players={players}
          tokens={board.tokens}
          onPick={(playerId) => {
            setBoard((b) => assignPlayer(b, pickerToken.id, playerId))
            setPickerFor(null)
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  )
}
