# 🌤️ Weather Dashboard

A weather dashboard built with Node.js and Express. It serves a responsive browser UI and keeps OpenWeather requests and the API key on the server.

## Features

- Current conditions, feels-like temperature, humidity, wind, and UV index.
- Hourly forecast and a seven-day outlook.
- Search by city or use browser location.
- Temperature unit switching between Celsius and Fahrenheit.
- Temperature chart and dark/light themes.
- Express API with input validation and readable error responses.

## Requirements

- Node.js 18 or newer (includes the built-in `fetch` API).
- npm.
- An OpenWeather API key with access to **One Call API 3.0**. The seven-day forecast endpoint requires One Call 3.0 access; check the current plan and usage terms in your OpenWeather account.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your key:

   ```env
   OPENWEATHER_API_KEY=your_api_key_here
   PORT=3000
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Use `npm start` to run without Node's watch mode. Never put the API key in browser code or commit `.env`.

## API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Server health check. |
| `GET` | `/api/weather?city=Cairo&units=metric` | Search a city and return current, hourly, and daily weather. |
| `GET` | `/api/weather/coordinates?lat=30.04&lon=31.24&units=metric` | Return weather for coordinates. |

`units` accepts `metric` or `imperial` and defaults to `metric`. The weather endpoints return the OpenWeather One Call response with location fields; errors use `{ "error": "..." }`.

## Project structure

```text
weather-dashboard/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Deployment

Run the Node application on a Node-compatible host and configure `OPENWEATHER_API_KEY` as a server-side environment variable. Set `PORT` if the host requires a specific port. The Express app serves the UI and API from the same process.

## License

No license has been added yet.
