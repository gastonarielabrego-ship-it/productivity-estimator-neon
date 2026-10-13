'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend, ComposedChart, ReferenceLine } from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ProductividadValues {
  productividadAct2: number
  productividadAct3: number
  productividadAct4: number
}

interface DistribucionHoraria {
  n_fechas: number
  parque_maquinas: number
  distribucion_por_actividad: Record<string, {
    hourly_bultos: number[]
    pesos: number[]
    operarios_activos_promedio: number[]
    total_bultos: number
    horas_con_actividad: number[]
  }>
  distribucion_por_turno: Record<string, any>
  horas_labels: string[]
  turnos_horas: Record<string, number[]>
}

interface Props {
  parqueMaquinas: number
  horasJornada: number
  factorEficiencia: number
  productividad: ProductividadValues
  distribucionHoraria?: DistribucionHoraria
  onSaveConfig?: (cfg: { parqueMaquinas: number; horasJornada: number; factorEficiencia: number; productividad: ProductividadValues }) => void
}

const ACTIVIDAD_LABELS: Record<string, string> = {
  '2': 'Preparación (AP/BE/PA)',
  '3': 'Setup / Tiempo muerto',
  '4': 'Expedición / Otros',
}

const ACTIVIDAD_COLORS: Record<string, string> = {
  '2': '#10b981', // emerald
  '3': '#f59e0b', // amber
  '4': '#8b5cf6', // violet
}

export function EstimatorForm({ parqueMaquinas, horasJornada, factorEficiencia, productividad, onSaveConfig, distribucionHoraria }: Props) {
  // Estado de inputs
  const [bultosAct2, setBultosAct2] = useState(5000)
  const [bultosAct3, setBultosAct3] = useState(500)
  const [bultosAct4, setBultosAct4] = useState(4000)
  const [horasDisponibles, setHorasDisponibles] = useState(horasJornada)

  // Editable config
  const [editParque, setEditParque] = useState(parqueMaquinas)
  const [editJornada, setEditJornada] = useState(horasJornada)
  const [editEficiencia, setEditEficiencia] = useState(factorEficiencia)
  const [editProd2, setEditProd2] = useState(productividad.productividadAct2)
  const [editProd3, setEditProd3] = useState(productividad.productividadAct3)
  const [editProd4, setEditProd4] = useState(productividad.productividadAct4)

  // Cálculos
  const result = useMemo(() => {
    const totalBultos = bultosAct2 + bultosAct3 + bultosAct4
    // Capacidad efectiva por operario por hora = productividad * eficiencia
    const cap2 = editProd2 * editEficiencia
    const cap3 = editProd3 * editEficiencia
    const cap4 = editProd4 * editEficiencia

    // Operarios necesarios por actividad para cumplir en horasDisponibles
    const ops2 = cap2 > 0 ? bultosAct2 / (cap2 * horasDisponibles) : 0
    const ops3 = cap3 > 0 ? bultosAct3 / (cap3 * horasDisponibles) : 0
    const ops4 = cap4 > 0 ? bultosAct4 / (cap4 * horasDisponibles) : 0
    const opsTotal = ops2 + ops3 + ops4

    // Porcentaje del parque
    const parquePct = (opsTotal / editParque) * 100

    // Horas requeridas si usamos todo el parque
    const bultosPorHoraParque = (editProd2 * editEficiencia * editParque) + (editProd4 * editEficiencia * editParque) + (editProd3 * editEficiencia * editParque)
    const horasRequeridas = bultosPorHoraParque > 0 ? totalBultos / bultosPorHoraParque : Infinity

    // Cuántas horas tardaríamos si usamos opsTotal operarios (óptimo)
    const bultosPorHoraActual = (cap2 * ops2 + cap3 * ops3 + cap4 * ops4)
    const horasRequeridasActual = bultosPorHoraActual > 0 ? totalBultos / bultosPorHoraActual : Infinity

    // Bultos por hora que se deberían producir (objetivo) = total / horas activas disponibles
    const bultosPorHoraObjetivo = horasDisponibles > 0 ? totalBultos / horasDisponibles : 0

    // Productividad ponderada calculada con la distribución actual de bultos
    const totalBultosPorActividad = bultosAct2 + bultosAct3 + bultosAct4
    const prodPonderadaActual = totalBultosPorActividad > 0
      ? (bultosAct2 * editProd2 + bultosAct3 * editProd3 + bultosAct4 * editProd4) / totalBultosPorActividad
      : (editProd2 + editProd3 + editProd4) / 3

    // Capacidad máxima del parque completo (90 máquinas con productividad ponderada × eficiencia)
    const capMaximaParque = editParque * prodPonderadaActual * editEficiencia
    // Capacidad con los operarios asignados (la que realmente se puede entregar)
    const capAsignada = bultosPorHoraActual

    // % de la capacidad asignada que se usaría
    const pctCapacidadAsignada = capAsignada > 0 ? (bultosPorHoraObjetivo / capAsignada) * 100 : 0
    // % de la capacidad máxima del parque que se usaría
    const pctCapacidadParque = capMaximaParque > 0 ? (bultosPorHoraObjetivo / capMaximaParque) * 100 : 0

    // Margen (capacidad asignada - objetivo). Si es positivo, hay holgura; si negativo, no alcanza
    const margen = capAsignada - bultosPorHoraObjetivo

    // ============ DISTRIBUCIÓN POR HORA ============
    // Margen del 10%: se programa el 90% del total planificado, dejando 10% pendiente como buffer
    // Para cada hora, repartir los bultos de cada actividad según el peso histórico de esa hora
    // Solo considerar horas activas del histórico de la actividad
    const MARGEN_PCT = 0.10
    const FRACCION_A_PROGRAMAR = 1 - MARGEN_PCT // 90% se planifica, 10% queda pendiente

    const distribucionPorHora = ((): Array<{
      hora: string
      horaIdx: number
      act2: number
      act3: number
      act4: number
      total: number
      pendienteAct2: number
      pendienteAct3: number
      pendienteAct4: number
      pesoAct2: number
      pesoAct3: number
      pesoAct4: number
    }> => {
      if (!distribucionHoraria) return []
      const horasLabels = distribucionHoraria.horas_labels
      return Array.from({ length: 24 }, (_, h) => {
        const dist = distribucionHoraria.distribucion_por_actividad
        const peso2 = dist['2']?.pesos[h] || 0
        const peso3 = dist['3']?.pesos[h] || 0
        const peso4 = dist['4']?.pesos[h] || 0
        // Bultos a producir en esta hora (90% del planificado) repartido según peso histórico
        const act2Prog = Math.round(bultosAct2 * FRACCION_A_PROGRAMAR * peso2)
        const act3Prog = Math.round(bultosAct3 * FRACCION_A_PROGRAMAR * peso3)
        const act4Prog = Math.round(bultosAct4 * FRACCION_A_PROGRAMAR * peso4)
        // Pendiente (10% del planificado) repartido según peso histórico (o como buffer)
        const pendAct2 = Math.round(bultosAct2 * MARGEN_PCT * peso2)
        const pendAct3 = Math.round(bultosAct3 * MARGEN_PCT * peso3)
        const pendAct4 = Math.round(bultosAct4 * MARGEN_PCT * peso4)
        return {
          hora: horasLabels[h],
          horaIdx: h,
          act2: act2Prog,
          act3: act3Prog,
          act4: act4Prog,
          total: act2Prog + act3Prog + act4Prog,
          pendienteAct2: pendAct2,
          pendienteAct3: pendAct3,
          pendienteAct4: pendAct4,
          pesoAct2: peso2,
          pesoAct3: peso3,
          pesoAct4: peso4,
        }
      })
    })()

    // Totales por actividad
    const distribucionTotales = distribucionPorHora.reduce(
      (acc, h) => {
        acc.act2 += h.act2
        acc.act3 += h.act3
        acc.act4 += h.act4
        acc.pendAct2 += h.pendienteAct2
        acc.pendAct3 += h.pendienteAct3
        acc.pendAct4 += h.pendienteAct4
        return acc
      },
      { act2: 0, act3: 0, act4: 0, pendAct2: 0, pendAct3: 0, pendAct4: 0 }
    )

    return {
      totalBultos,
      ops2: Math.ceil(ops2),
      ops3: Math.ceil(ops3),
      ops4: Math.ceil(ops4),
      opsTotalExact: opsTotal,
      opsTotal: Math.ceil(opsTotal),
      parquePct,
      horasRequeridasParque: isFinite(horasRequeridas) ? horasRequeridas : 0,
      horasRequeridasActual: isFinite(horasRequeridasActual) ? horasRequeridasActual : 0,
      bultosPorHoraParque,
      bultosPorHoraActual,
      bultosPorHoraObjetivo,
      capMaximaParque,
      capAsignada,
      prodPonderadaActual,
      pctCapacidadAsignada,
      pctCapacidadParque,
      margen,
      distribucionPorHora,
      distribucionTotales,
    }
  }, [bultosAct2, bultosAct3, bultosAct4, horasDisponibles, editParque, editJornada, editEficiencia, editProd2, editProd3, editProd4, distribucionHoraria])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimador de Productividad por Hora</CardTitle>
        <CardDescription>
          Ingrese los bultos planificados por actividad y el sistema calcula colaboradores necesarios, horas estimadas y porcentaje del parque utilizado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="calculo">
          <TabsList>
            <TabsTrigger value="calculo">Cálculo</TabsTrigger>
            <TabsTrigger value="config">Ajustes</TabsTrigger>
          </TabsList>

          <TabsContent value="calculo" className="space-y-4 mt-4">
            {/* Inputs de bultos por actividad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="b2">Bultos Actividad 2 (Preparación)</Label>
                <Input
                  id="b2"
                  type="number"
                  value={bultosAct2}
                  onChange={(e) => setBultosAct2(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Ref. productividad: {editProd2.toFixed(1)} bultos/h-op
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b3">Bultos Actividad 3 (Setup/Tiempo muerto)</Label>
                <Input
                  id="b3"
                  type="number"
                  value={bultosAct3}
                  onChange={(e) => setBultosAct3(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Ref. productividad: {editProd3.toFixed(1)} bultos/h-op
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b4">Bultos Actividad 4 (Expedición)</Label>
                <Input
                  id="b4"
                  type="number"
                  value={bultosAct4}
                  onChange={(e) => setBultosAct4(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Ref. productividad: {editProd4.toFixed(1)} bultos/h-op
                </p>
              </div>
            </div>

            {/* Horas disponibles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Horas disponibles para preparar</Label>
                <Badge variant="outline" className="font-mono">{horasDisponibles.toFixed(1)} h</Badge>
              </div>
              <Slider
                min={1}
                max={24}
                step={0.5}
                value={[horasDisponibles]}
                onValueChange={(v) => setHorasDisponibles(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Mueva el slider para indicar cuántas horas tienen los operarios para preparar el volumen (ej: 8h por turno).
              </p>
            </div>

            <Separator />

            {/* Resultados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/40 rounded-md p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Total Bultos</div>
                <div className="text-2xl font-bold">{result.totalBultos.toLocaleString('es-AR')}</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Operarios requeridos</div>
                <div className="text-2xl font-bold text-primary">{result.opsTotal}</div>
                <div className="text-[10px] text-muted-foreground">{result.opsTotalExact.toFixed(1)} exacto</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3">
                <div className="text-[10px] uppercase text-muted-foreground">% Parque utilizado</div>
                <div className="text-2xl font-bold">{result.parquePct.toFixed(1)}%</div>
              </div>
              <div className="bg-muted/40 rounded-md p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Horas estimadas</div>
                <div className="text-2xl font-bold">{result.horasRequeridasActual.toFixed(1)}h</div>
              </div>
            </div>

            {/* Detalle por actividad */}
            <div className="border rounded-md p-3 space-y-2">
              <div className="text-sm font-semibold">Detalle de operarios por actividad</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Act 2 (Prep)</div>
                  <div className="text-xl font-bold text-emerald-600">{result.ops2}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(result.ops2 / editParque * 100).toFixed(1)}% del parque
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Act 3 (Setup)</div>
                  <div className="text-xl font-bold text-amber-600">{result.ops3}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(result.ops3 / editParque * 100).toFixed(1)}% del parque
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Act 4 (Exped)</div>
                  <div className="text-xl font-bold text-violet-600">{result.ops4}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(result.ops4 / editParque * 100).toFixed(1)}% del parque
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de ocupación del parque */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Ocupación del parque ({result.opsTotal} de {editParque} máquinas)</span>
                <span className={`font-mono ${result.parquePct > 100 ? 'text-red-600' : ''}`}>
                  {result.parquePct.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.min(result.parquePct, 100)} className="h-3" />
              {result.parquePct > 100 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠ Se requieren más operarios que el parque disponible. Reducir volumen o aumentar horas.
                </p>
              )}
            </div>

            <Separator />

            {/* Bultos por hora que se deberían producir */}
            <div className="border-2 rounded-lg p-4 space-y-3 bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-500 rounded-sm" />
                <div>
                  <div className="text-sm font-semibold">Bultos por hora que se deberían producir</div>
                  <div className="text-xs text-muted-foreground">
                    Calculado como <strong>bultos planificados / horas activas disponibles</strong>: {result.totalBultos.toLocaleString('es-AR')} bultos / {horasDisponibles.toFixed(1)} h
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-blue-200 dark:border-blue-900">
                  <div className="text-[10px] uppercase text-muted-foreground">Objetivo (bultos/hora)</div>
                  <div className="text-2xl font-bold text-blue-600">{Math.round(result.bultosPorHoraObjetivo).toLocaleString('es-AR')}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Para cumplir en {horasDisponibles.toFixed(1)}h
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-emerald-200 dark:border-emerald-900">
                  <div className="text-[10px] uppercase text-muted-foreground">Capacidad asignada</div>
                  <div className="text-2xl font-bold text-emerald-600">{Math.round(result.capAsignada).toLocaleString('es-AR')}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Con {result.opsTotal} operarios asignados
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-amber-200 dark:border-amber-900">
                  <div className="text-[10px] uppercase text-muted-foreground">Capacidad máx. parque</div>
                  <div className="text-2xl font-bold text-amber-600">{Math.round(result.capMaximaParque).toLocaleString('es-AR')}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {editParque} máquinas × {result.prodPonderadaActual.toFixed(1)} b/h × {(editEficiencia * 100).toFixed(0)}%
                  </div>
                </div>
                <div className={`bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border ${result.margen >= 0 ? 'border-emerald-300 dark:border-emerald-700' : 'border-red-300 dark:border-red-700'}`}>
                  <div className="text-[10px] uppercase text-muted-foreground">Margen vs objetivo</div>
                  <div className={`text-2xl font-bold ${result.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {result.margen >= 0 ? '+' : ''}{Math.round(result.margen).toLocaleString('es-AR')}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    bultos/h de holgura
                  </div>
                </div>
              </div>

              {/* Comparativa visual: objetivo vs capacidades */}
              <div className="space-y-2">
                <div className="text-xs font-medium">Comparativa objetivo vs capacidad</div>

                {/* Objetivo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Objetivo: {Math.round(result.bultosPorHoraObjetivo).toLocaleString('es-AR')} b/h</span>
                    <span className="font-mono text-blue-600">{result.pctCapacidadParque.toFixed(1)}% del parque máx.</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(result.pctCapacidadParque, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Capacidad asignada */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Capacidad con {result.opsTotal} operarios: {Math.round(result.capAsignada).toLocaleString('es-AR')} b/h</span>
                    <span className={`font-mono ${result.pctCapacidadAsignada > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {result.pctCapacidadAsignada.toFixed(1)}% del objetivo
                    </span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute h-full rounded-full ${result.pctCapacidadAsignada > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(result.pctCapacidadAsignada, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Alertas */}
              {result.bultosPorHoraObjetivo > 0 && (
                <div className="space-y-1.5">
                  {result.parquePct > 100 && (
                    <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                      ⚠ <strong>Falta capacidad del parque:</strong> se requieren {result.opsTotal} operarios pero el parque solo tiene {editParque} máquinas. {Math.abs(Math.round(result.margen)).toLocaleString('es-AR')} b/h de déficit. Opciones: aumentar horas, reducir bultos, o ampliar el parque.
                    </p>
                  )}
                  {result.pctCapacidadParque > 100 && (
                    <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                      🚨 <strong>Imposible con parque actual:</strong> el objetivo ({Math.round(result.bultosPorHoraObjetivo).toLocaleString('es-AR')} b/h) supera la capacidad máxima del parque ({Math.round(result.capMaximaParque).toLocaleString('es-AR')} b/h). Demanda {result.pctCapacidadParque.toFixed(0)}% de la capacidad máxima.
                    </p>
                  )}
                  {result.parquePct <= 100 && result.parquePct >= 90 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                      ⚡ <strong>Operación al límite:</strong> se usan {result.parquePct.toFixed(0)}% del parque ({result.opsTotal} de {editParque} máquinas). Margen {result.margen >= 0 ? 'de' : 'negativo de'} {Math.abs(Math.round(result.margen)).toLocaleString('es-AR')} b/h. Cualquier imprevisto puede comprometer el cumplimiento.
                    </p>
                  )}
                  {result.parquePct < 90 && result.parquePct >= 50 && (
                    <p className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                      📊 <strong>Plan equilibrado:</strong> usa {result.parquePct.toFixed(0)}% del parque ({result.opsTotal} de {editParque} máquinas). Margen de {Math.round(result.margen).toLocaleString('es-AR')} b/h sobre el objetivo de {Math.round(result.bultosPorHoraObjetivo).toLocaleString('es-AR')} b/h.
                    </p>
                  )}
                  {result.parquePct < 50 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                      ✓ <strong>Plan factible:</strong> solo se necesita {result.parquePct.toFixed(0)}% del parque ({result.opsTotal} de {editParque} máquinas). Margen amplio de {Math.round(result.margen).toLocaleString('es-AR')} b/h ({((result.margen / result.capAsignada) * 100).toFixed(0)}% sobre el objetivo). Capacidad sobrante para imprevistos o picos.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Distribución por hora según histórico, con 10% pendiente */}
            {distribucionHoraria && result.distribucionPorHora.length > 0 && (
              <HourlyDistribution
                data={result.distribucionPorHora}
                totales={result.distribucionTotales}
                bultosAct2={bultosAct2}
                bultosAct3={bultosAct3}
                bultosAct4={bultosAct4}
              />
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Ajuste los parámetros del parque y la productividad. Los valores por defecto se obtienen del histórico del archivo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parque">Tamaño del parque (máquinas)</Label>
                <Input
                  id="parque"
                  type="number"
                  value={editParque}
                  onChange={(e) => setEditParque(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jornada">Horas por jornada</Label>
                <Input
                  id="jornada"
                  type="number"
                  step="0.5"
                  value={editJornada}
                  onChange={(e) => setEditJornada(Math.max(1, parseFloat(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="eficiencia">Factor de eficiencia ({(editEficiencia * 100).toFixed(0)}%)</Label>
                <Slider
                  id="eficiencia"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={[editEficiencia]}
                  onValueChange={(v) => setEditEficiencia(v[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Ajusta por breaks, setup, fatiga. 85% es estándar operativo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2">Productividad Act 2 (bultos/h-op)</Label>
                <Input
                  id="p2"
                  type="number"
                  step="0.1"
                  value={editProd2}
                  onChange={(e) => setEditProd2(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p3">Productividad Act 3 (bultos/h-op)</Label>
                <Input
                  id="p3"
                  type="number"
                  step="0.1"
                  value={editProd3}
                  onChange={(e) => setEditProd3(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p4">Productividad Act 4 (bultos/h-op)</Label>
                <Input
                  id="p4"
                  type="number"
                  step="0.1"
                  value={editProd4}
                  onChange={(e) => setEditProd4(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>
            <Button onClick={() => onSaveConfig?.({
              parqueMaquinas: editParque,
              horasJornada: editJornada,
              factorEficiencia: editEficiencia,
              productividad: {
                productividadAct2: editProd2,
                productividadAct3: editProd3,
                productividadAct4: editProd4,
              }
            })}>
              Guardar configuración
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ====================================================
// Componente: Distribución por hora
// ====================================================

interface HourRow {
  hora: string
  horaIdx: number
  act2: number
  act3: number
  act4: number
  total: number
  pendienteAct2: number
  pendienteAct3: number
  pendienteAct4: number
  pesoAct2: number
  pesoAct3: number
  pesoAct4: number
}

interface HourlyDistProps {
  data: HourRow[]
  totales: { act2: number; act3: number; act4: number; pendAct2: number; pendAct3: number; pendAct4: number }
  bultosAct2: number
  bultosAct3: number
  bultosAct4: number
}

function HourlyDistribution({ data, totales, bultosAct2, bultosAct3, bultosAct4 }: HourlyDistProps) {
  const [expanded, setExpanded] = useState(true)

  // Filtrar solo horas con alguna actividad
  const activeRows = data.filter((r) => r.total > 0 || r.pendienteAct2 + r.pendienteAct3 + r.pendienteAct4 > 0)
  // Pico del día para resaltar
  const maxTotal = Math.max(...activeRows.map((r) => r.total), 1)
  // Total pendiente (10%)
  const totalPendiente = totales.pendAct2 + totales.pendAct3 + totales.pendAct4
  // Total programado (90%)
  const totalProgramado = totales.act2 + totales.act3 + totales.act4
  // Total planificado
  const totalPlanificado = bultosAct2 + bultosAct3 + bultosAct4

  return (
    <div className="border-2 rounded-lg p-4 space-y-3 bg-violet-50/30 dark:bg-violet-900/10 border-violet-200 dark:border-violet-900">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-violet-500 rounded-sm" />
          <div>
            <div className="text-sm font-semibold">Distribución por hora (según histórico) · 90% programado + 10% pendiente</div>
            <div className="text-xs text-muted-foreground">
              Reparte los bultos planificados según el patrón histórico de cada hora por actividad, dejando un <strong>10% como pendiente</strong> para absorber imprevistos.
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-violet-200 dark:border-violet-900">
              <div className="text-[10px] uppercase text-muted-foreground">Planificado total</div>
              <div className="text-xl font-bold">{totalPlanificado.toLocaleString('es-AR')}</div>
              <div className="text-[10px] text-muted-foreground">bultos</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-emerald-200 dark:border-emerald-900">
              <div className="text-[10px] uppercase text-muted-foreground">A programar (90%)</div>
              <div className="text-xl font-bold text-emerald-600">{totalProgramado.toLocaleString('es-AR')}</div>
              <div className="text-[10px] text-muted-foreground">bultos distribuidos por hora</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-amber-200 dark:border-amber-900">
              <div className="text-[10px] uppercase text-muted-foreground">Pendiente (10%)</div>
              <div className="text-xl font-bold text-amber-600">{totalPendiente.toLocaleString('es-AR')}</div>
              <div className="text-[10px] text-muted-foreground">buffer para imprevistos</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-blue-200 dark:border-blue-900">
              <div className="text-[10px] uppercase text-muted-foreground">Hora pico</div>
              <div className="text-xl font-bold text-blue-600">
                {activeRows.find((r) => r.total === maxTotal)?.hora || '-'}
              </div>
              <div className="text-[10px] text-muted-foreground">{maxTotal.toLocaleString('es-AR')} bultos</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/40 rounded-md p-3 border border-slate-200 dark:border-slate-900">
              <div className="text-[10px] uppercase text-muted-foreground">Horas activas</div>
              <div className="text-xl font-bold">{activeRows.length}</div>
              <div className="text-[10px] text-muted-foreground">de 24 horas</div>
            </div>
          </div>

          {/* Gráfico de barras apiladas por hora */}
          <div>
            <div className="text-xs font-medium mb-2">Bultos por hora a producir (apilado por actividad)</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={activeRows} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip
                  formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="act2" name="Act 2 - Preparación" stackId="a" fill={ACTIVIDAD_COLORS['2']} />
                <Bar dataKey="act3" name="Act 3 - Setup" stackId="a" fill={ACTIVIDAD_COLORS['3']} />
                <Bar dataKey="act4" name="Act 4 - Expedición" stackId="a" fill={ACTIVIDAD_COLORS['4']} />
                <ReferenceLine
                  y={maxTotal}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: `Pico: ${maxTotal.toLocaleString('es-AR')}`, position: 'right', fill: '#ef4444', fontSize: 10 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detallada */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-16">Hora</TableHead>
                  <TableHead className="text-right">Act 2 (Prep)</TableHead>
                  <TableHead className="text-right">Act 3 (Setup)</TableHead>
                  <TableHead className="text-right">Act 4 (Exped)</TableHead>
                  <TableHead className="text-right">Total/hora</TableHead>
                  <TableHead className="text-right">Pendiente/hora</TableHead>
                  <TableHead className="text-right w-20">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRows.map((r) => {
                  const pctDelTotal = totalProgramado > 0 ? (r.total / totalProgramado) * 100 : 0
                  const pendienteTotal = r.pendienteAct2 + r.pendienteAct3 + r.pendienteAct4
                  return (
                    <TableRow key={r.horaIdx} className={r.total === maxTotal ? 'bg-amber-50 dark:bg-amber-900/20' : ''}>
                      <TableCell className="font-mono font-semibold">{r.hora}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{r.act2 > 0 ? r.act2.toLocaleString('es-AR') : '–'}</TableCell>
                      <TableCell className="text-right font-mono text-amber-600">{r.act3 > 0 ? r.act3.toLocaleString('es-AR') : '–'}</TableCell>
                      <TableCell className="text-right font-mono text-violet-600">{r.act4 > 0 ? r.act4.toLocaleString('es-AR') : '–'}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{r.total.toLocaleString('es-AR')}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">
                        {pendienteTotal > 0 ? `+${pendienteTotal.toLocaleString('es-AR')}` : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {pctDelTotal.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-muted/40 font-semibold border-t-2">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">{totales.act2.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{totales.act3.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right font-mono text-violet-600">{totales.act4.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{totalProgramado.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{totalPendiente.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-right font-mono">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Resumen por actividad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-3 rounded border border-emerald-200 dark:border-emerald-800">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">Act 2 - Preparación</div>
              <div>Planificado: <strong>{bultosAct2.toLocaleString('es-AR')}</strong></div>
              <div>Programado (90%): <strong>{totales.act2.toLocaleString('es-AR')}</strong></div>
              <div>Pendiente (10%): <strong>{totales.pendAct2.toLocaleString('es-AR')}</strong></div>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
              <div className="font-semibold text-amber-700 dark:text-amber-400">Act 3 - Setup</div>
              <div>Planificado: <strong>{bultosAct3.toLocaleString('es-AR')}</strong></div>
              <div>Programado (90%): <strong>{totales.act3.toLocaleString('es-AR')}</strong></div>
              <div>Pendiente (10%): <strong>{totales.pendAct3.toLocaleString('es-AR')}</strong></div>
            </div>
            <div className="bg-violet-50/50 dark:bg-violet-900/20 p-3 rounded border border-violet-200 dark:border-violet-800">
              <div className="font-semibold text-violet-700 dark:text-violet-400">Act 4 - Expedición</div>
              <div>Planificado: <strong>{bultosAct4.toLocaleString('es-AR')}</strong></div>
              <div>Programado (90%): <strong>{totales.act4.toLocaleString('es-AR')}</strong></div>
              <div>Pendiente (10%): <strong>{totales.pendAct4.toLocaleString('es-AR')}</strong></div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>¿Cómo se calcula?</strong> Para cada hora del día, el peso histórico (qué % de la actividad se hace en esa hora en promedio) se aplica al 90% del planificado. El 10% restante queda pendiente como buffer para absorber picos de demanda, demoras o reprocesos, repartido también según el patrón horario.
          </p>
        </>
      )}
    </div>
  )
}
