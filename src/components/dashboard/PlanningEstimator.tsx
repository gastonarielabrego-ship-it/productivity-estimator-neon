'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Trash2, Calendar, Loader2 } from 'lucide-react'

export interface PlanItem {
  id?: string
  fecha: string
  turno: string
  actividad: string
  actividadLabel: string
  circuito?: string
  bultosPlanificados: number
  prioridad: number
  notas?: string
}

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
}

const TURNOS = ['Noche', 'Mañana', 'Tarde']
const ACTIVIDADES = [
  { value: '2', label: 'Act 2 - Preparación' },
  { value: '3', label: 'Act 3 - Setup' },
  { value: '4', label: 'Act 4 - Expedición' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function PlanningEstimator({ parqueMaquinas, horasJornada, factorEficiencia, productividad }: Props) {
  const [planes, setPlanes] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(false)
  const [dbAvailable, setDbAvailable] = useState(true)
  const [form, setForm] = useState<PlanItem>({
    fecha: todayStr(),
    turno: 'Mañana',
    actividad: '2',
    actividadLabel: 'Act 2 - Preparación',
    bultosPlanificados: 1000,
    prioridad: 0,
  })

  // Cargar planes al iniciar
  useEffect(() => {
    loadPlanes()
  }, [])

  async function loadPlanes() {
    setLoading(true)
    try {
      const res = await fetch('/api/planificacion')
      if (!res.ok) throw new Error('No DB')
      const data = await res.json()
      setPlanes(data.items || [])
      setDbAvailable(true)
    } catch (err) {
      // Fallback a localStorage
      const stored = localStorage.getItem('planes_productividad')
      if (stored) setPlanes(JSON.parse(stored))
      setDbAvailable(false)
    } finally {
      setLoading(false)
    }
  }

  async function saveLocal(planes: PlanItem[]) {
    localStorage.setItem('planes_productividad', JSON.stringify(planes))
  }

  async function persistPlan(plan: PlanItem) {
    if (!dbAvailable) return null
    try {
      const res = await fetch('/api/planificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.item
    } catch (err) {
      return null
    }
  }

  async function deletePlan(id: string) {
    if (dbAvailable && id) {
      try {
        await fetch(`/api/planificacion?id=${id}`, { method: 'DELETE' })
      } catch (err) {
        // ignore
      }
    }
    const next = planes.filter((p) => p.id !== id)
    setPlanes(next)
    saveLocal(next)
  }

  async function handleAdd() {
    if (!form.bultosPlanificados || form.bultosPlanificados <= 0) return
    const actLabel = ACTIVIDADES.find((a) => a.value === form.actividad)?.label || form.actividad
    const newPlan: PlanItem = { ...form, actividadLabel: actLabel }
    const persisted = await persistPlan(newPlan)
    const withId = persisted ? { ...newPlan, id: persisted.id } : { ...newPlan, id: `local_${Date.now()}` }
    const next = [...planes, withId]
    setPlanes(next)
    saveLocal(next)
    // Reset form
    setForm({ ...form, bultosPlanificados: 1000 })
  }

  // Cálculos cruzados: por cada plan, calcular operarios/horas/parque
  const planesConEstimacion = planes.map((p) => {
    const prod = form.actividad === '2' ? productividad.productividadAct2
      : p.actividad === '3' ? productividad.productividadAct3
      : productividad.productividadAct4
    const prodKey = p.actividad === '2' ? productividad.productividadAct2
      : p.actividad === '3' ? productividad.productividadAct3
      : productividad.productividadAct4
    const capacidad = prodKey * factorEficiencia
    const operarios = capacidad > 0 ? p.bultosPlanificados / (capacidad * horasJornada) : 0
    const parquePct = (operarios / parqueMaquinas) * 100
    const horasRequeridas = capacidad > 0 ? p.bultosPlanificados / capacidad : 0
    return {
      ...p,
      productividad: prodKey,
      capacidad,
      operarios: Math.ceil(operarios),
      parquePct,
      horasRequeridas,
    }
  })

  // Totales
  const totalBultos = planes.reduce((s, p) => s + (p.bultosPlanificados || 0), 0)
  const totalOperarios = planesConEstimacion.reduce((s, p) => s + p.operarios, 0)
  const parqueTotalPct = (totalOperarios / parqueMaquinas) * 100

  // Horas totales: suma de horas por plan si se hace en paralelo con el parque total
  // Si se procesan en paralelo, el tiempo total es el mayor de los planes (estimación óptima)
  const horasOptimas = Math.max(...planesConEstimacion.map((p) => p.horasRequeridas), 0)
  // Si se procesan en serie, suma de horas
  const horasSerie = planesConEstimacion.reduce((s, p) => s + p.horasRequeridas, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimador de Planificación</CardTitle>
        <CardDescription>
          Cruce de la planificación de bultos con la productividad histórica para obtener estimaciones de horas, operarios y ocupación del parque.
          {!dbAvailable && (
            <Badge variant="outline" className="ml-2 text-amber-600">
              Modo local (sin DB Neon)
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form de alta de plan */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input
              type="text"
              placeholder="YYYYMMDD"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Turno</Label>
            <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Actividad</Label>
            <Select
              value={form.actividad}
              onValueChange={(v) => setForm({ ...form, actividad: v, actividadLabel: ACTIVIDADES.find(a => a.value === v)?.label || v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVIDADES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bultos</Label>
            <Input
              type="number"
              value={form.bultosPlanificados}
              onChange={(e) => setForm({ ...form, bultosPlanificados: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridad</Label>
            <Select value={String(form.prioridad)} onValueChange={(v) => setForm({ ...form, prioridad: parseInt(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Normal</SelectItem>
                <SelectItem value="1">Alta</SelectItem>
                <SelectItem value="2">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd}>
            + Agregar
          </Button>
        </div>

        <Separator />

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-muted/40 rounded-md p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Planes</div>
            <div className="text-xl font-bold">{planes.length}</div>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Total bultos</div>
            <div className="text-xl font-bold">{totalBultos.toLocaleString('es-AR')}</div>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Operarios totales</div>
            <div className="text-xl font-bold text-primary">{totalOperarios}</div>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="text-[10px] uppercase text-muted-foreground">% Parque</div>
            <div className={`text-xl font-bold ${parqueTotalPct > 100 ? 'text-red-600' : ''}`}>
              {parqueTotalPct.toFixed(1)}%
            </div>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Horas (paralelo)</div>
            <div className="text-xl font-bold">{horasOptimas.toFixed(1)}h</div>
          </div>
        </div>

        {/* Barra de ocupación total */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Ocupación total del parque ({totalOperarios} de {parqueMaquinas})</span>
            <span className={`font-mono ${parqueTotalPct > 100 ? 'text-red-600' : ''}`}>
              {parqueTotalPct.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(parqueTotalPct, 100)} className="h-3" />
          {parqueTotalPct > 100 && (
            <p className="text-xs text-red-600">
              ⚠ La planificación excede la capacidad del parque. Revisar prioridades o redistribuir entre turnos.
            </p>
          )}
        </div>

        {/* Lista de planes */}
        <div className="border rounded-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Cargando...
            </div>
          ) : planes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No hay planes cargados. Agregue uno arriba para ver el cruce con la productividad.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead className="w-20">Turno</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead className="text-right">Bultos</TableHead>
                    <TableHead className="text-right">Prod/h-op</TableHead>
                    <TableHead className="text-right">Operarios</TableHead>
                    <TableHead className="text-right">% Parque</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planesConEstimacion.map((p, i) => (
                    <TableRow key={p.id || i}>
                      <TableCell className="font-mono text-xs">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {p.fecha}
                      </TableCell>
                      <TableCell>{p.turno}</TableCell>
                      <TableCell>{p.actividadLabel}</TableCell>
                      <TableCell className="text-right font-mono">{p.bultosPlanificados.toLocaleString('es-AR')}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{p.productividad.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-bold">{p.operarios}</TableCell>
                      <TableCell className={`text-right font-mono ${p.parquePct > 100 ? 'text-red-600 font-bold' : ''}`}>
                        {p.parquePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">{p.horasRequeridas.toFixed(1)}h</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePlan(p.id || '')}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
