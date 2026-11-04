const $ = (selector) => document.querySelector(selector);
const form = $('#search-form');
const input = $('#city-input');
const statusText = $('#status');
const weatherPanel = $('#weather');
const unitButton = $('#unit-toggle');
let units = 'metric';
let latestQuery = null;
let latestData = null;

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
  statusText.classList.remove('hidden');
}

async function loadWeather(query, label) {
  latestQuery = query;
  weatherPanel.classList.add('hidden');
  setStatus(`Loading weather for ${label}…`);
  try {
    const params = new URLSearchParams({ ...query, units });
    const response = await fetch(`/api/weather${query.city ? '' : '/coordinates'}?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load weather.');
    latestData = data;
    render(data);
    statusText.classList.add('hidden');
    weatherPanel.classList.remove('hidden');
  } catch (error) {
    setStatus(error.message, true);
  }
}

function render(data) {
  const current = data.current;
  if (!current) throw new Error('The weather service returned incomplete data.');
  const unit = '°';
  const speedUnit = units === 'metric' ? 'm/s' : 'mph';
  const icon = current.weather?.[0]?.icon || '🌤️';
  $('#place-name').textContent = [data.name || data.timezone?.split('/').pop()?.replaceAll('_', ' '), data.country].filter(Boolean).join(', ') || 'Your location';
  $('#location-caption').textContent = data.name ? `${data.name}${data.country ? `, ${data.country}` : ''}` : 'Your current location';
  $('#location-message').innerHTML = `Your current location detected!<br><strong>${escapeHtml($('#place-name').textContent)}</strong>`;
  $('#place-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: data.timezone }).format(new Date(current.dt * 1000));
  $('#weather-icon').textContent = icon;
  $('#temperature').textContent = Math.round(current.temp);
  unitButton.textContent = units === 'metric' ? '°C' : '°F';
  $('#temperature-unit').textContent = unitButton.textContent;
  $('#condition').textContent = current.weather?.[0]?.description || 'Current conditions';
  $('#feels-like').textContent = `${Math.round(current.feels_like)}${unit}`;
  $('#humidity').textContent = `${current.humidity}%`;
  $('#wind').textContent = `${Math.round(current.wind_speed)} ${speedUnit}`;
  renderHourly(data.hourly || []);
  renderChart(data.hourly || [], unit);
  renderDaily(data.daily || [], unit);
}

function renderHourly(hours) {
  $('#hourly').innerHTML = hours.slice(0, 6).map((hour, index) => {
    const icon = hour.weather?.[0]?.icon;
    const time = index === 0 ? 'Now' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: latestData.timezone }).format(new Date(hour.dt * 1000));
    return `<div class="hour"><time>${time}</time><span class="forecast-symbol" aria-label="${escapeHtml(hour.weather?.[0]?.description || '')}">${icon || '🌤️'}</span><strong>${Math.round(hour.temp)}°</strong><small>${Math.round(hour.pop * 100 || 0)}% rain</small></div>`;
  }).join('');
}

function renderChart(hours, unit) {
  const samples = hours.slice(0, 8);
  if (!samples.length) { $('#chart').textContent = 'Hourly chart unavailable.'; return; }
  const values = samples.map((hour) => Number(hour.temp));
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const points = values.map((value, index) => {
    const x = samples.length === 1 ? 300 : 16 + index * (568 / (samples.length - 1));
    const y = 160 - ((value - min) / (max - min || 1)) * 125;
    return { x, y, value };
  });
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points.at(-1).x} 175 L ${points[0].x} 175 Z`;
  $('#chart').innerHTML = `<svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#area)"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"><title>${Math.round(point.value)}${unit}</title></circle>`).join('')}</svg><div class="chart-labels">${samples.map((hour) => `<span>${new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: latestData.timezone }).format(new Date(hour.dt * 1000))}</span>`).join('')}</div>`;
}

function renderDaily(days, unit) {
  $('#daily').innerHTML = days.slice(0, 7).map((day, index) => {
    const icon = day.weather?.[0]?.icon || '01d';
    const name = index === 0 ? 'Today' : new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: latestData.timezone }).format(new Date(day.dt * 1000));
    return `<div class="day"><span>${name}</span><span class="forecast-symbol" aria-label="${escapeHtml(day.weather?.[0]?.description || '')}">${icon}</span><span class="muted">${Math.round(day.pop * 100 || 0)}% rain</span><span class="range"><strong>${Math.round(day.temp.max)}${unit}</strong><span class="low">${Math.round(day.temp.min)}${unit}</span></span></div>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (city) loadWeather({ city }, city);
});

$('#location-button').addEventListener('click', () => {
  $('#location-message').textContent = 'Checking your location…';
  if (!navigator.geolocation) return setStatus('Location is not supported by this browser.', true);
  setStatus('Getting your location…');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather({ lat: String(coords.latitude), lon: String(coords.longitude) }, 'your location'),
    () => setStatus('Location permission was denied or could not be determined.', true),
    { enableHighAccuracy: false, timeout: 10000 },
  );
});

$('#location-cta').addEventListener('click', () => $('#location-button').click());

unitButton.addEventListener('click', () => {
  units = units === 'metric' ? 'imperial' : 'metric';
  if (latestQuery) loadWeather(latestQuery, latestQuery.city || 'your location');
});

$('#theme-toggle').addEventListener('click', (event) => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  event.currentTarget.querySelector('span').textContent = isLight ? '☀' : '☾';
  localStorage.setItem('weather-theme', isLight ? 'light' : 'dark');
});

if (localStorage.getItem('weather-theme') === 'light') {
  document.body.classList.add('light');
  $('#theme-toggle span').textContent = '☀';
}

form.addEventListener('submit', () => {
  $('#location-caption').textContent = input.value.trim();
  $('#location-message').innerHTML = `Showing weather for your search.<br><strong>${escapeHtml(input.value.trim())}</strong>`;
});
