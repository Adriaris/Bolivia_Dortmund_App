'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, SlidersHorizontal } from 'lucide-react'
import Pitch from './Pitch'
import { Ball, Piece } from './BoardToken'
import PlayerPickerModal from './PlayerPickerModal'
import BoardOptionsModal from './BoardOptionsModal'
import {
  applyFormation,
  assignPlayer,
  autoFill,
  clearPlayers,
  initialBoard,
  loadBoard,
  moveBall,
  moveToken,
  PITCH,
  resetPositions,
  saveBoard,
  setOption,
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
  const [showOptions, setShowOptions] = useState(false)
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
  const tokenSize = Math.max(30, Math.min(52, Math.round(size.w * 0.115)))
  const visibleTokens = board.options.showRival ? board.tokens : board.tokens.filter((t) => t.side === 'ours')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Cabecera compacta */}
      <div className="flex items-center gap-3 pb-3 shrink-0">
        <Link
          href="/jugadores"
          className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Volver a la plantilla"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">Pizarra</h1>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mt-0.5">
            Fútbol 7 · {board.formation.ours}{board.options.showRival ? ` vs ${board.formation.rival}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-zinc-200 text-sm font-bold hover:text-white hover:border-zinc-500 transition-colors touch-manipulation"
        >
          <SlidersHorizontal size={15} className="text-bol-yellow" />
          Opciones
        </button>
      </div>

      {/* Campo: ocupa todo el alto que queda */}
      <div ref={areaRef} className="flex-1 min-h-0 flex items-center justify-center -mx-4 sm:mx-0">
        <div
          ref={pitchRef}
          className={`relative rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.08)] select-none ${dragging ? 'cursor-grabbing' : ''}`}
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
        >
          <Pitch />
          {size.w > 0 && (
            <>
              {visibleTokens.map((t) => (
                <Piece
                  key={t.id}
                  token={t}
                  player={t.playerId ? playerById.get(t.playerId) ?? null : null}
                  size={tokenSize}
                  showName={board.options.showNames}
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

      {showOptions && (
        <BoardOptionsModal
          board={board}
          playersCount={players.length}
          onFormation={(side, f) => setBoard((b) => applyFormation(b, side, f))}
          onToggle={(key, value) => setBoard((b) => setOption(b, key, value))}
          onAutoFill={() => { setBoard((b) => autoFill(b, players)); setShowOptions(false) }}
          onClearPlayers={() => { setBoard((b) => clearPlayers(b)); setShowOptions(false) }}
          onResetPositions={() => { setBoard((b) => resetPositions(b)); setShowOptions(false) }}
          onResetAll={() => { setBoard(initialBoard()); setShowOptions(false) }}
          onClose={() => setShowOptions(false)}
        />
      )}

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
