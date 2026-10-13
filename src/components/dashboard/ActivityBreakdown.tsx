'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface ProductividadActividad {
  label: string
  bultos_por_hora_media: number
  bultos_por_hora_mediana: number
  bultos_por_hora_p25: number
  bultos_por_hora_p75: number
  bultos_por_hora_p95: number
  bultos_por_hora_max: number
  operarios_unicos: number
  bultos_totales: number
  horas_activas_total: number
}

export interface OcupacionActividad {
  label: string
  operarios_activos_por_hora: number[]
  max_operarios_activos: number
  promedio_operarios_activos: number
}

interface Props {
  productividad: Record<string, ProductividadActividad>
  ocupacion: Record<string, OcupacionActividad>
  parqueMaquinas: number
}

const ACTIVIDAD_COLORS: Record<string, string> = {
  '2': 'bg-emerald-500',
  '3': 'bg-amber-500',
  '4': 'bg-violet-500',
}

export function ActivityBreakdown({ productividad, ocupacion, parqueMaquinas }: Props) {
  const keys = Object.keys(productividad).sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por Actividad</CardTitle>
        <CardDescription>
          Productividad por actividad, personas asignadas y porcentaje del parque (90 máquinas) utilizado por actividad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((act) => {
          const p = productividad[act]
          const o = ocupacion[act]
          const parquePct = ((o.max_operarios_activos / parqueMaquinas) * 100)
          const bultosPorHoraActiva = p.bultos_por_hora_media
          // Capacidad máxima teórica con todo el parque (90 personas) en jornada 8h
          const capacidadMaxima8h = parqueMaquinas * 8 * bultosPorHoraActiva
          // Cuántos operarios se necesitan para producir, ej, 10.000 bultos en 8h
          const bultosPorTurnoEjemplo = 10000
          const operariosNecesarios = Math.ceil(bultosPorTurnoEjemplo / (bultosPorHoraActiva * 8))

          return (
            <div key={act} className="border rounded-lg p-4 space-y-3 bg-card/50">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${ACTIVIDAD_COLORS[act] || 'bg-primary'}`} />
                  <div>
                    <div className="font-semibold text-base">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Actividad {act} · {p.operarios_unicos} operarios únicos · {p.horas_activas_total.toLocaleString('es-AR')} horas-activa registradas
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Parque máx: {parquePct.toFixed(1)}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Bultos/hora (media)</div>
                  <div className="text-xl font-bold">{bultosPorHoraActiva.toFixed(1)}</div>
                </div>
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Bultos/hora (P50)</div>
                  <div className="text-xl font-bold">{p.bultos_por_hora_mediana.toFixed(1)}</div>
                </div>
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Bultos/hora (P95)</div>
                  <div className="text-xl font-bold">{p.bultos_por_hora_p95.toFixed(1)}</div>
                </div>
                <div className="bg-muted/40 rounded-md p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Bultos totales</div>
                  <div className="text-xl font-bold">{p.bultos_totales.toLocaleString('es-AR')}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Ocupación máx. del parque ({o.max_operarios_activos} de {parqueMaquinas} máquinas activas)
                  </span>
                  <span className="font-mono">{parquePct.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(parquePct, 100)} className="h-2" />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help">
                        Cap. máx. 8h parque: {capacidadMaxima8h.toLocaleString('es-AR')} bultos
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Si las {parqueMaquinas} máquinas trabajaran 8h a {bultosPorHoraActiva.toFixed(1)} bultos/h: {capacidadMaxima8h.toLocaleString('es-AR')} bultos por turno.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help">
                        Operarios para 10k bultos en 8h: {operariosNecesarios}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Para preparar 10.000 bultos en un turno de 8h se necesitan {operariosNecesarios} operarios ({((operariosNecesarios / parqueMaquinas) * 100).toFixed(1)}% del parque).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline" className="text-emerald-600">
                  Operarios activos prom: {o.promedio_operarios_activos.toFixed(1)}
                </Badge>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
