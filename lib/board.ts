// ============================================================
// Pizarra táctica (fútbol 7) — lógica pura, sin React
// ============================================================
// Las fichas se guardan en porcentaje del campo (x: 0-100 ancho, y: 0-100 alto),
// con nuestra portería abajo (y ≈ 100) y la del rival arriba (y ≈ 0).

import type { Player } from './types'

export type BoardSide = 'ours' | 'rival'
export type BoardRole = 'POR' | 'DEF' | 'MED' | 'DEL'

export interface BoardToken {
  id: string
  side: BoardSide
  /** Línea de la formación a la que pertenece la ficha (para el relleno automático) */
  role: BoardRole
  /** Número visible en la ficha cuando no tiene jugador asignado */
  label: number
  x: number
  y: number
  /** Jugador del Bolivia que representa la ficha (solo `side = 'ours'`) */
  playerId: string | null
}

export interface BoardOptions {
  /** Mostrar las fichas del rival (ocultarlas deja solo nuestra alineación) */
  showRival: boolean
  /** Nombre corto bajo las fichas con jugador */
  showNames: boolean
}

export const DEFAULT_OPTIONS: BoardOptions = { showRival: true, showNames: true }

/** Trazo del lápiz: puntos en porcentaje del campo */
export interface Stroke {
  color: string
  points: [number, number][]
}

export const STROKE_COLORS = ['#ffffff', '#F9E300', '#D52B1E', '#111111'] as const

export interface BoardState {
  tokens: BoardToken[]
  ball: { x: number; y: number }
  formation: Record<BoardSide, FormationKey>
  options: BoardOptions
  strokes: Stroke[]
}

/** Campo de F7 en metros (ancho × largo); el dibujo usa estas proporciones */
export const PITCH = { width: 40, length: 65 } as const

// Formaciones de F7: portero + 6 jugadores de campo. Posiciones en NUESTRA mitad
// (y entre 50 y 100); para el rival se reflejan con `100 - y`.
export type FormationKey = '2-3-1' | '3-2-1' | '3-1-2' | '2-2-2'

interface Slot { role: BoardRole; x: number; y: number }

export const FORMATIONS: Record<FormationKey, Slot[]> = {
  '2-3-1': [
    { role: 'POR', x: 50, y: 93 },
    { role: 'DEF', x: 30, y: 78 }, { role: 'DEF', x: 70, y: 78 },
    { role: 'MED', x: 18, y: 64 }, { role: 'MED', x: 50, y: 66 }, { role: 'MED', x: 82, y: 64 },
    { role: 'DEL', x: 50, y: 56 },
  ],
  '3-2-1': [
    { role: 'POR', x: 50, y: 93 },
    { role: 'DEF', x: 22, y: 77 }, { role: 'DEF', x: 50, y: 80 }, { role: 'DEF', x: 78, y: 77 },
    { role: 'MED', x: 34, y: 64 }, { role: 'MED', x: 66, y: 64 },
    { role: 'DEL', x: 50, y: 56 },
  ],
  '3-1-2': [
    { role: 'POR', x: 50, y: 93 },
    { role: 'DEF', x: 22, y: 77 }, { role: 'DEF', x: 50, y: 80 }, { role: 'DEF', x: 78, y: 77 },
    { role: 'MED', x: 50, y: 66 },
    { role: 'DEL', x: 32, y: 56 }, { role: 'DEL', x: 68, y: 56 },
  ],
  '2-2-2': [
    { role: 'POR', x: 50, y: 93 },
    { role: 'DEF', x: 30, y: 78 }, { role: 'DEF', x: 70, y: 78 },
    { role: 'MED', x: 30, y: 65 }, { role: 'MED', x: 70, y: 65 },
    { role: 'DEL', x: 36, y: 56 }, { role: 'DEL', x: 64, y: 56 },
  ],
}

export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[]

export const DEFAULT_FORMATION: Record<BoardSide, FormationKey> = {
  ours: '2-3-1',
  rival: '2-3-1',
}

/** Margen (en %) para que una ficha nunca salga del todo del campo al arrastrarla */
export const EDGE = 3

export function clampPct(v: number): number {
  return Math.min(100 - EDGE, Math.max(EDGE, v))
}

export function tokenId(side: BoardSide, index: number): string {
  return `${side}-${index}`
}

/** Fichas de un equipo en su formación; conserva los jugadores asignados por índice */
export function buildTokens(
  side: BoardSide,
  formation: FormationKey,
  previous: BoardToken[] = []
): BoardToken[] {
  return FORMATIONS[formation].map((slot, i) => ({
    id: tokenId(side, i),
    side,
    role: slot.role,
    label: i + 1,
    x: slot.x,
    y: side === 'ours' ? slot.y : 100 - slot.y,
    playerId: side === 'ours' ? previous[i]?.playerId ?? null : null,
  }))
}

export function initialBoard(): BoardState {
  return {
    tokens: [
      ...buildTokens('ours', DEFAULT_FORMATION.ours),
      ...buildTokens('rival', DEFAULT_FORMATION.rival),
    ],
    ball: { x: 50, y: 50 },
    formation: { ...DEFAULT_FORMATION },
    options: { ...DEFAULT_OPTIONS },
    strokes: [],
  }
}

export function addStroke(state: BoardState, stroke: Stroke): BoardState {
  if (stroke.points.length < 2) return state
  return { ...state, strokes: [...state.strokes, stroke] }
}

export function undoStroke(state: BoardState): BoardState {
  return { ...state, strokes: state.strokes.slice(0, -1) }
}

export function clearStrokes(state: BoardState): BoardState {
  return { ...state, strokes: [] }
}

export function setOption<K extends keyof BoardOptions>(state: BoardState, key: K, value: BoardOptions[K]): BoardState {
  return { ...state, options: { ...state.options, [key]: value } }
}

/** Cambia la formación de un equipo recolocando sus fichas (los jugadores se mantienen) */
export function applyFormation(state: BoardState, side: BoardSide, formation: FormationKey): BoardState {
  const own = state.tokens.filter((t) => t.side === side)
  const others = state.tokens.filter((t) => t.side !== side)
  const rebuilt = buildTokens(side, formation, own)
  return {
    ...state,
    tokens: side === 'ours' ? [...rebuilt, ...others] : [...others, ...rebuilt],
    formation: { ...state.formation, [side]: formation },
  }
}

/** Vuelve a colocar todas las fichas y el balón en su sitio (los jugadores se mantienen) */
export function resetPositions(state: BoardState): BoardState {
  const ours = buildTokens('ours', state.formation.ours, state.tokens.filter((t) => t.side === 'ours'))
  const rival = buildTokens('rival', state.formation.rival)
  return { ...state, tokens: [...ours, ...rival], ball: { x: 50, y: 50 } }
}

export function moveToken(state: BoardState, id: string, x: number, y: number): BoardState {
  return {
    ...state,
    tokens: state.tokens.map((t) => (t.id === id ? { ...t, x: clampPct(x), y: clampPct(y) } : t)),
  }
}

export function moveBall(state: BoardState, x: number, y: number): BoardState {
  return { ...state, ball: { x: clampPct(x), y: clampPct(y) } }
}

/**
 * Asigna un jugador a una ficha nuestra. Si ese jugador ya estaba en otra ficha,
 * las dos fichas intercambian jugador (así nunca hay un jugador repetido).
 * `playerId = null` deja la ficha sin jugador.
 */
export function assignPlayer(state: BoardState, id: string, playerId: string | null): BoardState {
  const target = state.tokens.find((t) => t.id === id)
  if (!target || target.side !== 'ours') return state
  const holder = playerId ? state.tokens.find((t) => t.playerId === playerId && t.id !== id) : undefined
  return {
    ...state,
    tokens: state.tokens.map((t) => {
      if (t.id === id) return { ...t, playerId }
      if (holder && t.id === holder.id) return { ...t, playerId: target.playerId }
      return t
    }),
  }
}

export function clearPlayers(state: BoardState): BoardState {
  return { ...state, tokens: state.tokens.map((t) => (t.side === 'ours' ? { ...t, playerId: null } : t)) }
}

const ROLE_FOR_POSITION: Record<string, BoardRole> = {
  POR: 'POR',
  DEF: 'DEF',
  CAR: 'DEF',
  MED: 'MED',
  DEL: 'DEL',
}

/**
 * Relleno automático: pone a la plantilla (sin invitados) en las fichas según su
 * posición (POR → portería, DEF/CAR → defensas, MED → medios, DEL → delanteros) y
 * completa los huecos que queden con el resto por dorsal.
 */
export function autoFill(state: BoardState, players: Player[]): BoardState {
  const squad = players.filter((p) => !p.is_guest).sort((a, b) => a.number - b.number)
  const pool = new Map<BoardRole, Player[]>([['POR', []], ['DEF', []], ['MED', []], ['DEL', []]])
  for (const p of squad) pool.get(ROLE_FOR_POSITION[p.position] ?? 'MED')!.push(p)

  const used = new Set<string>()
  const assigned = new Map<string, string>()
  const ours = state.tokens.filter((t) => t.side === 'ours')

  // 1ª pasada: cada línea con jugadores de su posición
  for (const t of ours) {
    const next = pool.get(t.role)!.find((p) => !used.has(p.id))
    if (next) { used.add(next.id); assigned.set(t.id, next.id) }
  }
  // 2ª pasada: huecos con quien quede (porteros al final: mejor un defensa que un 2º portero)
  const leftovers = squad.filter((p) => !used.has(p.id))
    .sort((a, b) => Number(a.position === 'POR') - Number(b.position === 'POR'))
  for (const t of ours) {
    if (assigned.has(t.id)) continue
    const next = leftovers.shift()
    if (next) assigned.set(t.id, next.id)
  }

  return {
    ...state,
    tokens: state.tokens.map((t) => (t.side === 'ours' ? { ...t, playerId: assigned.get(t.id) ?? null } : t)),
  }
}

/** Nombre corto para la etiqueta bajo la ficha: alias o primer nombre */
export function shortName(p: Pick<Player, 'name' | 'alias'>): string {
  if (p.alias?.trim()) return p.alias.trim()
  return p.name.trim().split(/\s+/)[0] ?? p.name
}

// ------------------------------------------------------------
// Escenarios: dos pizarras independientes para comparar alineaciones
// ------------------------------------------------------------

export type ScenarioIndex = 0 | 1

export interface BoardWorkspace {
  boards: [BoardState, BoardState]
  active: ScenarioIndex
}

export function initialWorkspace(): BoardWorkspace {
  return { boards: [initialBoard(), initialBoard()], active: 0 }
}

/** Aplica un cambio solo al escenario activo */
export function updateActive(ws: BoardWorkspace, fn: (b: BoardState) => BoardState): BoardWorkspace {
  const boards: [BoardState, BoardState] = [ws.boards[0], ws.boards[1]]
  boards[ws.active] = fn(boards[ws.active])
  return { ...ws, boards }
}

/** Copia el escenario activo sobre el otro (punto de partida para una variante) */
export function copyActiveToOther(ws: BoardWorkspace): BoardWorkspace {
  const other: ScenarioIndex = ws.active === 0 ? 1 : 0
  const boards: [BoardState, BoardState] = [ws.boards[0], ws.boards[1]]
  boards[other] = structuredClone(ws.boards[ws.active])
  return { ...ws, boards }
}

// ------------------------------------------------------------
// Persistencia en el móvil (la pizarra es un cuaderno local, no va a la BD)
// ------------------------------------------------------------

const LEGACY_STORAGE_KEY = 'bvd-board-v1'
export const BOARD_STORAGE_KEY = 'bvd-board-v2'

function parseBoard(raw: unknown): BoardState | null {
  const parsed = raw as Partial<BoardState> | null
  if (!parsed || !Array.isArray(parsed.tokens) || !parsed.ball || !parsed.formation) return null
  if (!FORMATION_KEYS.includes(parsed.formation.ours) || !FORMATION_KEYS.includes(parsed.formation.rival)) return null
  if (parsed.tokens.length !== initialBoard().tokens.length) return null
  // Versiones anteriores no guardaban opciones ni dibujo
  return {
    ...parsed,
    options: { ...DEFAULT_OPTIONS, ...parsed.options },
    strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
  } as BoardState
}

export function loadWorkspace(): BoardWorkspace | null {
  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BoardWorkspace>
      if (!Array.isArray(parsed.boards)) return null
      const a = parseBoard(parsed.boards[0])
      const b = parseBoard(parsed.boards[1])
      if (!a || !b) return null
      return { boards: [a, b], active: parsed.active === 1 ? 1 : 0 }
    }
    // Pizarra guardada con la versión de un solo escenario → pasa a ser el escenario 1
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const board = parseBoard(JSON.parse(legacy))
      if (board) return { boards: [board, initialBoard()], active: 0 }
    }
    return null
  } catch {
    return null
  }
}

export function saveWorkspace(ws: BoardWorkspace): void {
  try {
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(ws))
  } catch {
    // Sin almacenamiento (modo privado, etc.): la pizarra sigue funcionando en memoria
  }
}
