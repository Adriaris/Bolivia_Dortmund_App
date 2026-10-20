import type { MatchEvent, MatchEventWithPlayers, Player, PlayerStats } from './types'

/**
 * Calcula las estadísticas individuales de todos los jugadores
 * a partir de eventos de tipo 'ours'.
 */
export function computePlayerStats(
  players: Player[],
  events: (MatchEvent | MatchEventWithPlayers)[]
): PlayerStats[] {
  const ourEvents = events.filter((e) => e.team_side === 'ours')

  const goalsMap = new Map<string, number>()
  const assistsMap = new Map<string, number>()
  const savesMap = new Map<string, number>()

  for (const event of ourEvents) {
    if (event.event_type === 'save') {
      if (event.scorer_player_id) {
        savesMap.set(
          event.scorer_player_id,
          (savesMap.get(event.scorer_player_id) ?? 0) + 1
        )
      }
    } else {
      if (event.scorer_player_id) {
        goalsMap.set(
          event.scorer_player_id,
          (goalsMap.get(event.scorer_player_id) ?? 0) + 1
        )
      }
      if (event.assist_player_id) {
        assistsMap.set(
          event.assist_player_id,
          (assistsMap.get(event.assist_player_id) ?? 0) + 1
        )
      }
    }
  }

  return players
    .map((player) => {
      const goals = goalsMap.get(player.id) ?? 0
      const assists = assistsMap.get(player.id) ?? 0
      const saves = savesMap.get(player.id) ?? 0
      return {
        player,
        goals,
        assists,
        participations: goals + assists,
        saves,
      }
    })
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      return a.player.number - b.player.number
    })
}

/**
 * Calcula estadísticas globales de todos los partidos dados una lista de eventos
 */
export function filterPlayerStats(stats: PlayerStats[]): {
  topScorers: PlayerStats[]
  topAssists: PlayerStats[]
  topParticipations: PlayerStats[]
  topSaves: PlayerStats[]
} {
  const topScorers = [...stats]
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)

  const topAssists = [...stats]
    .filter((s) => s.assists > 0)
    .sort((a, b) => b.assists - a.assists)

  const topParticipations = [...stats]
    .filter((s) => s.participations > 0)
    .sort((a, b) => b.participations - a.participations)

  const topSaves = [...stats]
    .filter((s) => s.saves > 0)
    .sort((a, b) => b.saves - a.saves)

  return { topScorers, topAssists, topParticipations, topSaves }
}
