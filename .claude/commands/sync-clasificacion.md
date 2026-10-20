# /sync-clasificacion

Depura la sincronización de clasificación y fixtures.

## Archivos
- `app/api/sync-standings/route.ts` — scraping clasificación
- `app/api/sync-fixtures/route.ts` — scraping fixtures + league_results
- `app/api/proxy-image/route.ts` — proxy logos
- `vercel.json` — cron schedules

## Si hay problemas, verificar:
- [ ] ¿La URL fuente sigue siendo válida?
- [ ] ¿Ha cambiado la estructura HTML?
- [ ] ¿HTML entities se decodifican bien?
- [ ] ¿RLS permite writes desde API route (service role key)?
- [ ] ¿SUPABASE_SERVICE_ROLE_KEY está configurada en Vercel?

$ARGUMENTS
