import express from 'express';

const app = express();
const PORT = 3000;

// User-Agent requerido por la política de uso de Nominatim
const UA = 'LabUCSM/1.0 (laboratorio academico)';

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

    res.json({
      direccion: data.display_name,
      ciudad: data.address?.city || data.address?.town,
      pais: data.address?.country,
    });
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

    res.json({
      distancia_km: (ruta.distance / 1000).toFixed(2),
      duracion_min: (ruta.duration / 60).toFixed(1),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});