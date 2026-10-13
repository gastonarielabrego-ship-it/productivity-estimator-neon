import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface PlanItem {
  id?: string
  fecha: string
  turno: string
  actividad: string
  actividadLabel: string
  circuito?: string | null
  bultosPlanificados: number
  prioridad: number
  notas?: string | null
}

export async function GET() {
  try {
    const items = await db.planificacion.findMany({
      orderBy: [
        { fecha: 'desc' },
        { turno: 'asc' },
      ],
      take: 500,
    })
    return NextResponse.json({ items })
  } catch (err) {
    // Si no hay DB, devolver vacío
    return NextResponse.json({ items: [], error: 'db_not_available', detail: String(err) }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: PlanItem = await req.json()
    if (!body.fecha || !body.turno || !body.actividad || !body.bultosPlanificados) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const created = await db.planificacion.create({
      data: {
        fecha: body.fecha,
        turno: body.turno,
        actividad: body.actividad,
        actividadLabel: body.actividadLabel || body.actividad,
        circuito: body.circuito || null,
        bultosPlanificados: body.bultosPlanificados,
        prioridad: body.prioridad || 0,
        notas: body.notas || null,
      },
    })
    return NextResponse.json({ item: created })
  } catch (err) {
    return NextResponse.json({ error: 'no_db', detail: String(err) }, { status: 200 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await db.planificacion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'no_db', detail: String(err) }, { status: 200 })
  }
}
