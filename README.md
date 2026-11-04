# 🌤️ Weather Dashboard

A weather dashboard built with Node.js and Express. It serves a responsive browser UI and retrieves free weather forecasts from [Open-Meteo](https://open-meteo.com/).

The dashboard loads Alexandria, Egypt by default. Search for another city at any time. The location button uses browser GPS and BigDataCloud's free, client-side reverse geocoder to show the nearby city name; GPS coordinates are also sent to Open-Meteo for the forecast.

## Features

- Current conditions, feels-like temperature, humidity, wind, and UV index.
- Hourly forecast and a seven-day outlook.
- City search and browser location lookup.
- Celsius/Fahrenheit switching, temperature chart, and dark/light themes.
- Express API that validates input and normalizes weather responses.
- Installable mobile app with an offline app shell and a saved forecast when available.

## Requirements

- Node.js 18 or newer (includes built-in `fetch`).
- npm.
- Internet access to the Open-Meteo forecast and geocoding APIs.

No API key or `.env` file is needed. Open-Meteo's free hosted service is for non-commercial use and has usage limits; see its [terms](https://open-meteo.com/en/terms) before deploying or using the service commercially. Keep the Open-Meteo attribution link in the app.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Install on a phone

Deploy the app to an HTTPS address first; service workers and installation require a secure context (localhost is allowed for development). Open that HTTPS address on your phone and tap **Install app**. On iPhone/iPad, open it in Safari, tap **Share**, then **Add to Home Screen**. The app shell is cached for offline launch, and weather requests fall back to a previously cached forecast. Refreshing weather still requires internet access.

Use `npm start` to run without Node's watch mode. If port 3000 is occupied, set another port before starting; in PowerShell run `$env:PORT=3001; npm start`.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Server health check and provider name. |
| `GET` | `/api/weather?city=Cairo&units=metric` | Search a city, then return current, hourly, and daily weather. |
| `GET` | `/api/weather/coordinates?lat=30.04&lon=31.24&units=metric` | Return weather for coordinates. |

`units` accepts `metric` or `imperial` and defaults to `metric`. Errors use `{ "error": "..." }`.

## Project structure

```text
weather-dashboard/
├── public/
│   ├── app.js
│   ├── favicon.svg
│   ├── icons/
│   │   ├── icon-180.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── styles.css
│   └── sw.js
├── scripts/
│   └── create-pwa-icons.js
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── server.js
```

## Deployment

Run the Node application on a Node-compatible host with HTTPS. Set `PORT` if the host requires a specific port. The Express app serves the UI, manifest, service worker, icons, and weather API from one process.

## License

No project license has been added. Open-Meteo API usage is subject to [Open-Meteo's terms](https://open-meteo.com/en/terms).
