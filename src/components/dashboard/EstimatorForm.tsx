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

export interface ProductividadValues {
  productividadAct2: number
  productividadAct3: number
  productividadAct4: number
}

interface Props {
  parqueMaquinas: number
  horasJornada: number
  factorEficiencia: number
  productividad: ProductividadValues
  onSaveConfig?: (cfg: { parqueMaquinas: number; horasJornada: number; factorEficiencia: number; productividad: ProductividadValues }) => void
}

export function EstimatorForm({ parqueMaquinas, horasJornada, factorEficiencia, productividad, onSaveConfig }: Props) {
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
    }
  }, [bultosAct2, bultosAct3, bultosAct4, horasDisponibles, editParque, editJornada, editEficiencia, editProd2, editProd3, editProd4])

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
