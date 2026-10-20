# Datos de la liga — Bolivia Dortmund 26/27

Scrapeado de fundaciovalldor7.com el **20-10-2026**. Seed inicial para la DB.
Liga: 13. BCN | F7 Baix Llobregat 2026-2027 · Primer Split · **Viernes "B"**
IDs: BaseLeagueId=298 · RoundId=593 · GroupId=2042 · Equipo=3985

## Clasificación (jornada 3)

| Pos | Equipo | PTS | PJ | G | E | P | GF | GC | DG | Logo (prefijo https://virtual.fundaciovalldor7.com) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Menuda Banda FC | 6 | 2 | 2 | 0 | 0 | 9 | 5 | +4 | /master/teams/024785/024785_thumb.png |
| 2 | Gossos FC | 6 | 3 | 2 | 0 | 1 | 10 | 9 | +1 | /master/teams/028699/028699_thumb.png |
| 3 | Sin Fronteras FC | 4 | 3 | 1 | 1 | 1 | 9 | 6 | +3 | /master/teams/028756/028756_thumb.png |
| 4 | Almeda Veteranos | 3 | 3 | 1 | 0 | 2 | 9 | 12 | −3 | /master/teams/028943/028943_thumb.png |
| 5 | **Bolivia Dortmund** | 3 | 2 | 1 | 0 | 1 | 4 | 7 | −3 | /master/teams/024798/024798_thumb.png |
| 6 | La Farga FC | 2 | 3 | 0 | 2 | 1 | 3 | 4 | −1 | /clients/valldor/default/team-logo_thumb.png (genérico) |
| 7 | Los Calaveras | 1 | 2 | 0 | 1 | 1 | 3 | 4 | −1 | /master/teams/000849/000849_thumb.png |

## Partidos jugados

### J1 · 02-10-2026 · O. Ildefons — Bolivia Dortmund 1-5 Sin Fronteras FC
Eventos (partes de 25'; >25' = second_half):
- 7' gol rival (Pere Galofré)
- 20' gol rival (Yeray García)
- 24' gol rival (Alvaro Rojas)
- 24' gol rival (Enrique Parrilla)
- 40' **gol Iago Rodríguez (99)**
- 42' gol rival (Alvaro Rojas)

### J2 · 09-10-2026 · O. Ildefons — Los Calaveras 2-3 Bolivia Dortmund ✅ victoria
La web NO publica la cronología de este partido: crear los 3 goles propios con
`scorer_player_id = null` (y los 2 del rival) para que cuadre el marcador.

## Calendario pendiente (Primer Split)

| J | Fecha | Hora | Rival | Local/Visitante | Sede |
|---|---|---|---|---|---|
| 4 | 2026-10-23 | 22:30 | La Farga FC | local | O. Ildefons |
| 5 | 2026-10-30 | 23:15 | Almeda Veteranos | visitante | L. Almeda |
| 6 | 2026-11-06 | 22:30 | Menuda Banda FC | local | O. Ildefons |
| 7 | 2026-11-13 | — | Gossos FC | visitante | — |
| 8 | 2026-11-20 | — | Sin Fronteras FC | visitante | — |
| 9 | 2026-11-27 | — | Los Calaveras | local | — |
| 11 | 2026-12-11 | — | La Farga FC | visitante | — |
| 12 | 2026-12-18 | — | Almeda Veteranos | local | — |
| 13 | 2027-01-08 | — | Menuda Banda FC | visitante | — |
| 14 | 2027-01-15 | — | Gossos FC | local | — |

Jornadas 3 y 10: descansa (grupo de 7 equipos).
Nota: el modelo de datos no distingue local/visitante (solo `opponent_name`);
la columna se documenta por si se añade en el futuro.

## Plantilla
Ver AGENTS.md § Jugadores iniciales (14 jugadores). Capitán sin confirmar.
