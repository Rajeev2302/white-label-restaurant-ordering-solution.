# Customer Frontend App - Lakshmi Ganesh Restaurant

This is the customer-facing ordering application for the Lakshmi Ganesh Restaurant. Customers scan table-specific QR codes to load this app.

## Stack
- React 18
- Vite
- Lucide React

## Configuration
The development server is pre-configured in `vite.config.js` to proxy `/api` requests to `http://localhost:5000` (the backend API service) to prevent CORS issues.

## Development
To start the React development server locally:
```bash
npm run dev
```
It will run on `http://localhost:5173`.
