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
  productividad_por_persona?: {
    media: number
    mediana: number
    p25: number
    p75: number
    p95: number
  }
  horas: number[]
  horas_labels: string[]
  bultos_promedio_por_hora: number[]
  bultos_promedio_por_hora_activa?: number[]
  ocupacion_promedio_por_hora: number[]
  ocupacion_max_por_hora: number[]
  ocupacion_p95_por_hora?: number[]
  produccion_posible_por_hora: number[]
  produccion_efectiva_por_hora: number[]
  produccion_real_posible_por_hora?: number[]
  utilizacion_por_hora: number[]
  promedios_turno: Record<string, {
    horas: number[]
    fechas_con_datos: number
    bultos_por_hora: number
    bultos_total: number
    ocupacion_promedio: number
    ocupacion_maxima: number
    ocupacion_pct: number
    operarios_unicos_promedio?: number
    operarios_unicos_max?: number
    produccion_posible_hora: number
    produccion_posible_hora_real?: number
    utilizacion_pct: number
  }>
  por_dia_semana: Record<string, {
    bultos_total: number
    bultos_promedio_dia: number
    bultos_por_hora: number
    ocupacion_promedio?: number
    ocupacion_pct: number
    operarios_unicos_promedio_por_turno?: number
    operarios_unicos_max_por_turno?: number
    operarios_unicos_total_dia?: number
    ocupacion_pct_por_turno?: number
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
    produccion_real: data.produccion_real_posible_por_hora?.[i] || 0,
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

  // KPIs principales (calculados con operarios únicos)
  const bultosProm = data.bultos_promedio_por_hora.reduce((a, b) => a + b, 0) / 24
  const ocupacionProm = data.ocupacion_promedio_por_hora.reduce((a, b) => a + b, 0) / 24
  const utilizacionGlobal = (bultosProm / data.produccion_efectiva_por_hora[0]) * 100
  const ocupacionPctGlobal = (ocupacionProm / parque) * 100

  // Producción real posible promedio (con ocupación real del parque, no parque teórico de 90)
  const prodRealPosibleProm = data.produccion_real_posible_por_hora
    ? data.produccion_real_posible_por_hora.reduce((a, b) => a + b, 0) / 24
    : data.produccion_efectiva_por_hora[0]
  const utilVsReal = (bultosProm / prodRealPosibleProm) * 100

  const productividadPersona = data.productividad_por_persona

  return (
    <div className="space-y-6">
      {/* Banner de aclaración */}
      <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4 pb-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Conteo corregido:</strong> Cada operario usa <strong>una sola máquina por día</strong>, sin importar cuántos circuitos aparezca en el archivo (82% de los operarios trabaja en 3+ circuitos por día). Los promedios ahora cuentan <strong>operarios únicos</strong>, no registros.
        </CardContent>
      </Card>

      {/* KPIs principales del histórico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bultos promedio por hora</CardDescription>
            <CardTitle className="text-3xl">{Math.round(bultosProm).toLocaleString('es-AR')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sobre 24h · {data.n_fechas} días de histórico · Productividad ponderada: <strong>{data.productividad_ponderada.toFixed(2)} bultos/h-op</strong>
            {productividadPersona && (
              <div className="mt-1">Por persona: media {productividadPersona.media.toFixed(0)} · P50 {productividadPersona.mediana.toFixed(0)} · P95 {productividadPersona.p95.toFixed(0)} b/h-activa</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ocupación real del parque</CardDescription>
            <CardTitle className="text-3xl">{ocupacionProm.toFixed(1)} <span className="text-base text-muted-foreground">/ {parque}</span></CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <strong>{ocupacionPctGlobal.toFixed(1)}% del parque</strong> · Máx histórico: {Math.max(...data.ocupacion_max_por_hora)} máquinas (operarios únicos)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Producción efectiva posible por hora</CardDescription>
            <CardTitle className="text-3xl">{data.produccion_efectiva_por_hora[0].toLocaleString('es-AR')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Teórica: {parque} máquinas × {data.productividad_ponderada.toFixed(0)} b/h × {(data.factor_eficiencia * 100).toFixed(0)}% eficiencia
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Utilización real vs posible</CardDescription>
            <CardTitle className={`text-3xl ${utilVsReal > 100 ? 'text-emerald-600' : ''}`}>
              {utilVsReal.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {bultosProm.toFixed(0)} bultos/h reales vs {Math.round(prodRealPosibleProm).toLocaleString('es-AR')} b/h posibles con {ocupacionProm.toFixed(0)} operarios activos
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
                Bultos reales preparados por hora (promedio de {data.n_fechas} días) comparado con la producción efectiva posible (90 máquinas × productividad × 85% = {data.produccion_efectiva_por_hora[0].toLocaleString('es-AR')} b/h) y la producción posible con la ocupación real del parque.
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
                  <Line dataKey="produccion_real" name="Producción posible (ocupación real)" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                  <ReferenceLine
                    y={data.produccion_efectiva_por_hora[0]}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{ value: `Teórica parque completo: ${data.produccion_efectiva_por_hora[0]} b/h`, position: 'right', fill: '#ef4444', fontSize: 10 }}
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
                  <div className="text-muted-foreground">Operarios en hora pico</div>
                  <div className="font-bold">
                    {Math.max(...data.ocupacion_promedio_por_hora).toFixed(0)} / {parque} máquinas ({((Math.max(...data.ocupacion_promedio_por_hora) / parque) * 100).toFixed(0)}%)
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Horas con bultos ≥ 1000</div>
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
                Promedio de <strong>operarios únicos activos por hora</strong> (cada operario usa una máquina por día, sin importar cuántos circuitos aparezca). La línea roja marca el parque de {parque} máquinas. La barra muestra el promedio histórico y el valor máximo histórico observado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Operarios únicos', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="ocupacion_max" name="Máximo histórico" fill="#fbbf24" radius={[2, 2, 0, 0]} opacity={0.6} />
                  <Bar dataKey="ocupacion" name="Promedio histórico (operarios únicos)" fill="#10b981" radius={[2, 2, 0, 0]} />
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
                  <div className="text-muted-foreground">Pico de ocupación promedio</div>
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
                  <div className="text-muted-foreground">Máximo histórico (algún día)</div>
                  <div className="font-bold">
                    {Math.max(...data.ocupacion_max_por_hora)} máquinas
                  </div>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground">Ocupación mínima (con actividad)</div>
                  <div className="font-bold">
                    {Math.min(...data.ocupacion_promedio_por_hora.filter(v => v > 0)).toFixed(0)} máquinas
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
              <CardTitle>Promedios por turno (operarios únicos)</CardTitle>
              <CardDescription>
                Comparación de bultos por hora, operarios únicos activos y utilización real de capacidad por turno. Cada operario es una sola persona, sin importar cuántos circuitos aparezca en el archivo.
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
                      <TableHead className="text-right">Op. únicos prom.</TableHead>
                      <TableHead className="text-right">% Parque</TableHead>
                      <TableHead className="text-right">Op. máx</TableHead>
                      <TableHead className="text-right">Prod. real posible/h</TableHead>
                      <TableHead className="text-right">Util. real</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnos.map((t) => {
                      const tt = data.promedios_turno[t]
                      const opUnicos = tt.operarios_unicos_promedio || tt.ocupacion_promedio
                      const opMax = tt.operarios_unicos_max || tt.ocupacion_maxima
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
                          <TableCell className="text-right font-mono font-semibold text-emerald-600">{opUnicos.toFixed(1)}</TableCell>
                          <TableCell className={`text-right font-mono ${tt.ocupacion_pct > 100 ? 'text-amber-600 font-bold' : ''}`}>
                            {tt.ocupacion_pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{opMax}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {(tt.produccion_posible_hora_real || tt.produccion_posible_hora).toLocaleString('es-AR')}
                          </TableCell>
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
                <strong>Nota:</strong> Las cuentas ahora son correctas: cada operario se cuenta una sola vez por turno-día, sin importar cuántos circuitos aparezca en el archivo. Turno Mañana es el más cargado ({data.promedios_turno['Mañana']?.ocupacion_pct.toFixed(0)}% del parque) y turno Noche el más liviano ({data.promedios_turno['Noche']?.ocupacion_pct.toFixed(0)}%).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bultos por hora por turno</CardTitle>
              <CardDescription>Comparativa de bultos/hora reales vs producción efectiva posible (parque completo) por turno.</CardDescription>
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
              <CardTitle>Distribución por día de semana (operarios únicos por turno)</CardTitle>
              <CardDescription>
                Bultos promedio por día de semana y ocupación promedio del parque <strong>por turno</strong> (no por día entero, ya que un día tiene 3 turnos). Muestra patrones L-V vs fin de semana.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={diasOrdenados.map(d => ({
                  dia: d,
                  bultos_dia: data.por_dia_semana[d].bultos_promedio_dia,
                  op_por_turno: data.por_dia_semana[d].operarios_unicos_promedio_por_turno || data.por_dia_semana[d].ocupacion_promedio || 0,
                  parque_pct: data.por_dia_semana[d].ocupacion_pct_por_turno || data.por_dia_semana[d].ocupacion_pct,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Bultos/día', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, parque]} label={{ value: 'Op. por turno', angle: 90, position: 'insideRight', fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [value.toLocaleString('es-AR'), name]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bultos_dia" name="Bultos/día" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="op_por_turno" name="Op. únicos prom. por turno" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
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
                      <TableHead className="text-right">Op./turno prom</TableHead>
                      <TableHead className="text-right">Op. máx por turno</TableHead>
                      <TableHead className="text-right">% Parque por turno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diasOrdenados.map((d) => {
                      const dd = data.por_dia_semana[d]
                      const opProm = dd.operarios_unicos_promedio_por_turno || dd.ocupacion_promedio || 0
                      const opMax = dd.operarios_unicos_max_por_turno || 0
                      const pct = dd.ocupacion_pct_por_turno || dd.ocupacion_pct
                      return (
                        <TableRow key={d}>
                          <TableCell className="font-semibold">{d}</TableCell>
                          <TableCell className="text-right text-xs">{dd.fechas_con_datos}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_total.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_promedio_dia.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono">{dd.bultos_por_hora.toLocaleString('es-AR')}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600">{opProm.toFixed(1)} / {parque}</TableCell>
                          <TableCell className="text-right font-mono">{opMax}</TableCell>
                          <TableCell className={`text-right font-mono ${pct < 50 ? 'text-amber-600' : pct > 85 ? 'text-emerald-600' : ''}`}>
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>Patrón semanal:</strong> Lunes a viernes operan a {data.por_dia_semana['Lunes']?.ocupacion_pct_por_turno?.toFixed(0) || data.por_dia_semana['Lunes']?.ocupacion_pct.toFixed(0)}-{data.por_dia_semana['Viernes']?.ocupacion_pct_por_turno?.toFixed(0) || data.por_dia_semana['Viernes']?.ocupacion_pct.toFixed(0)}% del parque por turno. Sábado baja a {data.por_dia_semana['Sabado']?.ocupacion_pct_por_turno?.toFixed(0) || data.por_dia_semana['Sabado']?.ocupacion_pct.toFixed(0)}% y domingo a {data.por_dia_semana['Domingo']?.ocupacion_pct_por_turno?.toFixed(0) || data.por_dia_semana['Domingo']?.ocupacion_pct.toFixed(0)}% (operación mínima).
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
              <strong> Productividad ponderada por persona:</strong> {data.productividad_ponderada.toFixed(2)} bultos por hora-activa por operario.
              {productividadPersona && (
                <span> <strong>Por persona:</strong> media {productividadPersona.media.toFixed(0)}, P50 {productividadPersona.mediana.toFixed(0)}, P95 {productividadPersona.p95.toFixed(0)} b/h-activa.</span>
              )}
              <strong> Factor de eficiencia:</strong> {(data.factor_eficiencia * 100).toFixed(0)}%.
              <strong> Producción efectiva posible con parque completo:</strong> {data.produccion_efectiva_por_hora[0].toLocaleString('es-AR')} bultos/hora.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
