import postgres from 'postgres';
import { connect } from 'cloudflare:sockets';
import { renderHTML } from './render.js';
import { getDatabases, setDatabases, getLogs, appendLog, getConfig, setConfig } from './db.js';
import { sendTelegram, sendNotification, handleTelegramCommand, renderReport } from './tg.js';
import { encrypt, decrypt, detectDbType, detectDatabase, getSupabaseProjectRef, maskUrl } from './utils.js';

// ============ Pinger ============

// Lightweight TCP reachability test for the test endpoint
async function testTcpReachable(urlStr, timeoutMs = 8000) {
  const start = Date.now();
  try {
    const u = new URL(urlStr);
    const host = u.hostname;
    const port = parseInt(u.port || '5432');
    const socket = await connect({ hostname: host, port, timeout: timeoutMs });
    socket.close();
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    let msg = err.message || String(err);
    if (msg.includes('timeout') || msg.includes('Timeout'))
      msg = '连接超时，数据库可能不可达';
    else if (msg.includes('refused'))
      msg = '连接被拒绝，请检查端口';
    else
      msg = msg.substring(0, 200);
    return { success: false, error: msg, durationMs: Date.now() - start };
  }
}

async function pingPostgres(url) {
  const start = Date.now();
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false },
    connection: { application_name: 'db-keepalive' },
  });
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 20s')), 20000)),
    ]);
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    let msg = err.message;
    if (msg.includes('connect') || msg.includes('refused') || msg.includes('ECONN'))
      msg = '无法连接到数据库，请检查连接串和网络';
    else if (msg.includes('auth') || msg.includes('password') || msg.includes('login'))
      msg = '认证失败，请检查用户名和密码';
    else if (msg.includes('timeout') || msg.includes('Timeout'))
      msg = '连接超时，数据库可能处于休眠状态';
    else msg = err.message.substring(0, 200);
    return { success: false, error: msg, durationMs: Date.now() - start };
  } finally {
    sql.end().catch(() => {});
  }
}

async function pingSupabase(projectRef, anonKey) {
  const start = Date.now();
  if (!anonKey) {
    // Fallback: HEAD request (wakes DB but no real connection)
    try {
      await fetch(`https://${projectRef}.supabase.co/`, {
        method: 'HEAD', signal: AbortSignal.timeout(15000),
      });
      return { success: true, durationMs: Date.now() - start, note: 'wake (no anon key - add key for real keep-alive)' };
    } catch (err) {
      return { success: false, error: err.message, durationMs: Date.now() - start };
    }
  }
  // Real keep-alive: GET /rest/v1/ triggers PostgREST → PG connection
  try {
    const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
      },
      signal: AbortSignal.timeout(15000),
    });
    return { success: true, durationMs: Date.now() - start, note: 'REST ' + res.status };
  } catch (err) {
    return { success: false, error: err.message, durationMs: Date.now() - start };
  }
}

async function pingDatabase(url, anonKey) {
  const type = detectDbType(url);
  if (type === 'supabase-http') {
    const ref = getSupabaseProjectRef(url);
    if (!ref) return { success: false, error: 'Cannot detect Supabase project ref from URL' };
    return pingSupabase(ref, anonKey);
  }
  // TCP keepalive (fast, reliable, enough to prevent DB from sleeping)
  const tcp = await testTcpReachable(url, 8000);
  if (!tcp.success) return tcp;
  // Only try full PG health check for known-compatible hosts (Neon)
  // Skip for Render/Aiven/etc. where postgres.js hits subrequest limits
  if (url.includes('neon.tech')) {
    const pg = await pingPostgres(url);
    if (pg.success) return pg;
  }
  return { success: true, durationMs: tcp.durationMs, note: 'TCP reachable' };
}

// ============ Auth ============

// ============ Auth ============

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === env.ADMIN_KEY;
}

// ============ Main Handler ============

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    // Serve UI
    if (method === 'GET' && pathname === '/') {
      return new Response(renderHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Favicon
    if (pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // Auth
    if (method === 'POST' && pathname === '/api/auth') {
      try {
        const body = await request.json();
        if (body.key && body.key === env.ADMIN_KEY) return Response.json({ ok: true });
      } catch {}
      return Response.json({ error: 'Invalid key' }, { status: 401 });
    }

    // Telegram webhook (receive messages from bot)
    if (method === 'POST' && pathname === '/api/telegram/webhook') {
      const body = await request.json();
      return Response.json(await handleTelegramCommand(body, env));
    }

    // Public status endpoint (no auth required)
    if (method === 'GET' && pathname === '/api/status') {
      const dbs = await getDatabases(env);
      const total = dbs.length;
      const ok = dbs.filter(d => d.lastSuccess === true).length;
      const fail = dbs.filter(d => d.lastSuccess === false).length;
      const body = {
        status: fail === 0 && total > 0 ? 'healthy' : total === 0 ? 'empty' : 'degraded',
        total,
        healthy: ok,
        failed: fail,
        lastPingAt: Math.max(...dbs.map(d => d.lastPingAt || 0)),
        databases: dbs.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          healthy: d.lastSuccess === true,
          lastPingAt: d.lastPingAt,
          lastError: d.lastError,
        })),
      };
      return Response.json(body, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // SVG status badge (for README)
    if (method === 'GET' && pathname === '/api/badge') {
      const dbs = await getDatabases(env);
      const total = dbs.length;
      const ok = dbs.filter(d => d.lastSuccess === true).length;
      const label = 'keep-alive';
      const value = total === 0 ? 'no dbs' : ok + '/' + total + ' ok';
      const color = total === 0 ? '#98a2b3' : ok === total ? '#039855' : '#dc2626';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${label.length * 7 + value.length * 7 + 20}" height="20">
        <linearGradient id="b" x2="0%" y2="100%"><stop offset="0%" stop-color="#bbb" stop-opacity=".1"/><stop offset="100%" stop-opacity=".1"/></linearGradient>
        <rect rx="3" fill="#555" width="${label.length * 7 + 10}" height="20"/>
        <rect rx="3" fill="${color}" x="${label.length * 7 + 10}" width="${value.length * 7 + 10}" height="20"/>
        <text fill="#fff" font-family="DejaVu Sans,Verdana,sans-serif" font-size="11" x="5" y="14">${label}</text>
        <text fill="#fff" font-family="DejaVu Sans,Verdana,sans-serif" font-size="11" x="${label.length * 7 + 15}" y="14">${value}</text>
      </svg>`;
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Require auth for all /api/ routes
    if (!pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }
    if (!checkAuth(request, env)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // List databases
      if (method === 'GET' && pathname === '/api/databases') {
        const dbs = await getDatabases(env);
        const safe = dbs.map(({ encryptedUrl, anonKey, ...rest }) => {
          return { ...rest, anonKey: anonKey ? '✓' : null };
        });
        return Response.json(safe);
      }

      // Test connection (without saving) — lightweight TCP check
      if (method === 'POST' && pathname === '/api/databases/test') {
        const { url: dbUrl } = await request.json();
        if (!dbUrl) return Response.json({ error: 'URL is required' }, { status: 400 });
        const result = await testTcpReachable(dbUrl);
        return Response.json(result);
      }

      // Detect database info from URL
      if (method === 'POST' && pathname === '/api/databases/detect') {
        const { url: dbUrl } = await request.json();
        if (!dbUrl) return Response.json({ error: 'URL is required' }, { status: 400 });
        return Response.json(detectDatabase(dbUrl));
      }

      // Update database
      if (method === 'PUT' && pathname.startsWith('/api/databases/')) {
        const id = pathname.split('/')[3];
        if (!id) return Response.json({ error: 'ID is required' }, { status: 400 });
        const body = await request.json();
        const dbs = await getDatabases(env);
        const idx = dbs.findIndex(d => d.id === id);
        if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
        if (body.name) dbs[idx].name = body.name;
        if (body.url) {
          dbs[idx].encryptedUrl = await encrypt(body.url, env.ADMIN_KEY);
          dbs[idx].displayUrl = maskUrl(body.url);
          const info = detectDatabase(body.url);
          if (info.consoleUrl) dbs[idx].consoleUrl = info.consoleUrl;
        }
        await setDatabases(env, dbs);
        return Response.json({ ok: true });
      }

      // Notification config
      if (method === 'GET' && pathname === '/api/notifications/config') {
        const cfg = await getConfig(env);
        return Response.json({
          telegramBotToken: cfg.telegramBotToken ? '✓已配置' : '',
          telegramChatId: cfg.telegramChatId || '',
          reportFrequency: cfg.reportFrequency || 'daily',
          messageTemplate: cfg.messageTemplate || '',
        });
      }

      if (method === 'POST' && pathname === '/api/notifications/config') {
        const body = await request.json();
        const cfg = await getConfig(env);
        if (body.telegramBotToken) cfg.telegramBotToken = body.telegramBotToken;
        if (body.telegramChatId) cfg.telegramChatId = body.telegramChatId;
        if (body.reportFrequency) cfg.reportFrequency = body.reportFrequency;
        if (body.messageTemplate !== undefined) cfg.messageTemplate = body.messageTemplate;
        await setConfig(env, cfg);
        return Response.json({ ok: true });
      }

      // Test notification
      if (method === 'POST' && pathname === '/api/notifications/test') {
        const cfg = await getConfig(env);
        if (!cfg.telegramBotToken || !cfg.telegramChatId) {
          return Response.json({ error: '请先配置 Telegram' }, { status: 400 });
        }
        const body = await request.json().catch(() => ({}));
        if (body && body.template) {
          const dbs = await getDatabases(env);
          const reportText = renderReport(dbs, body.template);
          await sendTelegram(env, reportText);
        } else {
          await sendTelegram(env, '✅ *DB Keep-Alive* 通知测试成功！\n你的机器人已正确配置。');
        }
        return Response.json({ ok: true });
      }

      // Add database
      if (method === 'POST' && pathname === '/api/databases') {
        const { name, url: dbUrl, anonKey } = await request.json();
        if (!name || !dbUrl) {
          return Response.json({ error: 'Name and URL are required' }, { status: 400 });
        }
        const encryptedUrl = await encrypt(dbUrl, env.ADMIN_KEY);
        const info = detectDatabase(dbUrl);
        const record = {
          id: crypto.randomUUID(),
          name,
          type: detectDbType(dbUrl),
          encryptedUrl,
          displayUrl: maskUrl(dbUrl),
          consoleUrl: info.consoleUrl,
          anonKey: anonKey || null,
          createdAt: Date.now(),
          lastPingAt: null,
          lastSuccess: null,
          lastError: null,
        };
        const dbs = await getDatabases(env);
        dbs.push(record);
        await setDatabases(env, dbs);
        return Response.json({ ok: true, id: record.id, name: record.name, consoleUrl: info.consoleUrl });
      }

      // Delete database
      if (method === 'DELETE' && pathname.startsWith('/api/databases/')) {
        const id = pathname.split('/')[3];
        if (!id) return Response.json({ error: 'ID is required' }, { status: 400 });
        const dbs = await getDatabases(env);
        await setDatabases(env, dbs.filter((d) => d.id !== id));
        return Response.json({ ok: true });
      }

      // Ping all databases
      if (method === 'POST' && pathname === '/api/ping') {
        const dbs = await getDatabases(env);
        const results = [];
        for (const db of dbs) {
          try {
            if (db.lastPingAt && Date.now() - db.lastPingAt < 60000) {
              results.push({ id: db.id, name: db.name, success: true, note: 'skipped (recent)' });
              continue;
            }
            const dbUrl = await decrypt(db.encryptedUrl, env.ADMIN_KEY);
            const result = await pingDatabase(dbUrl, db.anonKey);
            db.lastPingAt = Date.now();
            db.lastSuccess = result.success;
            db.lastNote = result.note || null;
            db.lastError = result.error || null;
            await appendLog(env, {
              dbId: db.id,
              dbName: db.name,
              timestamp: Date.now(),
              success: result.success,
              error: result.error || null,
            });
            results.push({ id: db.id, name: db.name, ...result });
          } catch (err) {
            results.push({ id: db.id, name: db.name, success: false, error: err.message });
          }
        }
        // Send notifications
        const failed = results.filter(r => !r.success);
        await sendNotification(env, 'failure', { failed: failed.length, names: failed.map(r => r.name) });
        await sendNotification(env, 'report', {}, dbs);
        await setDatabases(env, dbs);
        return Response.json(results);
      }

      // Ping single database
      if (method === 'POST' && pathname.startsWith('/api/ping/')) {
        const id = pathname.split('/')[3];
        if (!id) return Response.json({ error: 'ID is required' }, { status: 400 });
        const dbs = await getDatabases(env);
        const db = dbs.find(d => d.id === id);
        if (!db) return Response.json({ error: 'Not found' }, { status: 404 });
        const dbUrl = await decrypt(db.encryptedUrl, env.ADMIN_KEY);
        const result = await pingDatabase(dbUrl, db.anonKey);
        db.lastPingAt = Date.now();
        db.lastSuccess = result.success;
        db.lastNote = result.note || null;
        db.lastError = result.error || null;
        await appendLog(env, {
          dbId: db.id, dbName: db.name, timestamp: Date.now(),
          success: result.success, error: result.error || null,
        });
        await setDatabases(env, dbs);
        return Response.json(result);
      }

      // Get logs
      if (method === 'GET' && pathname === '/api/logs') {
        return Response.json(await getLogs(env));
      }

      // Export all data
      if (method === 'GET' && pathname === '/api/export') {
        const dbs = await getDatabases(env);
        const logs = await getLogs(env);
        const safe = dbs.map(({ encryptedUrl, ...rest }) => rest);
        return Response.json({ databases: safe, logs, exportedAt: Date.now() });
      }

      // Import data
      if (method === 'POST' && pathname === '/api/import') {
        const body = await request.json();
        if (!body || !Array.isArray(body.databases)) {
          return Response.json({ error: 'Invalid import format' }, { status: 400 });
        }
        await setDatabases(env, body.databases);
        if (Array.isArray(body.logs)) {
          await env.DATABASE_KV.put('logs', JSON.stringify(body.logs));
        }
        return Response.json({ ok: true, count: body.databases.length });
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
  },

  async scheduled(event, env) {
    const dbs = await getDatabases(env);
    console.log(`[keepalive] Starting ping for ${dbs.length} databases at ${new Date().toISOString()}`);
    for (const db of dbs) {
      if (db.lastPingAt && Date.now() - db.lastPingAt < 60000) {
        console.log(`[keepalive] ${db.name}: skipped (recently pinged)`);
        continue;
      }
      try {
        const dbUrl = await decrypt(db.encryptedUrl, env.ADMIN_KEY);
        const result = await pingDatabase(dbUrl, db.anonKey);
        db.lastPingAt = Date.now();
        db.lastSuccess = result.success;
        db.lastNote = result.note || null;
        db.lastError = result.error || null;
        await appendLog(env, {
          dbId: db.id,
          dbName: db.name,
          timestamp: Date.now(),
          success: result.success,
          error: result.error || null,
        });
        console.log(`[keepalive] ${db.name}: ${result.success ? 'OK' : 'FAIL'} (${result.durationMs}ms)`);
      } catch (err) {
        console.error(`[keepalive] ${db.name}: ERROR - ${err.message}`);
      }
    }
    await setDatabases(env, dbs);
    // Send notifications (reuse in-memory dbs)
    const failed = dbs.filter(d => d.lastSuccess === false);
    if (failed.length > 0) {
      await sendNotification(env, 'failure', { failed: failed.length, names: failed.map(d => d.name) }, dbs);
    }
    await sendNotification(env, 'report', {}, dbs);
    console.log(`[keepalive] Complete at ${new Date().toISOString()}`);
  },
};
