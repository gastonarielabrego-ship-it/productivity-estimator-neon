# Estimador de Productividad por Hora

Dashboard de estimación de productividad por hora basado en histórico de preparación de pedidos. Construido con Next.js 16, Prisma y PostgreSQL (Neon).

## Funcionalidades

- **Mapa de calor 24h** de bultos preparados por actividad y por circuito
- **Estimador de productividad**: ingresa bultos planificados por actividad y calcula:
  - Cantidad de colaboradores (operarios) necesarios
  - Porcentaje del parque (90 máquinas) utilizado
  - Horas estimadas de preparación
- **Desglose por actividad**: productividad media, P50, P95, bultos totales y % del parque
- **Estimador de planificación**: carga planes por fecha/turno/actividad, persiste en Neon DB y calcula el cruce con la productividad histórica

## Datos de referencia (histórico)

- 115.994 registros de Preparación STD
- 3 turnos: Noche (23-05), Mañana (06-13), Tarde (14-22)
- 3 actividades:
  - **Act 2 - Preparación** (circuitos AP/BE/PA): ~48 bultos/h-op
  - **Act 3 - Setup / Tiempo muerto**: ~6 bultos/h-op
  - **Act 4 - Expedición** (otros circuitos): ~35 bultos/h-op
- 13 circuitos: AP2, BE2, PA2, AER, DP4, CH4, BE4, IMP, PA4, BRA, AP4, FST, XXX
- Parque de **90 máquinas** = 90 operarios activos máximo por turno

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma + PostgreSQL (Neon)
- **Deploy**: Vercel

## Setup local

```bash
bun install
cp .env.example .env.local  # configurar DATABASE_URL
bun run db:push              # crear tablas en Neon
bun run dev                 # arrancar en localhost:3000
```

## Datos agregados

Los datos agregados (heatmap, productividad, etc.) están en `public/data/` como JSON. El dashboard los consume vía `/api/productivity` sin necesidad de conexión a DB.

La DB (Neon) se usa para persistir los planes de planificación cargados por el usuario.

## Cómo usar el estimador

1. Abre el dashboard y ve a la pestaña **Estimador**
2. Ingresa los bultos planificados por actividad (2, 3, 4)
3. Ajusta las horas disponibles (slider)
4. El sistema calcula en tiempo real:
   - Operarios requeridos por actividad
   - % del parque (90 máquinas) utilizado
   - Horas estimadas para completar

## Cómo usar el estimador de planificación

1. Ve a la pestaña **Planificación**
2. Carga planes por fecha/turno/actividad con los bultos planificados
3. El sistema calcula automáticamente:
   - Operarios requeridos por plan
   - % del parque utilizado por plan
   - Total acumulado vs. capacidad del parque
   - Horas totales estimadas (paralelo o serie)

Si la DB Neon no está configurada, los planes se guardan en localStorage como fallback.
