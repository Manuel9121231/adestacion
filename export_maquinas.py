import sqlite3
import json
import urllib.request
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'gestion.db')
API_URL = 'https://script.google.com/macros/s/AKfycbyxywW7pB-bcJbEvBxogykPNckoeGCNq_MYZvynmwgHTZW91LWhBYnMAacGqU8NZrGs/exec'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check what tables exist
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cur.fetchall()]
print(f"Tablas encontradas: {tables}")

# Try to get machines
maquinas = []
if 'maquinas' in tables:
    cur.execute("SELECT * FROM maquinas")
    maquinas = [dict(row) for row in cur.fetchall()]
    print(f"\nMaquinas encontradas: {len(maquinas)}")
    for m in maquinas:
        print(f"  - {m}")

# Try to get salas
salas = []
if 'salas' in tables:
    cur.execute("SELECT * FROM salas")
    salas = [dict(row) for row in cur.fetchall()]
    print(f"\nSalas encontradas: {len(salas)}")
    for s in salas:
        print(f"  - {s}")

conn.close()

print("\n--- Iniciando exportacion a Google Sheets ---")

# First export salas
for sala in salas:
    payload = {
        'action': 'manageSala',
        'method': 'POST',
        'payload': {
            'id': str(sala.get('id', '')),
            'nombre': sala.get('nombre', '')
        }
    }
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(API_URL, data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"Sala '{sala.get('nombre')}': {data}")
    except Exception as e:
        print(f"Error exportando sala: {e}")
    time.sleep(0.5)

# Then export maquinas
for m in maquinas:
    payload = {
        'action': 'manageMaquinas',
        'method': 'POST',
        'payload': {
            'sala_id': str(m.get('sala_id', '1')),
            'nombre': m.get('nombre', ''),
            'tipo': m.get('tipo', 'Impresora FDM'),
            'modelo': m.get('modelo', ''),
            'frecuencia_dias': m.get('frecuencia_dias', 7),
            'estado': m.get('estado', 'activa')
        }
    }
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(API_URL, data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            print(f"Maquina '{m.get('nombre')}': {data}")
    except Exception as e:
        print(f"Error exportando maquina '{m.get('nombre')}': {e}")
    time.sleep(0.5)

print("\n¡Exportacion completada!")
