import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { OUR_TEAM } from '@/lib/teams'

// La URL de resultados/fixtures vive en tournaments.fixtures_url del torneo activo
// (is_current = true). Al cambiar de split solo hay que actualizar la fila en la DB.


function decodeHtml(str: string): string {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x27;/g, "'")
}

/** Normaliza para comparar: minúsculas, sin tildes, sin espacios extra */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

interface ParsedMatch {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  date: string | null   // YYYY-MM-DD
  time: string | null   // HH:MM
  venue: string | null
  postponed: boolean
}

/** Parsea TODOS los partidos de la página (no solo los nuestros) */
function parseAllMatches(html: string): ParsedMatch[] {
  const results: ParsedMatch[] = []

  const rowRegex = /<tr class="tr-pointer"[^>]*onclick="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g
  let rowMatch

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1]

    // Extraer secciones home / scorer / away
    const homeSection = row.match(/<!--home-->([\s\S]*?)<!--scorer-->/)
    const scorerSection = row.match(/<!--scorer-->([\s\S]*?)<!--away-->/)
    const awaySection = row.match(/<!--away-->([\s\S]*?)$/)
    if (!homeSection || !scorerSection || !awaySection) continue

    // Nombres de equipos
    const homeImg = homeSection[1].match(/data-toggle="tooltip" title="([^"]+)" alt=/)
    const awayImg = awaySection[1].match(/data-toggle="tooltip" title="([^"]+)" alt=/)
    if (!homeImg || !awayImg) continue

    const home_team = decodeHtml(homeImg[1]).trim()
    const away_team = decodeHtml(awayImg[1]).trim()

    // Marcador (si existe)
    const scoreMatch = scorerSection[1].match(
      /results__score[\s\S]*?(?:<span[^>]*>[^<]*<\/span>)?\s*(\d+)\s*<span[^>]*>-<\/span>\s*(\d+)/
    )
    const home_score = scoreMatch ? parseInt(scoreMatch[1]) : null
    const away_score = scoreMatch ? parseInt(scoreMatch[2]) : null

    // Hora programada
    const timeMatch = scorerSection[1].match(/results__status time[^>]*>\s*(\d{2}:\d{2})/)
    const time = timeMatch ? timeMatch[1] : null

    // Fecha DD.MM.YYYY → YYYY-MM-DD
    const dateMatch = scorerSection[1].match(/(\d{2})\.(\d{2})\.(\d{4})/)
    const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null

    // Lugar (venue) — extraer del enlace a instalación
    const venueMatch = scorerSection[1].match(/href="\/instalacion\/[^"]*">([^<]+)<\/a>/)
    const venue = venueMatch ? decodeHtml(venueMatch[1]).trim() : null

    // Detectar si está aplazado
    const postponed = /aplazado/i.test(scorerSection[1])

    results.push({ home_team, away_team, home_score, away_score, date, time, venue, postponed })
  }

  return results
}

async function syncFixtures() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' },
      { status: 500 }
    )
  }

  try {
    const supabase = createServiceClient()

    // Torneo activo: define la URL a scrapear y el torneo de los partidos nuevos
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id, fixtures_url')
      .eq('is_current', true)
      .limit(1)
    const activeTournament = tournaments?.[0] ?? null
    if (!activeTournament?.fixtures_url) {
      return NextResponse.json(
        { error: 'No hay torneo activo con fixtures_url configurada' },
        { status: 400 }
      )
    }
    const activeTournamentId = activeTournament.id

    // 1. Fetch y parseo de la página de la liga
    const res = await fetch(activeTournament.fixtures_url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status} al fetch de fundaciovalldor7.com`)
    const html = await res.text()
    const allMatches = parseAllMatches(html)

    if (allMatches.length === 0) {
      return NextResponse.json({ error: 'No se encontraron partidos' }, { status: 400 })
    }

    // 2. Sync partidos del Bolivia Dortmund: sin score (pendientes o aplazados)
    const futureOurs = allMatches
      .filter((m) => m.home_score === null && (m.home_team === OUR_TEAM || m.away_team === OUR_TEAM))
      .map((m) => ({
        ...m,
        opponent: m.home_team === OUR_TEAM ? m.away_team : m.home_team,
      }))

    // Obtener TODOS los partidos nuestros para evitar duplicados
    const { data: allDbMatches } = await supabase
      .from('matches')
      .select('id, opponent_name, match_date, match_time, match_venue, status, tournament_id')

    let oursUpdated = 0
    let oursCreated = 0

    for (const ext of futureOurs) {
      const targetStatus = ext.postponed ? 'postponed' : 'pending'

      // Buscar por rival + fecha exacta, o por rival sin fecha (postponed previo)
      const dbMatch = allDbMatches?.find(
        (m) =>
          normalize(m.opponent_name) === normalize(ext.opponent) &&
          (m.match_date === ext.date || (m.match_date === null && ext.date !== null))
      )

      if (dbMatch) {
        // Solo actualizar si algo cambió (no tocar partidos ya en juego, finalizados o ganados por incomparecencia)
        if (['first_half', 'half_time', 'second_half', 'finished', 'walkover'].includes(dbMatch.status)) continue

        const updates: Record<string, string | null> = {}
        if (ext.date !== dbMatch.match_date) updates.match_date = ext.date
        if (ext.time !== dbMatch.match_time) updates.match_time = ext.postponed ? null : ext.time
        if (ext.venue !== dbMatch.match_venue) updates.match_venue = ext.venue
        if (targetStatus !== dbMatch.status) updates.status = targetStatus
        if (!dbMatch.tournament_id) updates.tournament_id = activeTournamentId
        if (Object.keys(updates).length === 0) continue

        const { error } = await supabase
          .from('matches')
          .update(updates)
          .eq('id', dbMatch.id)
        if (!error) oursUpdated++
      } else {
        if (!ext.date) continue
        // Crear partido nuevo
        const { error } = await supabase.from('matches').insert({
          opponent_name: ext.opponent,
          match_date: ext.date,
          match_time: ext.postponed ? null : ext.time,
          match_venue: ext.venue,
          status: targetStatus,
          tournament_id: activeTournamentId,
        })
        if (!error) oursCreated++
      }
    }

    // 3. Upsert todos los resultados de la liga en league_results (del torneo activo)
    const leagueRows = allMatches
      .filter((m) => m.date) // Solo partidos con fecha
      .map((m) => ({
        home_team: m.home_team,
        away_team: m.away_team,
        home_score: m.home_score,
        away_score: m.away_score,
        match_date: m.date,
        match_time: m.time,
        venue: m.venue,
        tournament_id: activeTournamentId,
        updated_at: new Date().toISOString(),
      }))

    let leagueUpserted = 0
    if (leagueRows.length > 0) {
      const { error, count } = await supabase
        .from('league_results')
        .upsert(leagueRows, { onConflict: 'tournament_id,home_team,away_team,match_date' })

      if (error) throw error
      leagueUpserted = count ?? leagueRows.length
    }

    return NextResponse.json({
      success: true,
      ours_updated: oursUpdated,
      ours_created: oursCreated,
      league_results_synced: leagueUpserted,
      total_matches: allMatches.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET  = syncFixtures
export const POST = syncFixtures
