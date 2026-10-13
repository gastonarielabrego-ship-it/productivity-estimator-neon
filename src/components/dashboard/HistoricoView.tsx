'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, Line, LineChart, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Cell } from 'recharts'

interface HistoricoHorario {
  n_fechas: number
  fecha_min: number
  fecha_max: number
  parque_maquinas: number
  factor_eficiencia: number
  productividad_ponderada: number
  horas: number[]
  horas_labels: string[]
  bultos_promedio_por_hora: number[]
  bultos_promedio_por_hora_activa: number[]
  ocupacion_promedio_por_hora: number[]
  ocupacion_max_por_hora: number[]
  ocupacion_p95_por_hora: number[]
  produccion_posible_por_hora: number[]
  produccion_efectiva_por_hora: number[]
  utilizacion_por_hora: number[]
  promedios_turno: Record<string, {
    horas: number[]
    fechas_con_datos: number
    bultos_por_hora: number
    bultos_total: number
    ocupacion_promedio: number
    ocupacion_maxima: number
    ocupacion_pct: number
    produccion_posible_hora: number
    utilizacion_pct: number
  }>
  por_dia_semana: Record<string, {
    bultos_total: number
    bultos_promedio_dia: number
    bultos_por_hora: number
    ocupacion_promedio: number
    ocupacion_pct: number
    fechas_con_datos: number
  }>
}

function formatFecha(yyyymmdd: number): string {
  const s = String(yyyymmdd)
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`
}

const TURNO_COLORS: Record<string, string> = {
  Noche: '#0ea5e9',     // sky-500
  Mañana: '#f59e0b',    // amber-500
  Tarde: '#8b5cf6',     // violet-500
}

// Mapeo hora -> turno
function horaATurno(h: number): string {
  if (h >= 23 || h < 6) return 'Noche'
  if (h >= 6 && h < 14) return 'Mañana'
  return 'Tarde'
}

export function HistoricoView({ data }: { data: HistoricoHorario }) {
  const parque = data.parque_maquinas

  // Datos combinados para el ComposedChart
  const chartData = data.horas.map((h, i) => ({
    hora: data.horas_labels[i],
    horaIdx: h,
    bultos: data.bultos_promedio_por_hora[i],
    posible: data.produccion_efectiva_por_hora[i],
    ocupacion: data.ocupacion_promedio_por_hora[i],
    ocupacion_max: data.ocupacion_max_por_hora[i],
    utilizacion: data.utilizacion_por_hora[i],
  }))

  // Datos por turno para tabla
  const turnos = Object.keys(data.promedios_turno)

  // Datos por día de semana
  const dias = Object.keys(data.por_dia_semana)
  const DIAS_ORDEN = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
  const diasOrdenados = DIAS_ORDEN.filter(d => dias.includes(d))

  // KPIs principales
  const bultosProm = data.bultos_promedio_por_hora.reduce((a, b) => a + b, 0) / 24
  const ocupacionProm = data.ocupacion_promedio_por_hora.reduce((a, b) => a + b, 0) / 24
  const bultosPorMaquina = bultosProm / parque
  const utilizacionGlobal = (bultosProm / data.produccion_efectiva_por_hora[0]) * 100
  const ocupacionPctGlobal = (ocupacionProm / parque) * 100

  return (
    <div className="space-y-6">
      {/* KPIs principales del histórico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bultos promedio por hora</CardDescription>
            <CardTitle className="text-3xl">{Math.round(bultosProm).toLocaleString('es-AR')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sobre 24h · {data.n_fechas} días de histórico · Productividad ponderada: {data.productividad_ponderada.toFixed(2)} bultos/h-op
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ocupación promedio del parque</CardDescription>
            <CardTitle className="text-3xl">{ocupacionProm.toFixed(1)} / {parque}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {ocupacionPctGlobal.toFixed(1)}% del parque · En horas pico hasta {Math.max(...data.ocupacion_promedio_por_hora).toFixed(0)} máquinas activas
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Producción efectiva posible por hora</CardDescription>
            <CardTitle className="text-3xl">{data.produccion_efectiva_por_hora[0].toLocaleString('es-AR')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {parque} máquinas × {data.productividad_ponderada.toFixed(1)} b/h × {(data.factor_eficiencia * 100).toFixed(0)}% eficiencia
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Utilización de capacidad</CardDescription>
            <CardTitle className={`text-3xl ${utilizacionGlobal > 100 ? 'text-emerald-600' : ''}`}>
              {utilizacionGlobal.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Histórico: {bultosProm.toFixed(0)} bultos/h reales vs {data.produccion_efectiva_por_hora[0]} bultos/h posibles
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bultos">
        <TabsList>
          <TabsTrigger value="bultos">Bultos por hora</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación de máquinas</TabsTrigger>
          <TabsTrigger value="turnos">Por turno</TabsTrigger>
          <TabsTrigger value="dias">Por día de semana</TabsTrigger>
        </TabsList>

        {/* Tab: Bultos por hora - reales vs producción posible */}
        <TabsContent value="bultos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bultos promedio por hora - Histórico</CardTitle>
              <CardDescription>
                Bultos reales preparados por hora (promedio de {data.n_fechas} días) vs producción efectiva posible (parque × productividad × 85%).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="bultos" name="Bultos reales (prom. histórico)" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <ReferenceLine
                    y={data.produccion_efectiva_por_hora[0]}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{ value: `Producción efectiva: ${data.produccion_efectiva_por_hora[0]} b/h`, position: 'right', fill: '#ef4444', fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={data.produccion_posible_por_hora[0]}
                    stroke="#dc2626"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    label={{ value: `Posible 100%: ${data.produccion_posible_por_hora[0]} b/h`, position: 'left', fill: '#dc2626', fontSize: 10 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Hora pico (máx bultos)</div>
                  <div className="font-bold">
                    {data.horas_labels[data.bultos_promedio_por_hora.indexOf(Math.max(...data.bultos_promedio_por_hora))]} ({Math.max(...data.bultos_promedio_por_hora).toLocaleString('es-AR')} b)
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Hora valle (mín bultos)</div>
                  <div className="font-bold">
                    {data.horas_labels[data.bultos_promedio_por_hora.indexOf(Math.min(...data.bultos_promedio_por_hora))]} ({Math.min(...data.bultos_promedio_por_hora).toLocaleString('es-AR')} b)
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Promedio horas activas</div>
                  <div className="font-bold">
                    {Math.round(data.bultos_promedio_por_hora_activa.filter((_, i) => data.bultos_promedio_por_hora[i] > 0).reduce((a, b, i) => {
                      const idx = data.bultos_promedio_por_hora_activa.findIndex((_, j) => j === i)
                      return a + (idx >= 0 ? data.bultos_promedio_por_hora_activa[idx] : 0)
                    }, 0) / Math.max(1, data.bultos_promedio_por_hora.filter(v => v > 0).length)).toLocaleString('es-AR')} b/h
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Horas con actividad ≥ 1000 bultos</div>
                  <div className="font-bold">
                    {data.bultos_promedio_por_hora.filter(v => v >= 1000).length} / 24 horas
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ocupación de máquinas por hora */}
        <TabsContent value="ocupacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ocupación de máquinas por hora - Histórico</CardTitle>
              <CardDescription>
                Promedio de máquinas activas por hora (operarios con bultos {'>'} 0). La línea roja marca el parque de {parque} máquinas. Cuando la barra supera la línea, hay más operarios que máquinas — sugiere solapamiento de turnos o múltiples tareas por operario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Máquinas activas', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="ocupacion_max" name="Máximo histórico" fill="#fbbf24" radius={[2, 2, 0, 0]} opacity={0.6} />
                  <Bar dataKey="ocupacion" name="Promedio histórico" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <ReferenceLine
                    y={parque}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{ value: `Parque ${parque} máquinas`, position: 'right', fill: '#ef4444', fontSize: 11 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Pico de ocupación</div>
                  <div className="font-bold text-amber-600">
                    {Math.max(...data.ocupacion_promedio_por_hora).toFixed(0)} máquinas en {data.horas_labels[data.ocupacion_promedio_por_hora.indexOf(Math.max(...data.ocupacion_promedio_por_hora))]}
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">% del parque en hora pico</div>
                  <div className="font-bold">
                    {((Math.max(...data.ocupacion_promedio_por_hora) / parque) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Ocupación mínima (con actividad)</div>
                  <div className="font-bold">
                    {Math.min(...data.ocupacion_promedio_por_hora.filter(v => v > 0)).toFixed(0)} máquinas
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Horas que superan el parque</div>
                  <div className="font-bold">
                    {data.ocupacion_promedio_por_hora.filter(v => v > parque).length} / 24 horas
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por turno */}
        <TabsContent value="turnos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Promedios por turno</CardTitle>
              <CardDescription>
                Comparación de bultos por hora, ocupación de máquinas y utilización de capacidad por turno.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Turno</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead className="text-right">Bultos/hora</TableHead>
                      <TableHead className="text-right">Bultos total</TableHead>
                      <TableHead className="text-right">Ocup. promedio</TableHead>
                      <TableHead className="text-right">% Parque</TableHead>
                      <TableHead className="text-right">Ocup. máx</TableHead>
                      <TableHead className="text-right">Prod. posible/h</TableHead>
                      <TableHead className="text-right">Utilización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnos.map((t) => {
                      const tt = data.promedios_turno[t]
                      return (
                        <TableRow key={t}>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TURNO_COLORS[t] || '#888' }} />
                              {t}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {tt.horas.length}h ({String(tt.horas[0]).padStart(2, '0')}-{String(tt.horas[tt.horas.length - 1]).padStart(2, '0')})
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{tt.bultos_por_hora.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{tt.bultos_total.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{tt.ocupacion_promedio.toFixed(1)} / {parque}</TableCell>
                          <TableCell className={`text-right font-mono ${tt.ocupacion_pct > 100 ? 'text-amber-600 font-bold' : ''}`}>
                            {tt.ocupacion_pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{tt.ocupacion_maxima}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{tt.produccion_posible_hora.toLocaleString('es-AR')}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${tt.utilizacion_pct > 100 ? 'text-emerald-600' : ''}`}>
                            {tt.utilizacion_pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>Nota:</strong> Cuando el % parque supera 100%, hay más operarios activos que máquinas (solapamiento de turnos o múltiples tareas). El turno Mañana tiene la mayor ocupación ({data.promedios_turno['Mañana']?.ocupacion_pct.toFixed(0)}%) y utilización ({data.promedios_turno['Mañana']?.utilizacion_pct.toFixed(0)}%).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bultos por hora por turno</CardTitle>
              <CardDescription>Comparativa de bultos/hora reales vs producción efectiva posible por turno.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={turnos.map(t => ({
                  turno: t,
                  bultos_h: data.promedios_turno[t].bultos_por_hora,
                  ocupacion: data.promedios_turno[t].ocupacion_promedio,
                  posible: data.produccion_efectiva_por_hora[0],
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="turno" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]} />
                  <Legend />
                  <Bar dataKey="bultos_h" name="Bultos/hora reales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <ReferenceLine y={data.produccion_efectiva_por_hora[0]} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" label={{ value: 'Producción efectiva', position: 'top', fill: '#ef4444', fontSize: 11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por día de semana */}
        <TabsContent value="dias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por día de semana</CardTitle>
              <CardDescription>
                Bultos promedio por día de semana y ocupación promedio del parque. Permite identificar patrones semanales (lunes a viernes vs fin de semana).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={diasOrdenados.map(d => ({
                  dia: d,
                  bultos_dia: data.por_dia_semana[d].bultos_promedio_dia,
                  ocupacion: data.por_dia_semana[d].ocupacion_promedio,
                  parque_pct: data.por_dia_semana[d].ocupacion_pct,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Bultos/día', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Ocup. máquinas', angle: 90, position: 'insideRight', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bultos_dia" name="Bultos/día" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="ocupacion" name="Ocupación promedio" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <ReferenceLine yAxisId="right" y={parque} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead className="text-right">Fechas</TableHead>
                      <TableHead className="text-right">Bultos total</TableHead>
                      <TableHead className="text-right">Bultos/día prom</TableHead>
                      <TableHead className="text-right">Bultos/hora</TableHead>
                      <TableHead className="text-right">Ocup. promedio</TableHead>
                      <TableHead className="text-right">% Parque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diasOrdenados.map((d) => {
                      const dd = data.por_dia_semana[d]
                      return (
                        <TableRow key={d}>
                          <TableCell className="font-semibold">{d}</TableCell>
                          <TableCell className="text-right text-xs">{dd.fechas_con_datos}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_total.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_promedio_dia.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_por_hora.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{dd.ocupacion_promedio.toFixed(1)} / {parque}</TableCell>
                          <TableCell className={`text-right font-mono ${dd.ocupacion_pct < 50 ? 'text-amber-600' : ''}`}>
                            {dd.ocupacion_pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>Patrón semanal:</strong> Lunes a viernes operan a {data.por_dia_semana['Lunes']?.ocupacion_pct.toFixed(0)}-{data.por_dia_semana['Viernes']?.ocupacion_pct.toFixed(0)}% del parque. Sábado baja a {data.por_dia_semana['Sabado']?.ocupacion_pct.toFixed(0)}% y domingo a {data.por_dia_semana['Domingo']?.ocupacion_pct.toFixed(0)}% (operación mínima).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Período histórico:</strong> {formatFecha(data.fecha_min)} a {formatFecha(data.fecha_max)} ({data.n_fechas} días).
              <strong> Productividad ponderada:</strong> {data.productividad_ponderada.toFixed(2)} bultos por hora-activa por operario.
              <strong> Factor de eficiencia:</strong> {(data.factor_eficiencia * 100).toFixed(0)}%.
              <strong> Producción efectiva posible:</strong> {data.produccion_efectiva_por_hora[0].toLocaleString('es-AR')} bultos/hora con parque de {parque} máquinas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
