@AGENTS.md

# Mapa técnico del proyecto (para Claude Code)

> **Estado actual: proyecto SIN CÓDIGO todavía.** Solo documentación y el logo.
> La app se construye clonando la arquitectura de `/Users/adria/Projects/chevere`
> (implementación de referencia, probada en producción) y adaptando lo de abajo.

## Qué se parametriza respecto al Chevere

| Parámetro | Chevere | Bolivia Dortmund |
|---|---|---|
| Nombre equipo (`OUR_TEAM`) | `Chevere FC` | `Bolivia Dortmund` |
| Grupo liga 26/27 | Viernes "C" (GroupId 2043) | **Viernes "B" (GroupId 2042)** |
| `tournaments.standings_url` | ...GroupId=2043 | `https://virtual.fundaciovalldor7.com/es-ES/LeagueData/StandingsItems?BaseLeagueId=298&LeagueType=Teams&SportType=SoccerMini&RoundId=593&GroupId=2042` |
| `tournaments.fixtures_url` | ...groupId=2043 | `https://virtual.fundaciovalldor7.com/cornella-hospitalet-f7-es-26-27/resultados?groupId=2042` |
| Página equipo en la liga | equipo/3316 | `https://virtual.fundaciovalldor7.com/cornella-hospitalet-f7-es-26-27/equipo/3985` |
| Dominio email admin (`lib/auth.ts`) | `@chevere.fc` | **PENDIENTE decidir** (sugerencia: `@bvd04.fc`) |
| Logo propio | escudo Chevere | `Bolivia logo.jpeg` (raíz) → generar PNG/iconos |
| Supabase | proyecto "Chevere" (phpwzibyimcrhpkgaogp) | **PENDIENTE crear proyecto propio** |
| Deploy | cheverefc.vercel.app (push SSH como Adriaris) | **PENDIENTE crear repo + proyecto Vercel** |

Todo lo demás (esquema SQL, RLS, tipos, lib/clock, lib/stats, componentes, páginas,
rutas de sync, modelo de temporadas con `is_current` + `tournament_players`) se copia
del Chevere tal cual, cambiando solo branding y textos.

## Datos reales de la liga ya investigados (20-oct-2026)

Ver `datos-liga.md`: clasificación del grupo, plantilla con dorsales, calendario
completo del Primer Split (con fechas/horas/sedes), eventos de los 2 partidos ya
jugados y rutas de los escudos de los rivales. Sirve para el seed inicial de la DB.

## Checklist de construcción (en orden)

1. Scaffold Next.js (App Router + TS + Tailwind) — mismas versiones que chevere (`next 16.2.0`)
2. Crear proyecto Supabase propio (requiere confirmar coste con Adria) → aplicar `schema.sql` + `rls.sql` del chevere
3. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Seed: torneo "Split 1 Temporada 26/27" (`is_current`, URLs de arriba), 14 jugadores, snapshot en `tournament_players`, partidos jugados + eventos + calendario + standings de `datos-liga.md`
5. Copiar y adaptar código del chevere (branding, OUR_TEAM, textos, logos de rivales vía `/api/proxy-image`)
6. Identidad: iconos PWA/favicon/splash desde `Bolivia logo.jpeg` (fondo blanco→transparente; colores bandera boliviana sobre UI oscura)
7. Crear usuario admin en Supabase Auth con el dominio elegido
8. Repo GitHub + proyecto Vercel + crons (`vercel.json` del chevere: sync-standings 20:00, sync-fixtures cada 3 días)
9. Verificar en producción (sync endpoints, clasificación, próximos)

## Decisiones pendientes de Adria
- Dominio del email admin
- Confirmar UI oscura con acentos tricolor (rojo/amarillo/verde) o esquema distinto
- Nombre del repo/subdominio Vercel (sugerencia: `bvd04` / `boliviadortmund`)
- Capitán del equipo

## Reglas heredadas (idénticas al Chevere)
- Cronómetro por timestamps (`computeElapsedSeconds`), jamás setInterval como verdad
- Stats solo de `team_side = 'ours'`; paradas con portero en `scorer_player_id`
- Tipos siempre en `lib/types.ts`; escrituras admin-only; RLS anon=SELECT
- Temporadas: páginas = torneo `is_current`; archivo en `/temporadas/[id]`; jugadores nunca se borran
- `docs/` NUNCA se sube a GitHub
