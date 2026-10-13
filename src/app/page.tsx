'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { ProductivityHeatmap } from '@/components/dashboard/ProductivityHeatmap'
import { ActivityBreakdown } from '@/components/dashboard/ActivityBreakdown'
import { EstimatorForm, type ProductividadValues } from '@/components/dashboard/EstimatorForm'
import { PlanningEstimator } from '@/components/dashboard/PlanningEstimator'

interface HeatmapData {
  [key: string]: { label: string; hourly: number[]; total: number }
}

interface ProductividadActividad {
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

interface OcupacionActividad {
  label: string
  operarios_activos_por_hora: number[]
  max_operarios_activos: number
  promedio_operarios_activos: number
}

interface Resumen {
  total_registros: number
  total_operarios_unicos: number
  total_bultos: number
  fecha_min: number
  fecha_max: number
  turnos: string[]
  actividades: string[]
  circuitos: string[]
  parque_maquinas: number
}

interface TurnoInfo {
  horas: number[]
  horas_labels: string[]
  bultos_por_hora: number[]
  bultos_total: number
  operarios_unicos: number
  max_operarios_activos: number
  promedio_operarios_activos: number
  parque_max: number
}

interface Config {
  parqueMaquinas: number
  horasJornada: number
  factorEficiencia: number
  productividad: ProductividadValues
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    resumen: Resumen
    turnos: Record<string, TurnoInfo>
    heatmap_actividad: HeatmapData
    heatmap_circuito: HeatmapData
    productividad_actividad: Record<string, ProductividadActividad>
    ocupacion_actividad: Record<string, OcupacionActividad>
    config: Config
  } | null>(null)

  // Estado de config editable
  const [config, setConfig] = useState<Config>({
    parqueMaquinas: 90,
    horasJornada: 8,
    factorEficiencia: 0.85,
    productividad: { productividadAct2: 48.47, productividadAct3: 5.93, productividadAct4: 35.07 },
  })

  useEffect(() => {
    fetch('/api/productivity')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        if (d.config) setConfig(d.config)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveConfig = useCallback((cfg: Config) => {
    setConfig(cfg)
    // Persistir en localStorage para mantener entre sesiones
    localStorage.setItem('productivity_config', JSON.stringify(cfg))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando datos de productividad...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error: {error || 'No se pudieron cargar los datos'}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Estimador de Productividad por Hora</h1>
              <p className="text-xs text-muted-foreground">
                Preparación STD · Parque {config.parqueMaquinas} máquinas · 1 operario/máquina · Productividad basada en histórico de {data.resumen.total_registros.toLocaleString('es-AR')} registros
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Act 2: {config.productividad.productividadAct2.toFixed(1)} bultos/h-op
              </span>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Act 3: {config.productividad.productividadAct3.toFixed(1)} bultos/h-op
              </span>
              <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300">
                Act 4: {config.productividad.productividadAct4.toFixed(1)} bultos/h-op
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <KpiCards resumen={data.resumen} turnos={data.turnos} />

        <Tabs defaultValue="heatmap" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
            <TabsTrigger value="actividades">Por Actividad</TabsTrigger>
            <TabsTrigger value="estimador">Estimador</TabsTrigger>
            <TabsTrigger value="planificacion">Planificación</TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="space-y-6">
            <ProductivityHeatmap
              actividad={data.heatmap_actividad}
              circuito={data.heatmap_circuito}
            />
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                <p>
                  El mapa de calor muestra la distribución horaria (24h) de bultos preparados por actividad (Preparación, Setup y Expedición) y por circuito. Las horas pico del turno mañana (10:00) y tarde (16:00) concentran la mayor actividad. El turno noche opera entre las 23:00 y 05:00 con un pico a las 01:00.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actividades" className="space-y-6">
            <ActivityBreakdown
              productividad={data.productividad_actividad}
              ocupacion={data.ocupacion_actividad}
              parqueMaquinas={config.parqueMaquinas}
            />
          </TabsContent>

          <TabsContent value="estimador" className="space-y-6">
            <EstimatorForm
              parqueMaquinas={config.parqueMaquinas}
              horasJornada={config.horasJornada}
              factorEficiencia={config.factorEficiencia}
              productividad={config.productividad}
              onSaveConfig={handleSaveConfig}
            />
          </TabsContent>

          <TabsContent value="planificacion" className="space-y-6">
            <PlanningEstimator
              parqueMaquinas={config.parqueMaquinas}
              horasJornada={config.horasJornada}
              factorEficiencia={config.factorEficiencia}
              productividad={config.productividad}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t bg-card/30">
        <div className="container mx-auto px-4 py-3 text-xs text-muted-foreground">
          <p>
            Estimador de productividad basado en histórico ({data.resumen.fecha_min} → {data.resumen.fecha_max}).
            Datos agregados de {data.resumen.total_registros.toLocaleString('es-AR')} registros · {data.resumen.circuitos.length} circuitos · {data.resumen.total_operarios_unicos} operarios únicos.
            Persistencia: Neon PostgreSQL · Deploy: Vercel.
          </p>
        </div>
      </footer>
    </div>
  )
}
