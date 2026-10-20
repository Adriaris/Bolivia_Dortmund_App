# /check-cronometro

Inspecciona `lib/clock.ts`, `components/match/Clock.tsx` y `app/matches/[id]/` para verificar:

- [ ] `setInterval` solo fuerza re-render, NO acumula tiempo
- [ ] Tiempo real siempre via `computeElapsedSeconds(match, period)`
- [ ] `computeElapsedSeconds` usa `Date.now()` como fuente de verdad
- [ ] Al pausar: se guarda `elapsed_seconds` en DB, se borra `period_started_at`
- [ ] Al reanudar/recargar: `accumulated + (now - period_started_at)` es correcto
- [ ] No hay contadores locales que sobrevivan entre renders

Si detectas violaciones, reportar y proponer fix.

$ARGUMENTS
