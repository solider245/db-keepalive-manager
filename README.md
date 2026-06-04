<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare" />
  <img src="https://img.shields.io/badge/PostgreSQL-✓-4169E1?logo=postgresql" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://deploy.workers.cloudflare.com/button" />
</p>

<h1 align="center">DB Keep-Alive Manager</h1>

<p align="center">
  A Cloudflare Worker that keeps your free-tier PostgreSQL databases awake — automatically.
</p>

---

## What is this?

**DB Keep-Alive Manager** is a Cloudflare Worker with a built-in web UI for managing and auto-keep-alive of multiple PostgreSQL databases. It prevents Supabase, Neon, Render, Aiven and other free-tier databases from going to sleep due to inactivity.

Connection strings are **AES-256-GCM encrypted** at rest in Cloudflare KV. The Worker supports **Telegram notifications** for failure alerts and daily/weekly/monthly scheduled reports.

No build step, no extra infrastructure — deploy once and forget.

## Features

- **Web UI** — No build step, no frontend framework. Open the URL and go.
- **One-click deploy** — Fork + Deploy button = done.
- **AES-256 encrypted** connection strings at rest.
- **Auto keep-alive** every 10 minutes via Cloudflare Cron Trigger.
- **Failure retry** — Automatically retries once after 3 seconds on failure.
- **Batch import** — Paste multiple connection strings at once.
- **Telegram alerts** — Get notified when a database fails to respond.
- **Scheduled reports** — Configurable daily / weekly / monthly summaries via Telegram.
- **Export / import config** — Backup and restore your database list as JSON.
- **Double-click editing** — Rename any database by double-clicking its name.
- **Provider auto-detection** — Automatically detects Supabase, Neon, Render, Aiven, Fly.io, Railway and more.
- **Provider info cards** — Quick guides to get free database connection strings.
- **Status badge** — Ready for your own README status badge.

## Quick Start

### Method 1 (recommended) — Deploy Button

1. Fork this repository on GitHub.
2. Click the **Deploy to Cloudflare** button above.
3. Authorize Cloudflare and enter your `ADMIN_KEY` when prompted.
4. Wait for the deployment to finish.
5. Open the Worker URL, log in with your `ADMIN_KEY`.
6. Add a connection string — paste, test, save. The rest is automatic.

### Method 2 — CLI Setup

```bash
# Fork & clone
git clone https://github.com/your-username/db-keepalive-manager.git
cd db-keepalive-manager
npm install

# Interactive setup (login, KV, deploy)
npm run setup
```

## Usage

1. Open your Worker URL in a browser.
2. Log in with the `ADMIN_KEY` you set during deployment.
3. Paste a PostgreSQL connection string into the input field:
   ```
   postgresql://user:password@host:5432/database
   ```
4. Click **Test** — the Worker will attempt to connect and show the result.
5. On success, the database is saved automatically and will be kept alive every 10 minutes.
6. Monitor status at a glance: green = healthy, red = failing, gray = not yet checked.

> To also get Telegram alerts and reports, configure the bot token and chat ID in the settings panel (click the gear icon).

## Telegram Notifications

Configure Telegram notifications from the settings panel inside the web UI:

| Setting | Description |
|---------|-------------|
| **Bot Token** | Token from [@BotFather](https://t.me/BotFather) |
| **Chat ID** | Your chat ID (use [@userinfobot](https://t.me/userinfobot)) |
| **Report Frequency** | `daily`, `weekly`, `monthly`, or `never` |

Send `/status` to your bot to get the current status of all databases on demand.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Web management UI |
| POST | `/api/auth` | No | Login with ADMIN_KEY |
| GET | `/api/status` | Yes | Summary of all databases |
| GET | `/api/badge` | Yes | Shields.io compatible badge SVG |
| GET | `/api/databases` | Yes | List all databases |
| POST | `/api/databases` | Yes | Add a database |
| POST | `/api/databases/test` | Yes | Test a connection string |
| POST | `/api/databases/detect` | Yes | Auto-detect provider from URL |
| PUT | `/api/databases/:id` | Yes | Update database name |
| DELETE | `/api/databases/:id` | Yes | Remove a database |
| POST | `/api/ping` | Yes | Ping all databases now |
| POST | `/api/ping/:id` | Yes | Ping a single database |
| GET | `/api/logs` | Yes | Recent ping history |
| GET | `/api/export` | Yes | Export all data as JSON |
| POST | `/api/import` | Yes | Import data from JSON |
| GET | `/api/notifications/config` | Yes | Get notification settings |
| POST | `/api/notifications/config` | Yes | Update notification settings |
| POST | `/api/notifications/test` | Yes | Send a test Telegram message |

## Architecture

```
┌──────────┐     ┌──────────────────┐     ┌───────────┐     ┌─────────────┐
│  Browser  │────▶│  Cloudflare      │────▶│  Cloudflare│     │ PostgreSQL  │
│  (Web UI) │     │  Worker          │     │  KV Store  │     │  (SELECT 1) │
└──────────┘     └──────────┬───────┘     └───────────┘     └─────────────┘
                            │
                    ┌───────▼────────┐
                    │  Cron Trigger  │
                    │  (*/10 * * * *)│
                    └────────────────┘
```

- **Worker** (`src/index.js`) — Serves the web UI, handles API requests, encrypts connection strings, performs pings, sends Telegram notifications.
- **KV** (`DATABASE_KV`) — Stores encrypted connection strings, ping logs, and notification configuration.
- **Cron Trigger** — Fires every 10 minutes to ping all databases in the background.
- **postgres.js** — The only runtime dependency, used for lightweight PostgreSQL connections.

## Local Development

```bash
# Create a .dev.vars file with your local admin key
echo 'ADMIN_KEY=my-local-dev-key' > .dev.vars

# Start the dev server with live reload
npm run dev
```

The development server uses `wrangler dev` and provides the full web UI at `http://localhost:8787`.

## License

[MIT](LICENSE) — Free and open source forever.
