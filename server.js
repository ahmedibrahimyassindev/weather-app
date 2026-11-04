const path = require('node:path');
const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3000;
const forecastUrl = 'https://api.open-meteo.com/v1/forecast';
const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'weather-dashboard', provider: 'Open-Meteo' });
});

async function fetchJson(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  } catch {
    const error = new Error('Could not reach the weather service. Please try again.');
    error.status = 502;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const error = new Error(data.reason || 'Weather data is temporarily unavailable.');
    error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }
  return data;
}

function weatherInfo(code, isDay = true) {
  if (code === 0) return { description: 'clear sky', icon: isDay ? '☀️' : '🌙' };
  if (code === 1) return { description: 'mainly clear', icon: isDay ? '🌤️' : '🌙' };
  if (code === 2) return { description: 'partly cloudy', icon: '⛅' };
  if (code === 3) return { description: 'overcast', icon: '☁️' };
  if ([45, 48].includes(code)) return { description: 'fog', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { description: 'drizzle', icon: '🌦️' };
  if ([61, 63, 65, 66, 67].includes(code)) return { description: 'rain', icon: '🌧️' };
  if ([71, 73, 75, 77].includes(code)) return { description: 'snow', icon: '❄️' };
  if ([80, 81, 82].includes(code)) return { description: 'rain showers', icon: '🌧️' };
  if ([85, 86].includes(code)) return { description: 'snow showers', icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { description: 'thunderstorm', icon: '⛈️' };
  return { description: 'variable conditions', icon: '🌥️' };
}

function toUnix(value) {
  return typeof value === 'number' ? value : Math.floor(new Date(value).getTime() / 1000);
}

function transformForecast(data, location = {}) {
  const currentData = data.current || {};
  const hourlyData = data.hourly || {};
  const dailyData = data.daily || {};
  const isDay = currentData.is_day !== 0;
  const currentWeather = weatherInfo(currentData.weather_code, isDay);
  const current = {
    dt: toUnix(currentData.time),
    temp: currentData.temperature_2m,
    feels_like: currentData.apparent_temperature,
    humidity: currentData.relative_humidity_2m,
    wind_speed: currentData.wind_speed_10m,
    uvi: currentData.uv_index,
    weather: [currentWeather],
  };

  const hourly = (hourlyData.time || []).map((time, index) => {
    const info = weatherInfo(hourlyData.weather_code?.[index], true);
    return {
      dt: toUnix(time),
      temp: hourlyData.temperature_2m?.[index],
      pop: (hourlyData.precipitation_probability?.[index] || 0) / 100,
      weather: [info],
    };
  }).filter((hour) => hour.dt >= current.dt).slice(0, 48);

  const daily = (dailyData.time || []).map((time, index) => ({
    dt: toUnix(time),
    temp: { min: dailyData.temperature_2m_min?.[index], max: dailyData.temperature_2m_max?.[index] },
    pop: (dailyData.precipitation_probability_max?.[index] || 0) / 100,
    weather: [weatherInfo(dailyData.weather_code?.[index], true)],
  }));

  return {
    ...location,
    lat: data.latitude,
    lon: data.longitude,
    timezone: data.timezone || 'UTC',
    current,
    hourly,
    daily,
  };
}

async function getForecast(lat, lon, units) {
  const data = await fetchJson(forecastUrl, {
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'ms',
    timezone: 'auto',
    forecast_days: 7,
    timeformat: 'unixtime',
  });
  return transformForecast(data);
}

app.get('/api/weather', async (req, res, next) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const units = req.query.units === 'imperial' ? 'imperial' : 'metric';
  if (!city || city.length > 100) {
    return res.status(400).json({ error: 'Provide a city name up to 100 characters.' });
  }

  try {
    const result = await fetchJson(geocodingUrl, { name: city, count: 1, language: 'en', format: 'json' });
    const place = result.results?.[0];
    if (!place) return res.status(404).json({ error: 'City not found. Check the spelling and try again.' });
    const location = { name: place.name, country: place.country, admin1: place.admin1 };
    res.json(await getForecast(place.latitude, place.longitude, units).then((forecast) => ({ ...forecast, ...location })));
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
    res.json(await getForecast(lat, lon, units));
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
