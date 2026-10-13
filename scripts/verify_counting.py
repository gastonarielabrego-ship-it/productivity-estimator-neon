"""
Verifica la hipótesis: ¿cuántos operarios únicos hay por día vs cuántos registros?
Un operario aparece en múltiples filas (circuitos/actividades) pero usa 1 sola máquina por día.
"""
import pandas as pd

FILE = "/home/z/my-project/upload/h61.xlsx"
print("Leyendo...")
df = pd.read_excel(FILE, sheet_name="Datos", engine="openpyxl")
print(f"Total registros: {len(df)}")
print(f"Operarios únicos totales: {df['OPERARIO'].nunique()}")

# Por día: registros vs operarios únicos
print("\n=== Por FECHA: registros vs operarios únicos ===")
por_fecha = df.groupby("FECHA").agg(
    registros=("OPERARIO", "count"),
    operarios_unicos=("OPERARIO", "nunique"),
).reset_index()
por_fecha["ratio"] = (por_fecha["registros"] / por_fecha["operarios_unicos"]).round(2)
print(por_fecha.head(10).to_string())
print(f"\nPromedio registros/operarios-unicos: {por_fecha['ratio'].mean():.2f}")
print(f"Operarios únicos por día (promedio): {por_fecha['operarios_unicos'].mean():.1f}")
print(f"Operarios únicos por día (máx): {por_fecha['operarios_unicos'].max()}")
print(f"Operarios únicos por día (mín): {por_fecha['operarios_unicos'].min()}")

# Por fecha y turno
print("\n=== Por FECHA + TURNO ===")
por_ft = df.groupby(["FECHA", "TURNO_DESC"]).agg(
    registros=("OPERARIO", "count"),
    operarios_unicos=("OPERARIO", "nunique"),
).reset_index()
por_ft["ratio"] = (por_ft["registros"] / por_ft["operarios_unicos"]).round(2)
print(por_ft.head(15).to_string())
print(f"\nOperarios únicos por turno-día (promedio): {por_ft['operarios_unicos'].mean():.1f}")
print(f"Operarios únicos por turno-día (máx): {por_ft['operarios_unicos'].max()}")
print(f"Operarios únicos por turno-día (mín): {por_ft['operarios_unicos'].min()}")

# Por fecha y hora: cuántos operarios únicos vs cuántos registros
print("\n=== Validación hora por hora (un día de ejemplo) ===")
fecha_ejemplo = df["FECHA"].iloc[0]
df_fecha = df[df["FECHA"] == fecha_ejemplo]
print(f"Fecha: {fecha_ejemplo}, registros: {len(df_fecha)}, operarios únicos: {df_fecha['OPERARIO'].nunique()}")
HOUR_COLS = [f"HORA_{h:02d}" for h in range(24)]
for h in HOUR_COLS:
    activos_hora = df_fecha[df_fecha[h] > 0]
    n_registros = len(activos_hora)
    n_op_unicos = activos_hora["OPERARIO"].nunique()
    if n_registros > 0:
        print(f"  {h}: registros={n_registros}, operarios únicos={n_op_unicos}, ratio={n_registros/n_op_unicos:.2f}")

# ¿Cuántos operarios aparecen en más de un circuito por día?
print("\n=== Operarios en múltiples circuitos por día ===")
circ_por_op_dia = df.groupby(["FECHA", "OPERARIO"])["CIRCUITO"].nunique()
print(f"Operarios en 1 circuito por día: {(circ_por_op_dia == 1).sum()} ({(circ_por_op_dia == 1).sum()/len(circ_por_op_dia)*100:.1f}%)")
print(f"Operarios en 2 circuitos por día: {(circ_por_op_dia == 2).sum()} ({(circ_por_op_dia == 2).sum()/len(circ_por_op_dia)*100:.1f}%)")
print(f"Operarios en 3+ circuitos por día: {(circ_por_op_dia >= 3).sum()} ({(circ_por_op_dia >= 3).sum()/len(circ_por_op_dia)*100:.1f}%)")
print(f"Máx circuitos por operario por día: {circ_por_op_dia.max()}")

# ¿Cuántos en múltiples actividades por día?
print("\n=== Operarios en múltiples actividades por día ===")
act_por_op_dia = df.groupby(["FECHA", "OPERARIO"])["ACTIVIDAD"].nunique()
print(f"Operarios en 1 actividad por día: {(act_por_op_dia == 1).sum()} ({(act_por_op_dia == 1).sum()/len(act_por_op_dia)*100:.1f}%)")
print(f"Operarios en 2 actividades por día: {(act_por_op_dia == 2).sum()} ({(act_por_op_dia == 2).sum()/len(act_por_op_dia)*100:.1f}%)")
print(f"Operarios en 3 actividades por día: {(act_por_op_dia == 3).sum()} ({(act_por_op_dia == 3).sum()/len(act_por_op_dia)*100:.1f}%)")
