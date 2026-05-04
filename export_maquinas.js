const Database = require('better-sqlite3');
const path = require('path');

const API_URL = 'https://script.google.com/macros/s/AKfycbyxywW7pB-bcJbEvBxogykPNckoeGCNq_MYZvynmwgHTZW91LWhBYnMAacGqU8NZrGs/exec';

async function main() {
  const db = new Database(path.join(__dirname, 'database', 'gestion.db'));
  
  const maquinas = db.prepare('SELECT * FROM maquinas').all();
  console.log(`Encontradas ${maquinas.length} máquinas en la base de datos antigua.`);

  for (const m of maquinas) {
    const payload = {
      action: 'manageMaquinas',
      method: 'POST',
      payload: {
        sala_id: m.sala_id,
        nombre: m.nombre,
        tipo: m.tipo,
        modelo: m.modelo,
        frecuencia_dias: m.frecuencia_dias,
        estado: m.estado || 'activa'
      }
    };

    console.log(`Exportando: ${m.nombre}...`);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('Error exportando:', data);
      }
    } catch (e) {
      console.error('Error fetch:', e.message);
    }
    
    // Pequeño delay de 500ms para evitar Rate Limits de Google
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('¡Restauración de máquinas completada a Google Sheets!');
}

main().catch(console.error);
