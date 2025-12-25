# 🚀 Quick Start - Development Setup

## Running the Application Locally

You need to run **TWO servers** for local development:

### Terminal 1: API Server (Backend)
```bash
npm run dev:api
```
This starts the Express API server on `http://localhost:3001`

### Terminal 2: Vite Dev Server (Frontend)
```bash
npm run dev
```
This starts the Vite frontend on `http://localhost:5173` (or similar)

## Why Two Servers?

- **Local Development**: Vite (frontend) + Express (API)
- **Production (Vercel)**: Everything runs as serverless functions

## Alternative: One-Line Start

On Windows PowerShell:
```powershell
Start-Process npm -ArgumentList "run", "dev:api" -NoNewWindow; npm run dev
```

On Mac/Linux:
```bash
npm run dev:api & npm run dev
```

## Troubleshooting

### "API proxy error"
- Make sure the API server is running (`npm run dev:api`)
- Check that port 3001 is not in use

### "Connection refused"
- Start the API server first
- Then start the Vite server

### Data not persisting
- Verify MongoDB connection in `.env.local`
- Check API server logs for errors

---

**Ready to go!** Open `http://localhost:5173` in your browser after starting both servers.
