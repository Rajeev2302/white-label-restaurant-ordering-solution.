# Backend API - Lakshmi Ganesh Restaurant

This is the backend API service for the Lakshmi Ganesh Restaurant ordering system.

## Stack
- Node.js + Express
- SQLite (sqlite3 driver with sqlite promise wrapper)

## Configuration
Before running, copy `.env.example` to `.env` and adjust settings as needed:
```bash
cp .env.example .env
```

Available variables:
- `PORT`: Port to run the server on (default: `5000`)
- `NODE_ENV`: Application environment (`development` or `production`)
- `DATABASE_FILE`: SQLite file path (default: `./database.sqlite`)
- `CORS_ORIGIN`: Permitted Origins for browser access (comma-separated)

## Development
To start the developer server with nodemon auto-reload:
```bash
npm run dev
```

## Production
To run in production mode:
```bash
npm start
```
