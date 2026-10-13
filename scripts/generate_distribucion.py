"""
Calcula la distribución horaria histórica por actividad (peso por hora).
Esto permite repartir los bultos planificados siguiendo el patrón real de cada actividad.
- Solo consideramos horas con actividad histórica (excluye horas valle 22-05 para Act 3/4, etc.)
- Genera los pesos normalizados por hora para cada actividad
"""
import pandas as pd
import numpy as np
import json
import os

FILE = "/home/z/my-project/upload/h61.xlsx"
OUT_DIR = "/home/z/my-project/public/data"

HOUR_COLS = [f"HORA_{h:02d}" for h in range(24)]
PARK_SIZE = 90

print("Leyendo archivo...")
df = pd.read_excel(FILE, sheet_name="Datos", engine="openpyxl")
df["FECHA"] = pd.to_numeric(df["FECHA"], errors="coerce").astype("Int64")
df["ACTIVIDAD"] = df["ACTIVIDAD"].astype(str)

n_fechas = df["FECHA"].nunique()
print(f"Total registros: {len(df)}, fechas: {n_fechas}")

# ========================================
# 1) Distribución horaria por actividad
# ========================================
# Para cada actividad, sumar bultos por hora (promedio histórico)
# Luego normalizar para que sume 1.0 (peso por hora)

print("\n=== Distribución horaria por actividad ===")
distribucion = {}
for act in sorted(df["ACTIVIDAD"].unique()):
    sub = df[df["ACTIVIDAD"] == act]
    hourly_sum = sub[HOUR_COLS].sum()
    total = hourly_sum.sum()
    if total == 0:
        continue
    # Promedio por día (más representativo)
    hourly_avg = (hourly_sum / n_fechas).round(0).astype(int)
    # Peso por hora (proporción del total)
    pesos = (hourly_sum / total).round(4)

    # Para cada hora: cuántos bultos en promedio histórico, qué peso, y cuántos operarios únicos activos en promedio
    op_activos_por_hora = []
    for h_idx, h in enumerate(HOUR_COLS):
        # Promedio de operarios únicos con esa hora > 0 por fecha
        activos = []
        for fecha in df["FECHA"].dropna().unique():
            df_f = sub[sub["FECHA"] == fecha]
            if df_f.empty:
                continue
            activos.append(df_f[df_f[h] > 0]["OPERARIO"].nunique())
        op_activos_por_hora.append(round(np.mean(activos), 1) if activos else 0)

    distribucion[act] = {
        "hourly_bultos": [int(hourly_avg.iloc[i]) for i in range(24)],
        "pesos": [float(pesos.iloc[i]) for i in range(24)],
        "operarios_activos_promedio": op_activos_por_hora,
        "total_bultos": int(total),
        "horas_con_actividad": [i for i in range(24) if hourly_avg.iloc[i] > 0],
    }
    print(f"\nActividad {act}:")
    print(f"  Total bultos: {total}")
    print(f"  Horas con actividad: {distribucion[act]['horas_con_actividad']}")
    print(f"  Hora pico: {hourly_sum.idxmax()} con {hourly_sum.max()} bultos ({pesos.max()*100:.1f}%)")

# ========================================
# 2) Distribución por turno (agregado por hora del turno)
# ========================================
print("\n=== Distribución por turno ===")
TURNOS_HORAS = {
    "Noche": [23, 0, 1, 2, 3, 4, 5],
    "Mañana": [6, 7, 8, 9, 10, 11, 12, 13],
    "Tarde": [14, 15, 16, 17, 18, 19, 20, 21, 22],
}
distribucion_turnos = {}
for act in distribucion:
    dist_act = {"pesos": [], "bultos_total": 0}
    for turno, horas in TURNOS_HORAS.items():
        cols = [f"HORA_{h:02d}" for h in horas]
        sub = df[df["ACTIVIDAD"] == act]
        total_turno = sub[cols].sum().sum()
        total_act = sub[HOUR_COLS].sum().sum()
        peso = total_turno / total_act if total_act > 0 else 0
        dist_act["pesos"].append({
            "turno": turno,
            "horas": horas,
            "peso": round(peso, 4),
            "bultos_promedio_dia": round(total_turno / n_fechas, 0),
        })
        dist_act["bultos_total"] += int(total_turno)
    distribucion_turnos[act] = dist_act
    print(f"  Act {act}: " + ", ".join([f"{p['turno']} {p['peso']*100:.1f}%" for p in dist_act["pesos"]]))

# ========================================
# 3) Guardar
# ========================================
output = {
    "n_fechas": int(n_fechas),
    "parque_maquinas": PARK_SIZE,
    "distribucion_por_actividad": distribucion,
    "distribucion_por_turno": distribucion_turnos,
    "horas_labels": [f"{h:02d}:00" for h in range(24)],
    "turnos_horas": TURNOS_HORAS,
}

with open(f"{OUT_DIR}/distribucion_horaria.json", "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nGuardado: {OUT_DIR}/distribucion_horaria.json ({os.path.getsize(f'{OUT_DIR}/distribucion_horaria.json')} bytes)")
