"""
Genera datos agregados de productividad desde h61.xlsx y los guarda como JSON
para alimentar el dashboard. Procesa los 115,994 registros en bloques.
"""
import pandas as pd
import numpy as np
import json
import os

FILE = "/home/z/my-project/upload/h61.xlsx"
OUT_DIR = "/home/z/my-project/public/data"
os.makedirs(OUT_DIR, exist_ok=True)

HOUR_COLS = [f"HORA_{h:02d}" for h in range(24)]
PARK_SIZE = 90  # 90 maquinas

print("Leyendo archivo completo (puede tardar ~30s)...")
df = pd.read_excel(FILE, sheet_name="Datos", engine="openpyxl")
print(f"Total registros: {len(df)}")

# Limpieza
df["FECHA"] = pd.to_numeric(df["FECHA"], errors="coerce")
df["ACTIVIDAD"] = df["ACTIVIDAD"].astype(str)
df["TURNO_DESC"] = df["TURNO_DESC"].astype(str)
df["CIRCUITO"] = df["CIRCUITO"].astype(str)

# Mapeo de actividades (inferido de los datos)
ACTIVIDAD_MAP = {
    "2": "Preparacion (circuito AP/BE/PA)",
    "3": "Tiempo muerto / Setup",
    "4": "Expedicion / Otros circuitos",
}

# 1) Bultos por hora por actividad (para el mapa de calor)
print("\nGenerando mapa de calor: bultos por hora x actividad...")
heatmap_act = df.groupby("ACTIVIDAD")[HOUR_COLS].sum()
heatmap_act_dict = {}
for act in heatmap_act.index:
    heatmap_act_dict[act] = {
        "label": ACTIVIDAD_MAP.get(act, f"Actividad {act}"),
        "hourly": [int(heatmap_act.loc[act, h]) for h in HOUR_COLS],
        "total": int(heatmap_act.loc[act, HOUR_COLS].sum())
    }
with open(f"{OUT_DIR}/heatmap_actividad.json", "w") as f:
    json.dump(heatmap_act_dict, f, indent=2)

# 2) Bultos por hora por turno
print("Generando mapa de calor: bultos por hora x turno...")
heatmap_turno = df.groupby("TURNO_DESC")[HOUR_COLS].sum()
heatmap_turno_dict = {}
for t in heatmap_turno.index:
    heatmap_turno_dict[t] = {
        "hourly": [int(heatmap_turno.loc[t, h]) for h in HOUR_COLS],
        "total": int(heatmap_turno.loc[t, HOUR_COLS].sum())
    }
with open(f"{OUT_DIR}/heatmap_turno.json", "w") as f:
    json.dump(heatmap_turno_dict, f, indent=2)

# 3) Bultos por hora por circuito (mapa de calor 24h x circuito)
print("Generando mapa de calor: bultos por hora x circuito...")
heatmap_circ = df.groupby("CIRCUITO")[HOUR_COLS].sum()
heatmap_circ_dict = {}
for c in heatmap_circ.index:
    heatmap_circ_dict[c] = {
        "hourly": [int(heatmap_circ.loc[c, h]) for h in HOUR_COLS],
        "total": int(heatmap_circ.loc[c, HOUR_COLS].sum())
    }
with open(f"{OUT_DIR}/heatmap_circuito.json", "w") as f:
    json.dump(heatmap_circ_dict, f, indent=2)

# 4) Productividad por actividad: bultos/hora-activa por operario
print("Calculando productividad por actividad (bultos/hora activa por operario)...")
productividad = {}
for act in df["ACTIVIDAD"].unique():
    sub = df[df["ACTIVIDAD"] == act]
    # Productividad por operario: promedio de bultos por hora con actividad
    op_means = []
    for op in sub["OPERARIO"].dropna().unique():
        op_rows = sub[sub["OPERARIO"] == op]
        nonzero = op_rows[HOUR_COLS].replace(0, np.nan)
        if nonzero.stack().count() > 0:
            op_means.append(float(nonzero.stack().mean()))
    if op_means:
        productividad[act] = {
            "label": ACTIVIDAD_MAP.get(act, f"Actividad {act}"),
            "bultos_por_hora_media": round(float(np.mean(op_means)), 2),
            "bultos_por_hora_mediana": round(float(np.median(op_means)), 2),
            "bultos_por_hora_p25": round(float(np.percentile(op_means, 25)), 2),
            "bultos_por_hora_p75": round(float(np.percentile(op_means, 75)), 2),
            "bultos_por_hora_p95": round(float(np.percentile(op_means, 95)), 2),
            "bultos_por_hora_max": round(float(np.max(op_means)), 2),
            "operarios_unicos": int(sub["OPERARIO"].nunique()),
            "bultos_totales": int(sub["TOTAL"].sum()),
            "horas_activas_total": int(sub[HOUR_COLS].gt(0).sum().sum()),
        }
with open(f"{OUT_DIR}/productividad_actividad.json", "w") as f:
    json.dump(productividad, f, indent=2)

# 5) Distribución horaria por actividad (cuántos operarios activos por hora)
print("Calculando ocupacion por hora (operarios activos por hora por actividad)...")
ocupacion = {}
for act in df["ACTIVIDAD"].unique():
    sub = df[df["ACTIVIDAD"] == act]
    # Para cada hora, contar registros donde HORA_X > 0 (proxy de operarios activos en esa hora)
    ocupacion_hora = []
    for h in HOUR_COLS:
        n_activos = int((sub[h] > 0).sum())
        ocupacion_hora.append(n_activos)
    ocupacion[act] = {
        "label": ACTIVIDAD_MAP.get(act, f"Actividad {act}"),
        "operarios_activos_por_hora": ocupacion_hora,
        "max_operarios_activos": max(ocupacion_hora),
        "promedio_operarios_activos": round(float(np.mean(ocupacion_hora)), 2),
    }
with open(f"{OUT_DIR}/ocupacion_actividad.json", "w") as f:
    json.dump(ocupacion, f, indent=2)

# 6) Distribución por turno: horas de operación y productividad
print("Calculando distribucion por turno...")
turnos_info = {}
TURNOS_HORAS = {
    "Noche": list(range(23, 24)) + list(range(0, 6)),  # 23-05
    "Mañana": list(range(6, 14)),   # 06-13
    "Tarde": list(range(14, 23)),    # 14-22
}
for t in df["TURNO_DESC"].unique():
    sub = df[df["TURNO_DESC"] == t]
    horas = TURNOS_HORAS.get(t, list(range(24)))
    horas_cols_t = [f"HORA_{h:02d}" for h in horas]
    bultos_por_hora = [int(sub[h].sum()) for h in horas_cols_t]
    op_unicos = int(sub["OPERARIO"].nunique())
    bultos_total = int(sub["TOTAL"].sum())
    # Max operarios activos por hora en el turno
    op_activos_por_hora = [(sub[h] > 0).sum() for h in horas_cols_t]
    turnos_info[t] = {
        "horas": horas,
        "horas_labels": [f"{h:02d}:00" for h in horas],
        "bultos_por_hora": bultos_por_hora,
        "bultos_total": bultos_total,
        "operarios_unicos": op_unicos,
        "max_operarios_activos": int(max(op_activos_por_hora)) if op_activos_por_hora else 0,
        "promedio_operarios_activos": round(float(np.mean(op_activos_por_hora)), 2) if op_activos_por_hora else 0,
        "parque_max": PARK_SIZE,
    }
with open(f"{OUT_DIR}/turnos.json", "w") as f:
    json.dump(turnos_info, f, indent=2)

# 7) Desglose por circuito (para vista detallada)
print("Calculando desglose por circuito...")
circuito_info = {}
for c in df["CIRCUITO"].unique():
    sub = df[df["CIRCUITO"] == c]
    if sub.empty:
        continue
    act_principal = sub["ACTIVIDAD"].mode().iloc[0]
    horas_activas = int(sub[HOUR_COLS].gt(0).sum().sum())
    op_unicos = int(sub["OPERARIO"].nunique())
    circuito_info[c] = {
        "actividad_principal": str(act_principal),
        "actividad_label": ACTIVIDAD_MAP.get(str(act_principal), f"Act {act_principal}"),
        "bultos_total": int(sub["TOTAL"].sum()),
        "bultos_promedio_por_registro": round(float(sub["TOTAL"].mean()), 2),
        "bultos_mediana": round(float(sub["TOTAL"].median()), 2),
        "operarios_unicos": op_unicos,
        "horas_activas_registros": horas_activas,
        "registros": int(len(sub)),
    }
# Ordenar por bultos totales desc
circuito_info = dict(sorted(circuito_info.items(), key=lambda x: x[1]["bultos_total"], reverse=True))
with open(f"{OUT_DIR}/circuito_info.json", "w") as f:
    json.dump(circuito_info, f, indent=2)

# 8) Matriz de actividad por circuito (bultos)
print("Generando matriz actividad x circuito...")
matrix = pd.crosstab(df["CIRCUITO"], df["ACTIVIDAD"], values=df["TOTAL"], aggfunc="sum").fillna(0)
matrix_dict = {
    "circuitos": list(matrix.index),
    "actividades": list(matrix.columns),
    "labels_actividades": [ACTIVIDAD_MAP.get(a, f"Act {a}") for a in matrix.columns],
    "values": matrix.values.astype(int).tolist(),
}
with open(f"{OUT_DIR}/matriz_circ_act.json", "w") as f:
    json.dump(matrix_dict, f, indent=2)

# 9) Resumen general
print("Generando resumen general...")
resumen = {
    "total_registros": int(len(df)),
    "total_operarios_unicos": int(df["OPERARIO"].nunique()),
    "total_bultos": int(df["TOTAL"].sum()),
    "fecha_min": int(df["FECHA"].min()),
    "fecha_max": int(df["FECHA"].max()),
    "turnos": list(df["TURNO_DESC"].unique()),
    "actividades": [ACTIVIDAD_MAP.get(a, f"Actividad {a}") for a in df["ACTIVIDAD"].unique()],
    "circuitos": list(df["CIRCUITO"].unique()),
    "parque_maquinas": PARK_SIZE,
    "horas_por_turno": {k: v for k, v in TURNOS_HORAS.items()},
}
with open(f"{OUT_DIR}/resumen.json", "w") as f:
    json.dump(resumen, f, indent=2)

print(f"\nDatos guardados en {OUT_DIR}/")
print("Archivos generados:")
for f in sorted(os.listdir(OUT_DIR)):
    size = os.path.getsize(f"{OUT_DIR}/{f}")
    print(f"  - {f} ({size} bytes)")
