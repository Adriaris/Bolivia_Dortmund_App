'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Eraser, Pencil, SlidersHorizontal, Undo2 } from 'lucide-react'
import BackLink from '@/components/ui/BackLink'
import Pitch from './Pitch'
import { Ball, Piece } from './BoardToken'
import PlayerPickerModal from './PlayerPickerModal'
import BoardOptionsModal from './BoardOptionsModal'
import DrawingLayer from './DrawingLayer'
import {
  addStroke,
  applyFormation,
  assignPlayer,
  autoFill,
  clearPlayers,
  clearStrokes,
  copyActiveToOther,
  initialBoard,
  initialWorkspace,
  loadWorkspace,
  moveBall,
  moveToken,
  PITCH,
  resetPositions,
  saveWorkspace,
  setOption,
  STROKE_COLORS,
  undoStroke,
  updateActive,
  type BoardState,
  type BoardWorkspace,
  type ScenarioIndex,
} from '@/lib/board'
import type { Player } from '@/lib/types'

interface TacticsBoardProps {
  players: Player[]
}

const RATIO = PITCH.width / PITCH.length

export default function TacticsBoard({ players }: TacticsBoardProps) {
  // Solo se renderiza en cliente (next/dynamic sin SSR), así que podemos leer el
  // estado guardado al inicializar sin desajustes de hidratación
  const [workspace, setWorkspace] = useState<BoardWorkspace>(() => loadWorkspace() ?? initialWorkspace())
  const board = workspace.boards[workspace.active]
  // Todos los cambios de fichas/opciones van al escenario activo
  const setBoard = useCallback(
    (fn: (b: BoardState) => BoardState) => setWorkspace((ws) => updateActive(ws, fn)),
    []
  )
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [penColor, setPenColor] = useState<string>(STROKE_COLORS[0])

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
    saveWorkspace(workspace)
  }, [workspace])

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
        <BackLink href="/jugadores" label="Volver a la plantilla" />
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

      {/* Escenarios (dos pizarras para comparar) + lápiz */}
      <div className="flex items-stretch gap-2 mb-3 shrink-0">
        <div
          role="tablist"
          aria-label="Escenario"
          className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#141414] border border-[#2a2a2a]"
        >
          {([0, 1] as ScenarioIndex[]).map((i) => {
            const active = workspace.active === i
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWorkspace((ws) => ({ ...ws, active: i }))}
                className={[
                  'py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors touch-manipulation',
                  active ? 'bg-bol-yellow text-black' : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                Escenario {i + 1}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setDrawMode((v) => !v)}
          aria-pressed={drawMode}
          aria-label={drawMode ? 'Desactivar el lápiz' : 'Activar el lápiz'}
          className={[
            'w-11 rounded-xl border flex items-center justify-center transition-colors touch-manipulation',
            drawMode
              ? 'bg-bol-yellow border-bol-yellow text-black'
              : 'bg-[#141414] border-[#2a2a2a] text-zinc-300 hover:text-white',
          ].join(' ')}
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Herramientas del lápiz: color, deshacer y borrar */}
      {drawMode && (
        <div className="flex items-center gap-2 mb-3 shrink-0 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1">Lápiz</span>
          <div className="flex items-center gap-2 flex-1">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPenColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={penColor === c}
                className={[
                  'w-7 h-7 rounded-full border-2 transition-transform touch-manipulation',
                  penColor === c ? 'border-white scale-110' : 'border-[#3a3a3a]',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBoard((b) => undoStroke(b))}
            disabled={board.strokes.length === 0}
            aria-label="Deshacer el último trazo"
            className="w-9 h-8 rounded-lg bg-[#1f1f1f] text-zinc-300 hover:text-white flex items-center justify-center disabled:opacity-40 touch-manipulation"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setBoard((b) => clearStrokes(b))}
            disabled={board.strokes.length === 0}
            aria-label="Borrar todo el dibujo"
            className="w-9 h-8 rounded-lg bg-[#1f1f1f] text-zinc-300 hover:text-red-300 flex items-center justify-center disabled:opacity-40 touch-manipulation"
          >
            <Eraser size={15} />
          </button>
        </div>
      )}

      {/* Campo: ocupa todo el alto que queda */}
      <div ref={areaRef} className="flex-1 min-h-0 flex items-center justify-center -mx-4 sm:mx-0">
        <div
          ref={pitchRef}
          className={`relative rounded-xl overflow-hidden select-none ${dragging ? 'cursor-grabbing' : ''} ${drawMode ? 'shadow-[0_0_0_2px_#F9E300]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'}`}
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
        >
          <Pitch />
          {size.w > 0 && (
            <React.Fragment key={workspace.active}>
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
              <DrawingLayer
                strokes={board.strokes}
                active={drawMode}
                color={penColor}
                toPercent={toPercent}
                onStroke={(stroke) => setBoard((b) => addStroke(b, stroke))}
              />
            </React.Fragment>
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
          onResetAll={() => { setBoard(() => initialBoard()); setShowOptions(false) }}
          onCopyToOther={() => { setWorkspace((ws) => copyActiveToOther(ws)); setShowOptions(false) }}
          activeScenario={workspace.active}
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
