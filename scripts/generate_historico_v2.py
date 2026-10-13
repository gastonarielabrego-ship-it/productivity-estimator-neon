"""
Recalculo del histórico contando OPERARIOS ÚNICOS por hora (no registros).
Cada operario usa UNA máquina por día, sin importar cuántos circuitos aparezca.
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
print(f"Total registros: {len(df)}")

# Limpiar
df["FECHA"] = pd.to_numeric(df["FECHA"], errors="coerce").astype("Int64")
df["ACTIVIDAD"] = df["ACTIVIDAD"].astype(str)
df["TURNO_DESC"] = df["TURNO_DESC"].astype(str)
df = df.dropna(subset=["OPERARIO"])
df["OPERARIO"] = df["OPERARIO"].astype(str)

fechas_unicas = sorted(df["FECHA"].dropna().unique())
n_fechas = len(fechas_unicas)
print(f"Fechas: {n_fechas}")

# ========================================
# 1) Bultos por hora (esto NO cambia, es suma total)
# ========================================
print("\n=== Bultos por hora (suma total) ===")
bultos_por_hora_total = df[HOUR_COLS].sum()
bultos_promedio_por_hora = (bultos_por_hora_total / n_fechas).round(0).astype(int)

# ========================================
# 2) Bultos por hora por OPERARIO ÚNICO (productividad real por persona)
# ========================================
print("\n=== Productividad por operario (bultos/hora-activa por persona) ===")
# Para cada operario en cada fecha, calcular bultos totales y horas activas
op_dia_stats = []
for (fecha, op), sub in df.groupby(["FECHA", "OPERARIO"]):
    bultos_total = sub[HOUR_COLS].sum().sum()
    # Horas activas: cuántas horas tienen al menos 1 registro con >0
    horas_activas = (sub[HOUR_COLS].sum() > 0).sum()
    op_dia_stats.append({
        "fecha": fecha,
        "operario": op,
        "bultos_total": int(bultos_total),
        "horas_activas": int(horas_activas),
        "productividad": float(bultos_total / horas_activas) if horas_activas > 0 else 0,
    })
op_dia_df = pd.DataFrame(op_dia_stats)
print(f"Op-día registros: {len(op_dia_df)}")
print(f"Bultos por hora-activa por persona (media): {op_dia_df['productividad'].mean():.2f}")
print(f"Bultos por hora-activa por persona (mediana): {op_dia_df['productividad'].median():.2f}")
print(f"Bultos por hora-activa por persona (P25): {op_dia_df['productividad'].quantile(0.25):.2f}")
print(f"Bultos por hora-activa por persona (P75): {op_dia_df['productividad'].quantile(0.75):.2f}")
print(f"Bultos por hora-activa por persona (P95): {op_dia_df['productividad'].quantile(0.95):.2f}")

productividad_ponderada_persona = op_dia_df["bultos_total"].sum() / op_dia_df["horas_activas"].sum()
print(f"Productividad ponderada (total bultos / total horas-activas): {productividad_ponderada_persona:.2f} bultos/h-op")

# ========================================
# 3) OCUPACIÓN REAL DEL PARQUE: operarios únicos por (fecha, hora)
# ========================================
print("\n=== Ocupación real: operarios únicos por hora ===")
# Para cada (fecha, hora): cuántos operarios únicos tienen HORA_X > 0
ocupacion_por_fecha_hora = {}
for fecha in fechas_unicas:
    df_f = df[df["FECHA"] == fecha]
    if df_f.empty:
        continue
    ocupacion_por_fecha_hora[fecha] = []
    for h in HOUR_COLS:
        # Operarios únicos activos en esta hora
        op_activos = df_f[df_f[h] > 0]["OPERARIO"].nunique()
        ocupacion_por_fecha_hora[fecha].append(op_activos)

# Estadísticas por hora
ocupacion_promedio_por_hora = []
ocupacion_max_por_hora = []
ocupacion_min_por_hora = []
ocupacion_p25_por_hora = []
ocupacion_p75_por_hora = []
ocupacion_p95_por_hora = []

for h_idx in range(24):
    valores = [ocupacion_por_fecha_hora[f][h_idx] for f in ocupacion_por_fecha_hora]
    if valores:
        ocupacion_promedio_por_hora.append(round(float(np.mean(valores)), 1))
        ocupacion_max_por_hora.append(int(np.max(valores)))
        ocupacion_min_por_hora.append(int(np.min(valores)))
        ocupacion_p25_por_hora.append(round(float(np.percentile(valores, 25)), 0))
        ocupacion_p75_por_hora.append(round(float(np.percentile(valores, 75)), 0))
        ocupacion_p95_por_hora.append(round(float(np.percentile(valores, 95)), 0))
    else:
        ocupacion_promedio_por_hora.append(0)
        ocupacion_max_por_hora.append(0)
        ocupacion_min_por_hora.append(0)
        ocupacion_p25_por_hora.append(0)
        ocupacion_p75_por_hora.append(0)
        ocupacion_p95_por_hora.append(0)

print("Ocupación promedio por hora (operarios únicos):", ocupacion_promedio_por_hora)
print(f"\nMáx histórico: {max(ocupacion_max_por_hora)} máquinas (en alguna hora de algún día)")
print(f"Promedio global: {np.mean(ocupacion_promedio_por_hora):.1f} máquinas")
print(f"% parque promedio: {(np.mean(ocupacion_promedio_por_hora)/PARK_SIZE)*100:.1f}%")

# ========================================
# 4) Producción posible por hora (con productividad corregida)
# ========================================
FACTOR_EF = 0.85
produccion_posible_por_hora = [PARK_SIZE * productividad_ponderada_persona] * 24
produccion_efectiva_por_hora = [PARK_SIZE * productividad_ponderada_persona * FACTOR_EF] * 24

# Producción REAL posible (con ocupación real del parque, no parque teórico)
# = (operarios activos por hora) * productividad_ponderada_persona
produccion_real_posible_por_hora = [round(ocupacion_promedio_por_hora[i] * productividad_ponderada_persona, 0) for i in range(24)]

# Utilización real: bultos producidos / producción posible con ocupación real
utilizacion_por_hora = []
for h in range(24):
    real = bultos_promedio_por_hora.iloc[h] if hasattr(bultos_promedio_por_hora, 'iloc') else bultos_promedio_por_hora[h]
    posible_real = produccion_real_posible_por_hora[h]
    util = (real / posible_real * 100) if posible_real > 0 else 0
    utilizacion_por_hora.append(round(util, 1))

print("\nUtilización por hora (vs producción real posible):", utilizacion_por_hora)

# ========================================
# 5) Por turno con operarios únicos
# ========================================
print("\n=== Por turno (operarios únicos) ===")
TURNOS_HORAS = {
    "Noche": [23, 0, 1, 2, 3, 4, 5],
    "Mañana": [6, 7, 8, 9, 10, 11, 12, 13],
    "Tarde": [14, 15, 16, 17, 18, 19, 20, 21, 22],
}

promedios_turno = {}
for turno, horas in TURNOS_HORAS.items():
    df_turno = df[df["TURNO_DESC"] == turno]
    if df_turno.empty:
        continue

    # Operarios únicos por turno-día
    op_por_turno_dia = df_turno.groupby("FECHA")["OPERARIO"].nunique()
    op_promedio = op_por_turno_dia.mean()
    op_max = op_por_turno_dia.max()

    # Bultos por hora del turno
    horas_cols_t = [f"HORA_{h:02d}" for h in horas]
    bultos_hora_total = df_turno[horas_cols_t].sum().sum()
    fechas_turno = df_turno["FECHA"].nunique()
    bultos_por_hora = bultos_hora_total / (fechas_turno * len(horas))

    # Ocupación promedio del parque en horas del turno (operarios únicos por hora)
    ocupaciones = []
    for fecha in fechas_unicas:
        df_f = df_turno[df_turno["FECHA"] == fecha]
        if df_f.empty:
            continue
        for h in horas_cols_t:
            ocupaciones.append(df_f[df_f[h] > 0]["OPERARIO"].nunique())
    ocup_promedio = np.mean(ocupaciones) if ocupaciones else 0
    ocup_max = np.max(ocupaciones) if ocupaciones else 0

    # Producción posible efectiva con ocupación promedio
    prod_posible = ocup_promedio * productividad_ponderada_persona * FACTOR_EF
    util = (bultos_por_hora / prod_posible * 100) if prod_posible > 0 else 0

    promedios_turno[turno] = {
        "horas": horas,
        "fechas_con_datos": int(fechas_turno),
        "bultos_por_hora": round(bultos_por_hora, 0),
        "bultos_total": int(bultos_hora_total),
        "operarios_unicos_promedio": round(op_promedio, 1),
        "operarios_unicos_max": int(op_max),
        "ocupacion_promedio": round(ocup_promedio, 1),
        "ocupacion_maxima": int(ocup_max),
        "ocupacion_pct": round((ocup_promedio / PARK_SIZE) * 100, 1),
        "produccion_posible_hora_teorica": round(PARK_SIZE * productividad_ponderada_persona * FACTOR_EF, 0),
        "produccion_posible_hora_real": round(prod_posible, 0),
        "utilizacion_pct": round(util, 1),
    }
    print(f"  {turno}: op-únicos prom={op_promedio:.1f}/{PARK_SIZE} ({promedios_turno[turno]['ocupacion_pct']}%), bultos/h={bultos_por_hora:.0f}, util={util:.1f}%")

# ========================================
# 6) Por día de semana
# ========================================
def to_date(yyyymmdd):
    s = str(int(yyyymmdd))
    return pd.Timestamp(year=int(s[:4]), month=int(s[4:6]), day=int(s[6:8]))

df["FECHA_DT"] = df["FECHA"].apply(to_date)
df["DIA_SEMANA"] = df["FECHA_DT"].dt.day_name()
DIAS_ORDEN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DIAS_ES = {"Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miercoles", "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sabado", "Sunday": "Domingo"}

por_dia_semana = {}
for d in DIAS_ORDEN:
    df_d = df[df["DIA_SEMANA"] == d]
    if df_d.empty:
        continue
    fechas_d = df_d["FECHA"].nunique()
    bultos_d = df_d["TOTAL"].sum()
    bultos_por_hora_d = bultos_d / (fechas_d * 24)

    # Operarios únicos por (fecha, turno) -这才是 el "ocupacion del parque"
    op_por_turno_dia = df_d.groupby(["FECHA", "TURNO_DESC"])["OPERARIO"].nunique()
    op_prom_por_turno = op_por_turno_dia.mean()
    op_max_por_turno = op_por_turno_dia.max()
    op_min_por_turno = op_por_turno_dia.min()

    # También operarios únicos por día (para info)
    op_unicos_dia = df_d.groupby("FECHA")["OPERARIO"].nunique()
    op_total_dia = op_unicos_dia.mean()

    por_dia_semana[DIAS_ES[d]] = {
        "bultos_total": int(bultos_d),
        "bultos_promedio_dia": int(bultos_d / fechas_d),
        "bultos_por_hora": round(bultos_por_hora_d, 0),
        "operarios_unicos_promedio_por_turno": round(op_prom_por_turno, 1),
        "operarios_unicos_max_por_turno": int(op_max_por_turno),
        "operarios_unicos_total_dia": round(op_total_dia, 1),
        "ocupacion_pct_por_turno": round((op_prom_por_turno / PARK_SIZE) * 100, 1),
        "fechas_con_datos": int(fechas_d),
    }
    print(f"  {DIAS_ES[d]}: op-únicos/turno prom={op_prom_por_turno:.1f}/{PARK_SIZE} ({por_dia_semana[DIAS_ES[d]]['ocupacion_pct_por_turno']}%), total/día={op_total_dia:.0f}, bultos/día={bultos_d/fechas_d:.0f}")

# ========================================
# Guardar JSON consolidado
# ========================================
output = {
    "n_fechas": int(n_fechas),
    "fecha_min": int(fechas_unicas[0]),
    "fecha_max": int(fechas_unicas[-1]),
    "parque_maquinas": PARK_SIZE,
    "factor_eficiencia": FACTOR_EF,
    "productividad_ponderada": round(productividad_ponderada_persona, 2),
    "productividad_por_persona": {
        "media": round(op_dia_df["productividad"].mean(), 2),
        "mediana": round(op_dia_df["productividad"].median(), 2),
        "p25": round(op_dia_df["productividad"].quantile(0.25), 2),
        "p75": round(op_dia_df["productividad"].quantile(0.75), 2),
        "p95": round(op_dia_df["productividad"].quantile(0.95), 2),
    },
    "horas": list(range(24)),
    "horas_labels": [f"{h:02d}:00" for h in range(24)],
    "bultos_promedio_por_hora": [int(bultos_promedio_por_hora.iloc[h] if hasattr(bultos_promedio_por_hora, 'iloc') else bultos_promedio_por_hora[h]) for h in range(24)],
    "ocupacion_promedio_por_hora": ocupacion_promedio_por_hora,
    "ocupacion_max_por_hora": ocupacion_max_por_hora,
    "ocupacion_min_por_hora": ocupacion_min_por_hora,
    "ocupacion_p25_por_hora": ocupacion_p25_por_hora,
    "ocupacion_p75_por_hora": ocupacion_p75_por_hora,
    "ocupacion_p95_por_hora": ocupacion_p95_por_hora,
    "produccion_posible_por_hora": [round(p, 0) for p in produccion_posible_por_hora],
    "produccion_efectiva_por_hora": [round(p, 0) for p in produccion_efectiva_por_hora],
    "produccion_real_posible_por_hora": produccion_real_posible_por_hora,
    "utilizacion_por_hora": utilizacion_por_hora,
    "promedios_turno": promedios_turno,
    "por_dia_semana": por_dia_semana,
}

with open(f"{OUT_DIR}/historico_horario.json", "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nGuardado: {OUT_DIR}/historico_horario.json")
print(f"\n=== RESUMEN CORREGIDO ===")
print(f"Productividad ponderada (persona): {productividad_ponderada_persona:.2f} bultos/h-op")
print(f"Ocupación promedio: {np.mean(ocupacion_promedio_por_hora):.1f} / {PARK_SIZE} = {(np.mean(ocupacion_promedio_por_hora)/PARK_SIZE)*100:.1f}%")
print(f"Ocupación máx: {max(ocupacion_max_por_hora)} máquinas")
print(f"Producción posible teórica (90 máq): {PARK_SIZE * productividad_ponderada_persona:.0f} b/h")
print(f"Producción efectiva (90 máq, 85%): {PARK_SIZE * productividad_ponderada_persona * FACTOR_EF:.0f} b/h")
