# AGENTS.md — Bolivia Dortmund

## Contexto del proyecto
Web app responsive tipo PWA para registrar los partidos de fútbol 7 amateur del **Bolivia Dortmund** y generar estadísticas de jugadores.

Es la app hermana de la del Chevere FC (`/Users/adria/Projects/chevere`), que es la **implementación de referencia**: misma arquitectura, mismas reglas y misma UX, pero son **apps totalmente independientes** (código, base de datos Supabase, deploy y branding propios). Solo comparten que ambos equipos juegan en las ligas de la Fundació Valldor7.

La app debe usarse desde móvil (iPhone y Android) como web app, con interfaz simple, rápida y clara.

## El equipo
- **Nombre**: Bolivia Dortmund ("BVD 04")
- **Liga**: 13. BCN | F7 Baix Llobregat 2026-2027 (Fundació Valldor7) — Primer Split, grupo **Viernes "B"**
- **Identidad**: logo circular estilo Borussia Dortmund con la tricolor de Bolivia y su escudo nacional (`Bolivia logo.jpeg` en la raíz del proyecto). Colores de la bandera boliviana: rojo `#D52B1E`, amarillo `#F9E300`, verde `#007934`, con negro y blanco. UI oscura como la del Chevere salvo que se decida lo contrario.

## Objetivo principal
Permitir:
- Crear partidos y llevar el marcador en vivo
- Registrar goles propios (goleador obligatorio, asistencia opcional, minuto automático, tipo: normal / free_kick / penalty) y goles del rival (sin jugador)
- Registrar paradas del portero
- Guardar el resultado final
- Estadísticas acumuladas por split: goles, asistencias, participaciones (G+A) y paradas, con podio top-3 + tabla completa
- Clasificación y resultados de la liga scrapeados de fundaciovalldor7.com
- Historial de partidos y archivo de temporadas pasadas

## Stack técnico obligatorio
- Next.js con App Router + TypeScript + TailwindCSS
- Supabase como base de datos y backend (proyecto PROPIO, no el del Chevere)
- Arquitectura mobile-first, preparado para PWA
- Código limpio, tipado y modular; nombres en inglés en código y tablas, textos de interfaz en español

## Reglas funcionales no negociables
(Idénticas a las del Chevere — ver su CLAUDE.md/AGENTS.md para el detalle)

1. **Cronómetro**: NUNCA un `setInterval` como fuente de verdad. Siempre timestamps reales (`period_started_at`, `*_elapsed_seconds`, `is_clock_running`, `current_period`) y recálculo contra el reloj del sistema. Debe sobrevivir recargas, bloqueo del móvil y segundo plano. Partes de 25 minutos (F7).
2. **Estadísticas**: solo eventos con `team_side = 'ours'`. Las paradas guardan el portero en `scorer_player_id`.
3. **Temporadas**: un torneo = un split. Las páginas principales muestran solo el torneo `is_current`; el histórico vive en `/temporadas/[id]` y nunca se borra. Jugadores que se van → `active = false` (nunca borrar). Snapshot del roster de cada split en `tournament_players`.
4. **Scraping por torneo**: las URLs de standings/fixtures viven en `tournaments.standings_url` / `fixtures_url` del torneo activo, no hardcodeadas.
5. **Admin-only**: escrituras protegidas con `useAuth().isAdmin`. RLS: anon = SELECT; authenticated = CRUD.

## Modelo de datos
El mismo que el Chevere tras su reestructuración 26/27 — copiar `supabase/schema.sql` y `supabase/rls.sql` del proyecto chevere tal cual (players, tournaments con `is_current`/URLs, tournament_players, matches, match_events, standings y league_results por torneo).

## UX
La app debe ser rapidísima en partido real: marcador arriba, cronómetro visible, botón "Gol nuestro" / "Gol rival", registrar gol en 3 pasos máximo. Diseño limpio, táctil, botones grandes, para una mano. Splash con el logo del equipo.

## Jugadores iniciales (plantilla oficial 26/27, web de la liga)

[
  { "numero": 5,  "nombre": "Aarón Padilla Grajeda",        "posicion": "DEF" },
  { "numero": 6,  "nombre": "Alex Rodríguez Bejarano",      "posicion": "MED" },
  { "numero": 7,  "nombre": "Fran Torres Pereyra",          "posicion": "MED" },
  { "numero": 8,  "nombre": "Pau Calpe Tomé",               "posicion": "MED" },
  { "numero": 10, "nombre": "Alejandro Herrero Terrero",    "posicion": "DEF" },
  { "numero": 11, "nombre": "Carlos Barriga Arqué",         "posicion": "MED" },
  { "numero": 13, "nombre": "Erik González Andreu",         "posicion": "MED" },
  { "numero": 19, "nombre": "Celestino Diaz Rodriguez",     "posicion": "DEF" },
  { "numero": 22, "nombre": "Adrián Sánchez Rivas",         "posicion": "MED" },
  { "numero": 24, "nombre": "Adrià León Aris",              "posicion": "MED" },
  { "numero": 29, "nombre": "Pablo Jiménez Prieto",         "posicion": "POR" },
  { "numero": 69, "nombre": "Alex Villalba Zarcero",        "posicion": "DEL" },
  { "numero": 87, "nombre": "Luis Fernando Vasquez Honor",  "posicion": "DEL" },
  { "numero": 99, "nombre": "Iago Rodríguez Domínguez",     "posicion": "DEF" }
]

Mapeo: `numero` → `number`, `nombre` → `name`, `posicion` → `position`. Capitán: sin confirmar.

## Qué debe generar el agente cuando se le pida construir funcionalidad
1. Explicar brevemente la estructura
2. Crear archivos completos, sin pseudocódigo
3. Partir SIEMPRE de la implementación del Chevere como referencia y adaptar solo lo específico del equipo (ver CLAUDE.md § "Qué se parametriza")
