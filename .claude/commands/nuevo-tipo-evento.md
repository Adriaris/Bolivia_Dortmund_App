# /nuevo-tipo-evento

Guía para añadir un nuevo tipo de evento (tarjeta, falta, córner, etc.):

1. `lib/types.ts` → añadir valor a `EventType`
2. `supabase/schema.sql` → actualizar CHECK constraint de `event_type`
3. Crear `supabase/migration_YYYYMMDD_event_type.sql` con ALTER TABLE
4. Crear `components/match/[NombreEvento]Modal.tsx` (seguir patrón de `SaveModal.tsx`)
5. `components/match/MatchControls.tsx` → añadir botón admin
6. `components/match/EventList.tsx` → añadir icono/estilo en la lista
7. `lib/stats.ts` → si contribuye a estadísticas, añadir lógica

$ARGUMENTS
