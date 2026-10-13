import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')

async function readJson(file: string) {
  const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
  return JSON.parse(content)
}

export async function GET() {
  try {
    const [
      resumen,
      turnos,
      heatmap_actividad,
      heatmap_circuito,
      productividad_actividad,
      ocupacion_actividad,
      circuito_info,
      matriz_circ_act,
    ] = await Promise.all([
      readJson('resumen.json'),
      readJson('turnos.json'),
      readJson('heatmap_actividad.json'),
      readJson('heatmap_circuito.json'),
      readJson('productividad_actividad.json'),
      readJson('ocupacion_actividad.json'),
      readJson('circuito_info.json'),
      readJson('matriz_circ_act.json'),
    ])

    const config = {
      parqueMaquinas: 90,
      horasJornada: 8.0,
      factorEficiencia: 0.85,
      productividad: {
        productividadAct2: productividad_actividad['2']?.bultos_por_hora_media ?? 48.47,
        productividadAct3: productividad_actividad['3']?.bultos_por_hora_media ?? 5.93,
        productividadAct4: productividad_actividad['4']?.bultos_por_hora_media ?? 35.07,
      },
    }

    return NextResponse.json({
      resumen,
      turnos,
      heatmap_actividad,
      heatmap_circuito,
      productividad_actividad,
      ocupacion_actividad,
      circuito_info,
      matriz_circ_act,
      config,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'No se pudieron cargar los datos', detail: String(err) },
      { status: 500 }
    )
  }
}
