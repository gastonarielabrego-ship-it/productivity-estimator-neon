'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface HeatmapData {
  [key: string]: {
    label: string
    hourly: number[]
    total: number
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getColor(value: number, max: number): string {
  if (value === 0 || max === 0) return 'bg-muted/40'
  const ratio = value / max
  if (ratio < 0.05) return 'bg-emerald-200/60 dark:bg-emerald-900/40'
  if (ratio < 0.15) return 'bg-emerald-400/70 dark:bg-emerald-700/60'
  if (ratio < 0.30) return 'bg-yellow-400/80 dark:bg-yellow-700/70'
  if (ratio < 0.50) return 'bg-orange-400/85 dark:bg-orange-700/80'
  if (ratio < 0.75) return 'bg-red-500/90 dark:bg-red-700/85'
  if (ratio < 0.90) return 'bg-rose-600 dark:bg-rose-800'
  return 'bg-fuchsia-700 dark:bg-fuchsia-900'
}

function HeatmapGrid({ data }: { data: HeatmapData }) {
  const keys = Object.keys(data)
  const max = useMemo(() => {
    let m = 1
    for (const k of Object.keys(data)) {
      m = Math.max(m, ...data[k].hourly)
    }
    return m
  }, [data])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="flex items-center gap-px mb-1">
          <div className="w-44 shrink-0 text-xs font-medium text-muted-foreground pr-2 text-right">Actividad</div>
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-mono">
              {h.toString().padStart(2, '0')}
            </div>
          ))}
          <div className="w-16 shrink-0 text-center text-xs font-medium text-muted-foreground pl-2">Total</div>
        </div>
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-px mb-1">
            <div className="w-44 shrink-0 text-xs font-medium truncate pr-2 text-right" title={data[k].label}>
              {data[k].label}
            </div>
            {HOURS.map((h) => {
              const v = data[k].hourly[h]
              return (
                <TooltipProvider key={h} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex-1 h-7 rounded-sm transition-all hover:ring-2 hover:ring-foreground/40 cursor-default ${getColor(v, max)}`}
                        aria-label={`${data[k].label} - Hora ${h}:00 - ${v.toLocaleString()} bultos`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-medium">{data[k].label}</div>
                      <div className="font-mono">Hora {h.toString().padStart(2, '0')}:00</div>
                      <div className="font-bold">{v.toLocaleString()} bultos</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
            <div className="w-16 shrink-0 text-center text-xs font-mono font-medium pl-2">
              {data[k].total.toLocaleString('es-AR')}
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-px">
            <div className="w-5 h-3 bg-muted/40 rounded-sm" />
            <div className="w-5 h-3 bg-emerald-400/70 rounded-sm" />
            <div className="w-5 h-3 bg-yellow-400/80 rounded-sm" />
            <div className="w-5 h-3 bg-orange-400/85 rounded-sm" />
            <div className="w-5 h-3 bg-red-500/90 rounded-sm" />
            <div className="w-5 h-3 bg-rose-600 rounded-sm" />
            <div className="w-5 h-3 bg-fuchsia-700 rounded-sm" />
          </div>
          <span>Más (máx: {max.toLocaleString('es-AR')} bultos/h)</span>
        </div>
      </div>
    </div>
  )
}

export function ProductivityHeatmap({ actividad, circuito }: { actividad: HeatmapData; circuito: HeatmapData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Calor - Bultos por Hora</CardTitle>
        <CardDescription>
          Distribución horaria (00:00 - 23:00) de bultos preparados. El color indica la intensidad de actividad por hora.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="actividad">
          <TabsList>
            <TabsTrigger value="actividad">Por Actividad</TabsTrigger>
            <TabsTrigger value="circuito">Por Circuito</TabsTrigger>
          </TabsList>
          <TabsContent value="actividad" className="mt-4">
            <HeatmapGrid data={actividad} />
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(actividad).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs">
                  {v.label}: {v.total.toLocaleString('es-AR')} bultos
                </Badge>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="circuito" className="mt-4">
            <HeatmapGrid data={circuito} />
            <p className="mt-3 text-xs text-muted-foreground">
              {Object.keys(circuito).length} circuitos. AP2, CH4 y PA2 son los más productivos.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
