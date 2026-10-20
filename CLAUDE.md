@AGENTS.md

# Mapa técnico del proyecto (para Claude Code)

> **Estado actual (20-oct-2026): código construido** clonando la arquitectura de
> `/Users/adria/Projects/chevere` (implementación de referencia, probada en producción).
> `npm run build` y `npm run lint` pasan. Pendiente: proyecto Supabase propio, repo
> GitHub y proyecto Vercel (ver checklist abajo).

## Estructura de archivos clave

| Archivo | Propósito |
|---|---|
| `lib/types.ts` | TODOS los tipos TypeScript del dominio — importar siempre desde aquí |
| `lib/clock.ts` | Cronómetro: `computeElapsedSeconds()`, `computeMatchMinute()`, `formatTime()` |
| `lib/stats.ts` | `computePlayerStats()` y `filterPlayerStats()` |
| `lib/teams.ts` | `OUR_TEAM`, `OUR_LOGO`, mapa rival → escudo (proxy de la liga) y `CURRENT_OPPONENTS` |
| `lib/auth.ts` + `app/login/page.tsx` | Login; el dominio `@bvd04.fc` se añade en `login/page.tsx` (`DOMAIN`) |
| `lib/supabase/client.ts` | Singleton Supabase anon — usar en todo cliente |
| `lib/supabase/service.ts` | Cliente service role — SOLO en API routes |
| `components/auth/AuthProvider.tsx` | Context + `useAuth()`: `{ user, isAdmin, loading }` |
| `app/api/sync-standings/route.ts` | Scraping clasificación → `standings` (escribe con service role) |
| `app/api/sync-fixtures/route.ts` | Scraping calendario/resultados → `matches` + `league_results` (service role) |
| `app/api/proxy-image/route.ts` | Proxy de escudos (solo `virtual.fundaciovalldor7.com`) |
| `supabase/schema.sql` → `rls.sql` → `seed.sql` | Esquema, políticas y datos iniciales (ejecutar en ese orden en BD vacía) |
| `public/logos/Bolivia-dortmund.png` | Escudo con fondo transparente (generado desde `Bolivia logo.jpeg`) |

Diferencia con el Chevere: `standings` y `league_results` NO tienen policy de escritura
(solo SELECT público); ambos syncs escriben con `SUPABASE_SERVICE_ROLE_KEY`.

## Qué se parametriza respecto al Chevere

| Parámetro | Chevere | Bolivia Dortmund |
|---|---|---|
| Nombre equipo (`OUR_TEAM`) | `Chevere FC` | `Bolivia Dortmund` |
| Grupo liga 26/27 | Viernes "C" (GroupId 2043) | **Viernes "B" (GroupId 2042)** |
| `tournaments.standings_url` | ...GroupId=2043 | `https://virtual.fundaciovalldor7.com/es-ES/LeagueData/StandingsItems?BaseLeagueId=298&LeagueType=Teams&SportType=SoccerMini&RoundId=593&GroupId=2042` |
| `tournaments.fixtures_url` | ...groupId=2043 | `https://virtual.fundaciovalldor7.com/cornella-hospitalet-f7-es-26-27/resultados?groupId=2042` |
| Página equipo en la liga | equipo/3316 | `https://virtual.fundaciovalldor7.com/cornella-hospitalet-f7-es-26-27/equipo/3985` |
| Dominio email admin (`app/login/page.tsx`) | `@chevere.fc` | `@bvd04.fc` (provisional, cambiar `DOMAIN` si se decide otro) |
| Logo propio | escudo Chevere | `public/logos/Bolivia-dortmund.png` + iconos PWA (hecho) |
| Supabase | proyecto "Chevere" (phpwzibyimcrhpkgaogp) | **PENDIENTE crear proyecto propio** (org "aris multimedia", coste $0) |
| Deploy | cheverefc.vercel.app (push SSH como Adriaris) | **PENDIENTE crear repo + proyecto Vercel** |

Todo lo demás (esquema SQL, RLS, tipos, lib/clock, lib/stats, componentes, páginas,
rutas de sync, modelo de temporadas con `is_current` + `tournament_players`) se copia
del Chevere tal cual, cambiando solo branding y textos.

## Datos reales de la liga ya investigados (20-oct-2026)

Ver `datos-liga.md`: clasificación del grupo, plantilla con dorsales, calendario
completo del Primer Split (con fechas/horas/sedes), eventos de los 2 partidos ya
jugados y rutas de los escudos de los rivales. Sirve para el seed inicial de la DB.

## Checklist de construcción (en orden)

1. ✅ Scaffold Next.js (App Router + TS + Tailwind) — mismas versiones que chevere (`next 16.2.0`)
2. ⬜ Crear proyecto Supabase propio (org "aris multimedia", eu-west-1) → ejecutar `supabase/schema.sql` + `rls.sql`
3. ⬜ `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (ahora con placeholders)
4. ⬜ Ejecutar `supabase/seed.sql` (torneo, 14 jugadores, snapshot, 2 partidos jugados + eventos, calendario, clasificación)
5. ✅ Copiar y adaptar código del chevere (branding, OUR_TEAM, textos, logos de rivales vía `/api/proxy-image`)
6. ✅ Identidad: iconos PWA/favicon/splash desde `Bolivia logo.jpeg` (fondo transparente; halo tricolor en splash, franja tricolor bajo el header)
7. ⬜ Crear usuario admin en Supabase Auth (`<usuario>@bvd04.fc`)
8. ⬜ Repo GitHub + proyecto Vercel + crons (`vercel.json`: sync-standings 20:00, sync-fixtures cada 3 días) + variables de entorno en Vercel
9. ⬜ Verificar en producción (sync endpoints, clasificación, próximos)

## Decisiones pendientes de Adria
- Dominio del email admin (provisional `@bvd04.fc`)
- Confirmar UI oscura con acentos tricolor (implementado de forma discreta: splash + franja bajo el header; podio y campeón mantienen el ámbar del Chevere)
- Nombre del repo/subdominio Vercel (sugerencia: `bvd04` / `boliviadortmund`)
- Capitán del equipo

## Reglas heredadas (idénticas al Chevere)
- Cronómetro por timestamps (`computeElapsedSeconds`), jamás setInterval como verdad
- Stats solo de `team_side = 'ours'`; paradas con portero en `scorer_player_id`
- Tipos siempre en `lib/types.ts`; escrituras admin-only; RLS anon=SELECT
- Temporadas: páginas = torneo `is_current`; archivo en `/temporadas/[id]`; jugadores nunca se borran
- `docs/` NUNCA se sube a GitHub
