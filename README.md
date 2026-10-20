# Bolivia Dortmund — BVD 04

Web app (PWA) para registrar los partidos de fútbol 7 del **Bolivia Dortmund** y generar estadísticas de jugadores.
Liga F7 Baix Llobregat 2026-2027 (Fundació Valldor7), Primer Split, grupo Viernes "B".

Hermana de la app del Chevere FC: misma arquitectura, base de datos y deploy independientes.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Supabase (Postgres + Auth + Realtime)
- Vercel (crons de sincronización con la web de la liga)

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # rellenar con las claves del proyecto Supabase
npm run dev
```

Base de datos (SQL editor de Supabase, en este orden): `supabase/schema.sql` → `supabase/rls.sql` → `supabase/seed.sql`.

## Admin

Los usuarios de Supabase Auth con email `<usuario>@bvd04.fc` son administradores.
Para entrar: 5 toques rápidos en el escudo de la portada → `/login`.

## Sincronización con la liga

- `GET/POST /api/sync-standings` — clasificación (cron diario 20:00)
- `GET/POST /api/sync-fixtures` — calendario y resultados (cron cada 3 días)

Las URLs de scraping viven en `tournaments.standings_url` / `fixtures_url` del torneo `is_current`.
