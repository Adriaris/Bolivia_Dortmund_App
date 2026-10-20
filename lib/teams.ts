// Mapa de nombre de equipo → ruta del logo
// Los nombres deben coincidir exactamente con opponent_name en la DB.
// Escudos de los rivales: servidos desde la web de la liga vía /api/proxy-image

const LEAGUE_BASE = 'https://virtual.fundaciovalldor7.com'

function proxied(path: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(`${LEAGUE_BASE}${path}`)}`
}

export const TEAM_LOGOS: Record<string, string> = {
  'Bolivia Dortmund':   '/logos/Bolivia-dortmund.png',
  // Rivales Split 1 temporada 26/27 (Viernes "B") — La Farga FC no tiene escudo propio en la liga
  'Menuda Banda FC':    proxied('/master/teams/024785/024785_thumb.png'),
  'Gossos FC':          proxied('/master/teams/028699/028699_thumb.png'),
  'Sin Fronteras FC':   proxied('/master/teams/028756/028756_thumb.png'),
  'Almeda Veteranos':   proxied('/master/teams/028943/028943_thumb.png'),
  'Los Calaveras':      proxied('/master/teams/000849/000849_thumb.png'),
}

// Rivales del split actual — alimenta el selector del formulario de nuevo partido
export const CURRENT_OPPONENTS = [
  'Menuda Banda FC',
  'Gossos FC',
  'Sin Fronteras FC',
  'Almeda Veteranos',
  'La Farga FC',
  'Los Calaveras',
]

export const OUR_TEAM = 'Bolivia Dortmund'
export const OUR_SHORT_NAME = 'BVD 04'
export const OUR_LOGO = TEAM_LOGOS['Bolivia Dortmund']
// Versión para splash y header (momentos de identidad) — mismo escudo
export const OUR_LOGO_STARS = OUR_LOGO

// Nombre exacto del equipo en la clasificación de fundaciovalldor7.com
// Cámbialo si el nombre en la liga es diferente
export const OUR_STANDINGS_TEAM = 'Bolivia Dortmund'

export function getTeamLogo(name: string): string | null {
  return TEAM_LOGOS[name] ?? null
}
