"""
Analize h61.xlsx: read sample data, unique values, and patterns to understand the productivity dataset.
"""
import pandas as pd
import json

FILE = "/home/z/my-project/upload/h61.xlsx"

print("=== Leyendo archivo (solo lectura, primeros 5000 registros) ===")
df = pd.read_excel(FILE, sheet_name="Datos", nrows=5000)
print(f"Shape: {df.shape}")
print(f"Columnas: {list(df.columns)}")
print()
print("=== Primeras 5 filas ===")
print(df.head().to_string())
print()

# Valores unicos de columnas categoricas
categoricals = ["FUNCION", "FUNCION_DESC", "TURNO", "TURNO_DESC", "TAREA", "ACTIVIDAD", "CIRCUITO"]
for c in categoricals:
    if c in df.columns:
        uniques = df[c].dropna().unique()
        print(f"--- {c} ({len(uniques)} unicos) ---")
        print(list(uniques)[:30])
        print()

# Estadisticas de columnas numericas
numeric_hours = [c for c in df.columns if c.startswith("HORA_")]
print(f"--- Columnas HORA_X: {numeric_hours}")
print()
print("--- Estadisticas TIEMPO_MUE ---")
print(df["TIEMPO_MUE"].describe())
print()
print("--- Estadisticas TOTAL ---")
print(df["TOTAL"].describe())
print()

# Sample ACTIVIDAD vs FUNCION_DESC vs TAREA
print("--- Cruce ACTIVIDAD / FUNCION_DESC ---")
print(df.groupby(["ACTIVIDAD", "FUNCION_DESC"]).size().head(30))
print()
print("--- Cruce TAREA / TURNO_DESC ---")
print(df.groupby(["TAREA", "TURNO_DESC"]).size().head(30))
