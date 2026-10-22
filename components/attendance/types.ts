import type { Player } from '@/lib/types'

/** Jugador del roster del torneo con su dorsal de aquel split. */
export interface RosterEntry {
  player: Player
  number: number
}
