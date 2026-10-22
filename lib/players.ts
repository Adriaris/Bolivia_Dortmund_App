/**
 * Helpers de cuentas de jugador (sin dependencias: usables en cliente y servidor).
 *
 * Identidad en Supabase Auth: email interno `<player_id>@players.bvd04.fc`,
 * contraseña = PIN de 6 cifras. El vínculo usuario ↔ jugador vive en
 * `player_accounts` y solo se escribe desde /api/players/* (service role).
 */

export const PLAYER_EMAIL_DOMAIN = 'players.bvd04.fc'

export const PIN_LENGTH = 6

const PIN_REGEX = /^\d{6}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function playerEmail(playerId: string): string {
  return `${playerId.toLowerCase()}@${PLAYER_EMAIL_DOMAIN}`
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

/**
 * Ruta interna segura para redirigir tras identificarse (evita open redirect):
 * debe empezar por "/" y no por "//" ni "/\".
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}
