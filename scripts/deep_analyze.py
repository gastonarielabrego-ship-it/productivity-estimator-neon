"""
Deeper analysis: bultos per hour distribution, operator count, machines (circuitos), activities.
"""
import pandas as pd
import numpy as np

FILE = "/home/z/my-project/upload/h61.xlsx"
print("Leyendo muestra de 50,000 registros...")
df = pd.read_excel(FILE, sheet_name="Datos", nrows=50000)

print(f"\nTotal filas leidas: {len(df)}")
print(f"Operarios unicos: {df['OPERARIO'].nunique()}")
print(f"Fechas unicas: {sorted(df['FECHA'].unique())[:10]}")
print(f"Turnos unicos: {df['TURNO_DESC'].unique()}")
print(f"Actividades: {sorted(df['ACTIVIDAD'].unique())}")
print(f"Circuitos: {sorted(df['CIRCUITO'].unique())}")

# Bultos por hora - distribucion
hour_cols = [f"HORA_{h:02d}" for h in range(24)]
print("\n=== Distribucion de bultos por hora (suma total) ===")
hourly_sums = df[hour_cols].sum().sort_index()
print(hourly_sums.to_string())

# Bultos por actividad
print("\n=== Bultos por ACTIVIDAD ===")
print(df.groupby("ACTIVIDAD")["TOTAL"].agg(["count", "sum", "mean", "median", "max"]))

# Bultos por CIRCUITO
print("\n=== Bultos por CIRCUITO ===")
print(df.groupby("CIRCUITO")["TOTAL"].agg(["count", "sum", "mean", "median"]).sort_values("sum", ascending=False))

# Cruce: ACTIVIDAD x CIRCUITO
print("\n=== Cruce ACTIVIDAD x CIRCUITO (cantidad de registros) ===")
print(pd.crosstab(df["ACTIVIDAD"], df["CIRCUITO"]))

# Operarios por turno
print("\n=== Operarios unicos por turno ===")
print(df.groupby("TURNO_DESC")["OPERARIO"].nunique())

# Bultos por operario (top 20)
print("\n=== Top 20 operarios por bultos ===")
op_bultos = df.groupby(["OPERARIO", "NOMBRE"])["TOTAL"].sum().sort_values(ascending=False).head(20)
print(op_bultos)

# Bultos promedio por hora por actividad
print("\n=== Bultos promedio por HORA (cuando hay actividad) ===")
for act in sorted(df["ACTIVIDAD"].unique()):
    sub = df[df["ACTIVIDAD"] == act]
    nonzero = sub[hour_cols].replace(0, np.nan)
    print(f"\nActividad {act}:")
    print(f"  Bultos promedio por hora-activa: {nonzero.stack().mean():.2f}")
    print(f"  Bultos mediana por hora-activa: {nonzero.stack().median():.2f}")
    print(f"  Bultos max por hora-activa: {nonzero.stack().max():.0f}")

# Distribucion por turno de horas activas
print("\n=== Distribucion de horas con actividad por turno ===")
for turno in df["TURNO_DESC"].unique():
    sub = df[df["TURNO_DESC"] == turno]
    print(f"\nTurno {turno}:")
    sums = sub[hour_cols].sum()
    active_hours = sums[sums > 0]
    print(f"  Horas activas: {list(active_hours.index)}")
    print(f"  Pico: {active_hours.idxmax()} con {active_hours.max()} bultos")

# Calcular productividad por hora por operador
print("\n=== Productividad promedio (bultos por hora activa por operario) por ACTIVIDAD ===")
for act in sorted(df["ACTIVIDAD"].unique()):
    sub = df[df["ACTIVIDAD"] == act]
    # Para cada operario, promedio de bultos por hora activa
    op_means = []
    for op in sub["OPERARIO"].unique():
        op_rows = sub[sub["OPERARIO"] == op]
        nonzero = op_rows[hour_cols].replace(0, np.nan)
        if nonzero.stack().count() > 0:
            op_means.append(nonzero.stack().mean())
    if op_means:
        print(f"Actividad {act}: media={np.mean(op_means):.2f}, mediana={np.median(op_means):.2f}, min={np.min(op_means):.2f}, max={np.max(op_means):.2f}")
