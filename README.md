# DB Keep-Alive Manager

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/solider245/db-keepalive-manager)

> A Cloudflare Worker that provides a web UI to manage and automatically keep multiple PostgreSQL databases alive.

Prevents serverless PostgreSQL databases (Supabase, Neon, Render, etc.) from going to sleep due to inactivity. Add your connection strings in the web UI, and the Worker automatically pings each database every 10 minutes.

## Features

- **Web management panel** — no additional frontend build, just open the URL
- **Add / test / remove** databases directly from the UI
- **AES-256-GCM encrypted** connection strings at rest
- **Automatic keep-alive** every 10 minutes via Cloudflare Cron Trigger
- **Real-time status** and ping history for each database
- **Zero external dependencies** beyond `postgres.js`

## Quick Start

### Method 1: Deploy Button (推荐)

1. **Fork** this repository on GitHub
2. Click the **Deploy to Cloudflare** button above
3. Authorize Cloudflare and enter your `ADMIN_KEY` when prompted
4. Wait for deployment to complete
5. Open the Worker URL and log in with your `ADMIN_KEY`
6. Add your database connection strings — paste, test, and save

No terminal, no git clone, no code to write.

### Method 2: CLI Setup

```bash
# 1. Fork & clone
git clone https://github.com/your-username/db-keepalive-manager.git
cd db-keepalive-manager
npm install

# 2. Run setup (interactive)
npm run setup
```

This will log you in to Cloudflare, create a KV namespace, set your `ADMIN_KEY`, and deploy the Worker.

## How It Works

```
Browser → Cloudflare Worker → KV (config) → PostgreSQL (SELECT 1)
                ↓
         Cron Trigger (every 10 min)
```

- The Worker serves a single-page web UI from its own code
- Connection strings are encrypted with AES-256-GCM before being stored in KV
- A Cron Trigger fires every 10 minutes, iterates all stored databases, and runs `SELECT 1` on each
- Ping results (success/failure, timing, errors) are stored in KV and displayed in the UI

## Local Development

```bash
# Create .dev.vars with your local admin key
echo 'ADMIN_KEY=my-local-key' > .dev.vars

# Start dev server
npm run dev
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Web management UI |
| POST | `/api/auth` | No | Login with ADMIN_KEY |
| GET | `/api/databases` | Yes | List databases |
| POST | `/api/databases/test` | Yes | Test a connection string |
| POST | `/api/databases` | Yes | Add a database |
| DELETE | `/api/databases/:id` | Yes | Remove a database |
| POST | `/api/ping` | Yes | Ping all databases now |
| GET | `/api/logs` | Yes | Ping history |

## License

MIT
