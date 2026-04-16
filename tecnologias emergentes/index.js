import express from 'express';
import { promises as fs } from 'fs';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// User-Agent requerido por la política de uso de Nominatim
const UA = process.env.UA || 'LabUCSM/1.0 (laboratorio academico)';

app.use(express.json());
app.use(express.static('public'));

// Helper fetch con User-Agent
const osmFetch = url =>
  fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());

// Endpoint 1: Geocodificación Inversa (Nominatim)
app.get('/api/geocode', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Se requieren lat y lon' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const data = await osmFetch(url);

    const result = {
      direccion: data.display_name,
      ciudad: data.address?.city || data.address?.town,
      pais: data.address?.country,
    };

    // Guardar en historial
    await fs.appendFile('history.json', JSON.stringify({ type: 'geocode', lat, lon, result, timestamp: new Date().toISOString() }) + '\n');

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint 2: Ruta entre dos puntos (OSRM)
app.get('/api/ruta', async (req, res) => {
  const { oLat, oLon, dLat, dLon } = req.query;

  if (!oLat || !oLon || !dLat || !dLon) {
    return res.status(400).json({ error: 'Se requieren coordenadas de origen y destino' });
  }

  try {
    // OSRM usa el orden lon, lat (longitud primero)
    const url = `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=false`;
    const data = await osmFetch(url);

    if (data.code !== 'Ok') {
      return res.status(502).json({ error: data.code });
    }

    const ruta = data.routes[0];

    const result = {
      distancia_km: (ruta.distance / 1000).toFixed(2),
      duracion_min: (ruta.duration / 60).toFixed(1),
    };

    // Guardar en historial
    await fs.appendFile('history.json', JSON.stringify({ type: 'ruta', oLat, oLon, dLat, dLon, result, timestamp: new Date().toISOString() }) + '\n');

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint 3: Historial de búsquedas
app.get('/api/history', async (req, res) => {
  try {
    const data = await fs.readFile('history.json', 'utf8');
    const lines = data.trim().split('\n').filter(l => l);
    const history = lines.map(l => JSON.parse(l));
    res.json(history);
  } catch (e) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});