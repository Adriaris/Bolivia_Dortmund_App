# /nueva-feature

Checklist antes de implementar:

1. **Tipos**: ¿Nuevos tipos? → `lib/types.ts`
2. **DB**: ¿Cambios de esquema? → migración en `supabase/migration_*.sql` + actualizar `schema.sql`
3. **Queries**: Usar `lib/supabase/client.ts` (client) o `lib/supabase/service.ts` (server)
4. **Auth**: Si admin-only → `const { isAdmin } = useAuth()`
5. **Stats**: Si afecta goles/asistencias/paradas → revisar `lib/stats.ts`
6. **Cronómetro**: Si afecta tiempo → timestamps en DB via `lib/clock.ts`, nunca contadores locales

Convenciones: UI en español, código en inglés. Componentes en `components/`, utilidades en `lib/`, páginas en `app/`.

Entregar: explicación breve, archivos completos, SQL de migración si aplica.

$ARGUMENTS
