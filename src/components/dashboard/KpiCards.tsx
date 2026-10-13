'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

interface Turno {
  horas: number[]
  horas_labels: string[]
  bultos_por_hora: number[]
  bultos_total: number
  operarios_unicos: number
  max_operarios_activos: number
  promedio_operarios_activos: number
  parque_max: number
}

function formatFecha(yyyymmdd: number): string {
  const s = String(yyyymmdd)
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`
}

export function KpiCards({ resumen, turnos }: { resumen: Resumen; turnos: Record<string, Turno> }) {
  const parque = resumen.parque_maquinas
  const totalBultos = resumen.total_bultos
  // Capacidad teórica máxima: parque * 8h * productividad media (asumimos ~40 bultos/h-op ponderado)
  const capacidadDia = parque * 24 * 40 // 90 maquinas * 24h * 40 bultos/h-op = 86,400 bultos/dia teoricos
  const diasHistorico = Math.max(1, Math.round((resumen.fecha_max - resumen.fecha_min) / 10000) + 1)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Bultos Preparados</CardDescription>
          <CardTitle className="text-3xl">{totalBultos.toLocaleString('es-AR')}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          En {resumen.total_registros.toLocaleString('es-AR')} registros · {resumen.total_operarios_unicos} operarios únicos
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Parque de Máquinas</CardDescription>
          <CardTitle className="text-3xl">{parque}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          1 operario activo por máquina · Cap. teórica: {(parque * 24).toLocaleString('es-AR')} h-op/día
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Período Histórico</CardDescription>
          <CardTitle className="text-2xl">{formatFecha(resumen.fecha_min)} → {formatFecha(resumen.fecha_max)}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Datos de {resumen.turnos.length} turnos · {resumen.circuitos.length} circuitos · {resumen.actividades.length} actividades
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Distribución por Turno</CardDescription>
          <CardTitle className="text-2xl">{Object.keys(turnos).length} turnos</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          {Object.entries(turnos).map(([k, t]) => (
            <div key={k} className="flex justify-between">
              <span>{k}:</span>
              <span className="font-mono">{(t.bultos_total / 1000).toFixed(0)}k bultos · máx {t.max_operarios_activos} ops</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
