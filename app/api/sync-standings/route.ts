import { NextResponse } from 'next/server'
import { getCurrentTournament } from '@/lib/supabase/queries'
import { createServiceClient } from '@/lib/supabase/service'

// La URL de la clasificación vive en tournaments.standings_url del torneo activo
// (is_current = true). Al cambiar de split solo hay que actualizar la fila en la DB.

const LEAGUE_BASE = 'https://virtual.fundaciovalldor7.com'

function decodeHtml(str: string): string {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function parseStandings(html: string) {
  const rows: {
    pos: number; team: string; logo_url: string | null
    pts: number; played: number
    wins: number; draws: number; losses: number; gf: number; gc: number; gd: number
  }[] = []

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/)
  if (!tbodyMatch) return rows

  const trRegex = /<tr>([\s\S]*?)<\/tr>/g
  let trMatch
  while ((trMatch = trRegex.exec(tbodyMatch[1])) !== null) {
    const row = trMatch[1]

    // Extract all <td> cells
    const tds: string[] = []
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
    let tdMatch
    while ((tdMatch = tdRegex.exec(row)) !== null) tds.push(tdMatch[1])
    if (tds.length < 10) continue

    // Position (td[1] = team cell)
    const posMatch = tds[1].match(/team-meta__pos[^>]*>(\d+)/)
    if (!posMatch) continue

    // Team name
    const nameMatch = tds[1].match(/team-meta__name[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
    if (!nameMatch) continue

    // Logo URL
    const logoMatch = tds[1].match(/team-meta__logo[\s\S]*?<img[^>]+src="([^"?]+)/)
    const logo_url = logoMatch ? `${LEAGUE_BASE}${logoMatch[1]}` : null

    // Parse a plain number cell
    const num = (s: string) =>
      parseInt(s.replace(/<[^>]+>/g, '').trim()) || 0

    // DG: may contain &#x2B; (HTML entity for +)
    const dgText = tds[9]
      .replace(/<[^>]+>/g, '')
      .replace(/&#x2B;/g, '+')
      .replace(/\s+/g, '')
    const gd = parseInt(dgText) || 0

    rows.push({
      pos:      parseInt(posMatch[1]),
      team:     decodeHtml(nameMatch[1].trim()),
      logo_url,
      pts:    num(tds[2]),
      played: num(tds[3]),
      wins:   num(tds[4]),
      draws:  num(tds[5]),
      losses: num(tds[6]),
      gf:     num(tds[7]),
      gc:     num(tds[8]),
      gd,
    })
  }

  return rows
}

// GET: llamado por el cron de Vercel (20:00 diario)
// POST: llamado manualmente desde el botón de admin
async function syncStandings() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' },
      { status: 500 }
    )
  }

  try {
    const tournament = await getCurrentTournament()
    if (!tournament?.standings_url) {
      return NextResponse.json(
        { error: 'No hay torneo activo con standings_url configurada' },
        { status: 400 }
      )
    }

    const res = await fetch(tournament.standings_url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const standings = parseStandings(html)
    if (standings.length === 0) {
      return NextResponse.json({ error: 'No se encontraron equipos en la tabla' }, { status: 400 })
    }

    // Delete + re-insert solo del torneo sincronizado: el archivo de otros splits no se toca.
    // Service role: las tablas scrapeadas son de solo lectura para anon/authenticated.
    const supabase = createServiceClient()
    const { error: delError } = await supabase.from('standings').delete().eq('tournament_id', tournament.id)
    if (delError) throw delError
    const { error: insError } = await supabase.from('standings').insert(
      standings.map((r) => ({ ...r, tournament_id: tournament.id, updated_at: new Date().toISOString() }))
    )
    if (insError) throw insError

    return NextResponse.json({ success: true, count: standings.length, tournament: tournament.short_name })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET  = syncStandings
export const POST = syncStandings
