const path = require('node:path');
const express = require('express');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const apiKey = process.env.OPENWEATHER_API_KEY;
const apiBase = 'https://api.openweathermap.org';

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'weather-dashboard' });
});

async function openWeather(pathname, params) {
  if (!apiKey) {
    const error = new Error('Weather service is not configured. Add OPENWEATHER_API_KEY to your .env file.');
    error.status = 503;
    throw error;
  }

  const url = new URL(pathname, apiBase);
  for (const [key, value] of Object.entries({ ...params, appid: apiKey })) {
    url.searchParams.set(key, value);
  }

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    const error = new Error('Could not reach the weather service. Please try again.');
    error.status = 502;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status === 404 ? 404 : response.status === 401 ? 502 : 502;
    const message = response.status === 404
      ? 'City not found. Check the spelling and try again.'
      : response.status === 401
        ? 'The weather service rejected the API key. Check your OpenWeather configuration.'
        : 'Weather data is temporarily unavailable.';
    const error = new Error(message);
    error.status = status;
    throw error;
  }
  return data;
}

async function getForecast(lat, lon, units) {
  // One Call 3.0 returns current conditions, hourly data, and an 8-day daily forecast.
  return openWeather('/data/3.0/onecall', {
    lat: String(lat), lon: String(lon), units,
    exclude: 'minutely,alerts',
  });
}

app.get('/api/weather', async (req, res, next) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const units = req.query.units === 'imperial' ? 'imperial' : 'metric';
  if (!city || city.length > 100) {
    return res.status(400).json({ error: 'Provide a city name up to 100 characters.' });
  }

  try {
    const locations = await openWeather('/geo/1.0/direct', { q: city, limit: '1' });
    if (!locations.length) return res.status(404).json({ error: 'City not found. Check the spelling and try again.' });
    const location = locations[0];
    const forecast = await getForecast(location.lat, location.lon, units);
    res.json({ name: location.name, country: location.country, lat: location.lat, lon: location.lon, ...forecast });
  } catch (error) {
    next(error);
  }
});

app.get('/api/weather/coordinates', async (req, res, next) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const units = req.query.units === 'imperial' ? 'imperial' : 'metric';
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Provide valid latitude and longitude coordinates.' });
  }

  try {
    const forecast = await getForecast(lat, lon, units);
    res.json({ lat, lon, ...forecast });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  res.status(error.status || 500).json({ error: error.status ? error.message : 'An unexpected server error occurred.' });
});

app.listen(port, () => {
  console.log(`Weather Dashboard server listening on http://localhost:${port}`);
});
