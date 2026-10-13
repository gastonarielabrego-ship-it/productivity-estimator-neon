"""
Genera datos del histórico con promedios horarios:
- Bultos promedio por hora (24h) - histórico
- Ocupación real de máquinas por hora (operarios activos promedio)
- Producción posible por hora (parque * productividad media)
- Utilización (% de capacidad usada)
- Bultos promedio por hora por turno
"""
import pandas as pd
import numpy as np
import json
import os

FILE = "/home/z/my-project/upload/h61.xlsx"
OUT_DIR = "/home/z/my-project/public/data"
os.makedirs(OUT_DIR, exist_ok=True)

HOUR_COLS = [f"HORA_{h:02d}" for h in range(24)]
PARK_SIZE = 90

print("Leyendo archivo completo...")
df = pd.read_excel(FILE, sheet_name="Datos", engine="openpyxl")
print(f"Total registros: {len(df)}")

# Convertir fecha a string
df["FECHA"] = pd.to_numeric(df["FECHA"], errors="coerce").astype(int)
df["ACTIVIDAD"] = df["ACTIVIDAD"].astype(str)
df["TURNO_DESC"] = df["TURNO_DESC"].astype(str)

# Fechas únicas
fechas_unicas = sorted(df["FECHA"].unique())
n_fechas = len(fechas_unicas)
print(f"Fechas unicas: {n_fechas} (de {fechas_unicas[0]} a {fechas_unicas[-1]})")

# 1) Promedio de bultos por hora (24h)
# Para cada hora, sumar bultos total / cantidad de dias en que hubo actividad en esa hora
print("\nCalculando bultos promedio por hora...")
bultos_por_hora_total = df[HOUR_COLS].sum()
bultos_promedio_por_hora = (bultos_por_hora_total / n_fechas).round(0).astype(int)

# Cantidad de dias con actividad por hora
dias_con_actividad_por_hora = (df[HOUR_COLS] > 0).groupby(df["FECHA"]).sum().sum()
bultos_promedio_por_hora_activa = (bultos_por_hora_total / np.maximum(dias_con_actividad_por_hora, 1)).round(0).astype(int)

print("Bultos promedio por hora (24h):", bultos_promedio_por_hora.tolist())

# 2) Ocupacion real de maquinas por hora
# Para cada hora, en cada fecha, contar registros con HORA_X > 0
# Promedio sobre fechas
print("\nCalculando ocupacion real de maquinas por hora...")
df_long = df[["FECHA"] + HOUR_COLS].copy()
# Para cada fecha y cada hora, cuantos registros tienen HORA_X > 0
ocupacion_por_fecha_hora = {}
for fecha in fechas_unicas:
    df_fecha = df[df["FECHA"] == fecha]
    if df_fecha.empty:
        continue
    ocupacion_por_fecha_hora[fecha] = [(df_fecha[h] > 0).sum() for h in HOUR_COLS]

# Promedio por hora (sobre fechas)
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

print("Ocupacion promedio por hora (24h):", ocupacion_promedio_por_hora)

# 3) Produccion posible por hora
# Capacidad teorica: parque (90) * productividad media ponderada
# Productividad media ponderada por actividad (basada en horas activas)
prod_act = {"2": 48.47, "3": 5.93, "4": 35.07}
horas_act_total = sum([
    df[df["ACTIVIDAD"] == "2"][HOUR_COLS].gt(0).sum().sum(),
    df[df["ACTIVIDAD"] == "3"][HOUR_COLS].gt(0).sum().sum(),
    df[df["ACTIVIDAD"] == "4"][HOUR_COLS].gt(0).sum().sum(),
])
total_bultos = df["TOTAL"].sum()
productividad_ponderada = total_bultos / horas_act_total if horas_act_total > 0 else 0
print(f"\nProductividad media ponderada: {productividad_ponderada:.2f} bultos/h-op")

# Produccion posible con 90 maquinas en cada hora
produccion_posible_por_hora = [PARK_SIZE * productividad_ponderada] * 24
# Con factor de eficiencia 85%
FACTOR_EF = 0.85
produccion_efectiva_por_hora = [PARK_SIZE * productividad_ponderada * FACTOR_EF] * 24

print(f"Produccion posible por hora: {produccion_posible_por_hora[0]:.0f} bultos/h")
print(f"Produccion efectiva por hora (85%): {produccion_efectiva_por_hora[0]:.0f} bultos/h")

# 4) Utilizacion por hora (% de capacidad usada)
utilizacion_por_hora = []
for h in range(24):
    real = bultos_promedio_por_hora.iloc[h] if hasattr(bultos_promedio_por_hora, 'iloc') else bultos_promedio_por_hora[h]
    posible = produccion_efectiva_por_hora[h]
    util = (real / posible * 100) if posible > 0 else 0
    utilizacion_por_hora.append(round(util, 1))

print("Utilizacion por hora (%):", utilizacion_por_hora)

# 5) Promedios por turno (bultos por hora, ocupacion de maquinas)
print("\nCalculando promedios por turno...")
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
    # Bultos promedio por hora (promedio de las horas activas del turno)
    horas_cols_t = [f"HORA_{h:02d}" for h in horas]
    bultos_hora_total = df_turno[horas_cols_t].sum().sum()
    n_horas = len(horas)
    fechas_turno = df_turno["FECHA"].nunique()
    bultos_por_hora = bultos_hora_total / (fechas_turno * n_horas)
    
    # Ocupacion promedio de maquinas por hora (en las horas del turno)
    ocupaciones = []
    for fecha in fechas_unicas:
        df_f = df_turno[df_turno["FECHA"] == fecha]
        if df_f.empty:
            continue
        for h in horas_cols_t:
            ocupaciones.append((df_f[h] > 0).sum())
    
    ocup_promedio = np.mean(ocupaciones) if ocupaciones else 0
    ocup_max = np.max(ocupaciones) if ocupaciones else 0
    ocup_pct = (ocup_promedio / PARK_SIZE) * 100
    
    promedios_turno[turno] = {
        "horas": horas,
        "fechas_con_datos": fechas_turno,
        "bultos_por_hora": round(bultos_por_hora, 0),
        "bultos_total": int(bultos_hora_total),
        "ocupacion_promedio": round(ocup_promedio, 1),
        "ocupacion_maxima": int(ocup_max),
        "ocupacion_pct": round(ocup_pct, 1),
        "produccion_posible_hora": round(PARK_SIZE * productividad_ponderada * FACTOR_EF, 0),
        "utilizacion_pct": round((bultos_por_hora / (PARK_SIZE * productividad_ponderada * FACTOR_EF)) * 100, 1) if (PARK_SIZE * productividad_ponderada * FACTOR_EF) > 0 else 0,
    }
    print(f"{turno}: bultos/h={promedios_turno[turno]['bultos_por_hora']:.0f}, ocup prom={promedios_turno[turno]['ocupacion_promedio']:.1f}/{PARK_SIZE} ({promedios_turno[turno]['ocupacion_pct']}%), util={promedios_turno[turno]['utilizacion_pct']}%")

# 6) Distribucion por dia de la semana (para ver patrones)
print("\nCalculando por dia de semana...")
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
    
    # Ocupacion promedio de maquinas en ese dia
    ocupaciones_d = []
    for fecha in df_d["FECHA"].unique():
        df_f = df_d[df_d["FECHA"] == fecha]
        for h in HOUR_COLS:
            ocupaciones_d.append((df_f[h] > 0).sum())
    ocup_prom_d = np.mean(ocupaciones_d) if ocupaciones_d else 0
    
    por_dia_semana[DIAS_ES[d]] = {
        "bultos_total": int(bultos_d),
        "bultos_promedio_dia": int(bultos_d / fechas_d),
        "bultos_por_hora": round(bultos_por_hora_d, 0),
        "ocupacion_promedio": round(ocup_prom_d, 1),
        "ocupacion_pct": round((ocup_prom_d / PARK_SIZE) * 100, 1),
        "fechas_con_datos": int(fechas_d),
    }
    print(f"  {DIAS_ES[d]}: bultos/dia={por_dia_semana[DIAS_ES[d]]['bultos_promedio_dia']}, ocup={por_dia_semana[DIAS_ES[d]]['ocupacion_promedio']}")

# Guardar todo en un unico archivo JSON consolidado
output = {
    "n_fechas": int(n_fechas),
    "fecha_min": int(fechas_unicas[0]),
    "fecha_max": int(fechas_unicas[-1]),
    "parque_maquinas": PARK_SIZE,
    "factor_eficiencia": FACTOR_EF,
    "productividad_ponderada": round(productividad_ponderada, 2),
    "horas": list(range(24)),
    "horas_labels": [f"{h:02d}:00" for h in range(24)],
    "bultos_promedio_por_hora": [int(bultos_promedio_por_hora.iloc[h] if hasattr(bultos_promedio_por_hora, 'iloc') else bultos_promedio_por_hora[h]) for h in range(24)],
    "bultos_promedio_por_hora_activa": [int(bultos_promedio_por_hora_activa.iloc[h] if hasattr(bultos_promedio_por_hora_activa, 'iloc') else bultos_promedio_por_hora_activa[h]) for h in range(24)],
    "ocupacion_promedio_por_hora": ocupacion_promedio_por_hora,
    "ocupacion_max_por_hora": ocupacion_max_por_hora,
    "ocupacion_min_por_hora": ocupacion_min_por_hora,
    "ocupacion_p25_por_hora": ocupacion_p25_por_hora,
    "ocupacion_p75_por_hora": ocupacion_p75_por_hora,
    "ocupacion_p95_por_hora": ocupacion_p95_por_hora,
    "produccion_posible_por_hora": [round(p, 0) for p in produccion_posible_por_hora],
    "produccion_efectiva_por_hora": [round(p, 0) for p in produccion_efectiva_por_hora],
    "utilizacion_por_hora": utilizacion_por_hora,
    "promedios_turno": promedios_turno,
    "por_dia_semana": por_dia_semana,
}

with open(f"{OUT_DIR}/historico_horario.json", "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nGuardado: {OUT_DIR}/historico_horario.json ({os.path.getsize(f'{OUT_DIR}/historico_horario.json')} bytes)")
print("\nResumen:")
print(f"  Total dias historicos: {n_fechas}")
print(f"  Productividad ponderada: {productividad_ponderada:.2f} bultos/h-op")
print(f"  Produccion posible (90 maq, 1h): {PARK_SIZE * productividad_ponderada:.0f} bultos")
print(f"  Produccion efectiva (90 maq, 1h, 85%): {PARK_SIZE * productividad_ponderada * FACTOR_EF:.0f} bultos")
print(f"  Ocupacion promedio (24h): {np.mean(ocupacion_promedio_por_hora):.1f} / {PARK_SIZE} maquinas")
