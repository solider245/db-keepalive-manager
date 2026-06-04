import postgres from 'postgres';
import { renderHTML } from './html.js';

// ============ Crypto ============

async function deriveKey(adminKey) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(adminKey));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(text, adminKey) {
  const key = await deriveKey(adminKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(data, adminKey) {
  const key = await deriveKey(adminKey);
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// ============ KV Storage ============

async function getDatabases(env) {
  return (await env.DATABASE_KV.get('databases', 'json')) || [];
}

async function setDatabases(env, dbs) {
  await env.DATABASE_KV.put('databases', JSON.stringify(dbs));
}

async function getLogs(env) {
  return (await env.DATABASE_KV.get('logs', 'json')) || [];
}

async function appendLog(env, entry) {
  const logs = await getLogs(env);
  logs.unshift(entry);
  if (logs.length > 10) logs.length = 10;
  await env.DATABASE_KV.put('logs', JSON.stringify(logs));
}

async function getConfig(env) {
  return (await env.DATABASE_KV.get('config', 'json')) || {};
}

async function setConfig(env, cfg) {
  await env.DATABASE_KV.put('config', JSON.stringify(cfg));
}

async function sendTelegram(env, message, customChatId) {
  const cfg = await getConfig(env);
  const chatId = customChatId || cfg.telegramChatId;
  if (!cfg.telegramBotToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error('Telegram send failed:', e.message);
  }
}

async function sendNotification(env, type, data) {
  const cfg = await getConfig(env);
  const reportFreq = cfg.reportFrequency || 'daily';

  // Check if it's time for a scheduled report
  if (type === 'report' && reportFreq !== 'never') {
    const now = new Date();
    const lastReport = cfg.lastReportDate || 0;
    const shouldSend = reportFreq === 'daily'
      ? now.toDateString() !== new Date(lastReport).toDateString()
      : reportFreq === 'weekly'
        ? now.getDay() === 1 && now.toDateString() !== new Date(lastReport).toDateString()
        : reportFreq === 'monthly'
          ? now.getDate() === 1 && now.toDateString() !== new Date(lastReport).toDateString()
          : false;

    if (shouldSend) {
      cfg.lastReportDate = now.getTime();
      await setConfig(env, cfg);
      const dbs = await getDatabases(env);
      const total = dbs.length;
      const ok = dbs.filter(d => d.lastSuccess === true).length;
      const fail = dbs.filter(d => d.lastSuccess === false).length;
      const msg = `📊 *DB Keep-Alive 报告*\n时间: ${now.toLocaleDateString('zh-CN')}\n数据库: ${total} 个\n正常: ${ok} 个\n异常: ${fail} 个\n成功率: ${total ? Math.round(ok/total*100) : 100}%`;
      await sendTelegram(env, msg);
    }
  }

  // Send failure alert
  if (type === 'failure' && data.failed > 0) {
    const msg = `⚠️ *保活异常通知*\n${data.failed} 个数据库保活失败，请检查:\n${data.names.map(n => `- ${n}`).join('\n')}`;
    await sendTelegram(env, msg);
  }
}

// ============ Pinger ============

function detectDbType(url) {
  const host = new URL(url).hostname;
  if (host.includes('supabase.co') || host.includes('pooler.supabase.com')) return 'supabase-http';
  return 'postgres';
}

function getSupabaseProjectRef(url) {
  // Extract from username: postgres.<project_ref>
  const u = new URL(url);
  const user = decodeURIComponent(u.username);
  if (user && user.includes('.')) return user.split('.')[1];
  // Fallback: extract from hostname
  if (u.hostname.endsWith('.supabase.co')) return u.hostname.split('.')[0];
  return null;
}

function detectDatabase(url) {
  const host = new URL(url).hostname;
  const u = new URL(url);
  const user = decodeURIComponent(u.username);
  let projectRef = null;
  let type = 'postgres';
  let consoleUrl = null;
  let detectedName = null;

  if (host.includes('supabase.co') || host.includes('pooler.supabase.com')) {
    type = 'supabase-http';
    if (user && user.includes('.')) projectRef = user.split('.')[1];
    else if (host.endsWith('.supabase.co')) projectRef = host.split('.')[0];
    detectedName = projectRef ? projectRef.substring(0, 12) : 'Supabase';
    consoleUrl = projectRef ? 'https://supabase.com/dashboard/project/' + projectRef : 'https://supabase.com/dashboard';
  } else if (host.includes('neon.tech')) {
    const match = host.match(/^([^.]+)/);
    projectRef = match ? match[1] : null;
    detectedName = projectRef ? projectRef.substring(0, 12) : 'Neon';
    consoleUrl = 'https://console.neon.tech/projects';
  } else if (host.includes('render.com')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Render';
    consoleUrl = 'https://dashboard.render.com/databases';
  } else if (host.includes('aivencloud.com')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Aiven';
    consoleUrl = 'https://console.aiven.io';
  } else if (host.includes('fly.io')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Fly.io';
    consoleUrl = 'https://fly.io/dashboard';
  } else if (host.includes('railway.app')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Railway';
    consoleUrl = 'https://railway.app/dashboard';
  } else if (host.includes('cyclic.sh')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Cyclic';
    consoleUrl = null;
  } else if (host.includes('alwaysdata.net')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Alwaysdata';
    consoleUrl = null;
  } else {
    detectedName = host.split('.')[0] || 'PostgreSQL';
    consoleUrl = null;
  }

  return { type, projectRef, detectedName, consoleUrl };
}

function maskUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const db = u.pathname === '/' ? '' : u.pathname;
    const params = u.search || '';
    return u.protocol + '//' + host + (u.port ? ':' + u.port : '') + db + params;
  } catch {
    return url.substring(0, 50);
  }
}

async function pingPostgres(url) {
  const start = Date.now();
  const sql = postgres(url, {
    max: 1,
    ssl: { rejectUnauthorized: false },
    connection: { application_name: 'db-keepalive' },
  });
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), 10000)),
    ]);
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    // Retry once after 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    try {
      await sql`SELECT 1`;
      return { success: true, durationMs: Date.now() - start, retried: true };
    } catch (err2) {
      // Normalize common error messages
      let msg = err2.message;
      if (msg.includes('connect') || msg.includes('refused') || msg.includes('ECONN'))
        msg = '无法连接到数据库服务器，请检查连接串和网络';
      else if (msg.includes('auth') || msg.includes('password') || msg.includes('login'))
        msg = '认证失败，请检查用户名和密码';
      else if (msg.includes('timeout') || msg.includes('Timeout'))
        msg = '连接超时，数据库可能处于休眠状态';
      return { success: false, error: msg, durationMs: Date.now() - start };
    }
  } finally {
    await sql.end().catch(() => {});
  }
}

async function pingSupabase(projectRef) {
  const start = Date.now();
  try {
    const res = await fetch(`https://${projectRef}.supabase.co/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
    });
    return { success: true, durationMs: Date.now() - start, note: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message, durationMs: Date.now() - start };
  }
}

async function pingDatabase(url) {
  const type = detectDbType(url);
  if (type === 'supabase-http') {
    const ref = getSupabaseProjectRef(url);
    if (!ref) return { success: false, error: 'Cannot detect Supabase project ref from URL' };
    return pingSupabase(ref);
  }
  return pingPostgres(url);
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
      const msg = body.message?.text || '';
      const chatId = body.message?.chat?.id;
      if (!chatId) return Response.json({ ok: true });

      // Read config to verify chat ID matches
      const cfg = await getConfig(env);

      if (msg === '/start') {
        await sendTelegram(env, '👋 *DB Keep-Alive Bot*\\n发送 /status 查看当前数据库状态');
      } else if (msg === '/status') {
        const dbs = await getDatabases(env);
        const total = dbs.length;
        const ok = dbs.filter(d => d.lastSuccess === true).length;
        const fail = dbs.filter(d => d.lastSuccess === false).length;
        let text = '📊 *DB Keep-Alive 状态*\\n\\n';
        text += `总计: ${total} 个数据库\\n正常: ${ok} 个\\n异常: ${fail} 个\\n\\n`;
        for (const db of dbs) {
          const icon = db.lastSuccess === true ? '✅' : db.lastSuccess === false ? '❌' : '⚪';
          text += `${icon} ${db.name} (${db.type || 'postgres'})\\n`;
        }
        if (cfg.telegramChatId && String(chatId) !== String(cfg.telegramChatId)) {
          // Unauthorized chat - silently ignore
          return Response.json({ ok: true });
        }
        await sendTelegram(env, text);
      }
      return Response.json({ ok: true });
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
        const safe = dbs.map(({ encryptedUrl, ...rest }) => rest);
        return Response.json(safe);
      }

      // Test connection (without saving)
      if (method === 'POST' && pathname === '/api/databases/test') {
        const { url: dbUrl } = await request.json();
        if (!dbUrl) return Response.json({ error: 'URL is required' }, { status: 400 });
        const result = await pingDatabase(dbUrl);
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
        });
      }

      if (method === 'POST' && pathname === '/api/notifications/config') {
        const body = await request.json();
        const cfg = await getConfig(env);
        if (body.telegramBotToken) cfg.telegramBotToken = body.telegramBotToken;
        if (body.telegramChatId) cfg.telegramChatId = body.telegramChatId;
        if (body.reportFrequency) cfg.reportFrequency = body.reportFrequency;
        await setConfig(env, cfg);
        return Response.json({ ok: true });
      }

      // Test notification
      if (method === 'POST' && pathname === '/api/notifications/test') {
        const cfg = await getConfig(env);
        if (!cfg.telegramBotToken || !cfg.telegramChatId) {
          return Response.json({ error: '请先配置 Telegram' }, { status: 400 });
        }
        await sendTelegram(env, '✅ *DB Keep-Alive* 通知测试成功！\n你的机器人已正确配置。');
        return Response.json({ ok: true });
      }

      // Add database
      if (method === 'POST' && pathname === '/api/databases') {
        const { name, url: dbUrl } = await request.json();
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
            const result = await pingDatabase(dbUrl);
            db.lastPingAt = Date.now();
            db.lastSuccess = result.success;
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
        await sendNotification(env, 'report', {});
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
        const result = await pingDatabase(dbUrl);
        db.lastPingAt = Date.now();
        db.lastSuccess = result.success;
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
        const result = await pingDatabase(dbUrl);
        db.lastPingAt = Date.now();
        db.lastSuccess = result.success;
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
    // Send notifications
    const allDbs = await getDatabases(env);
    const failed = allDbs.filter(d => d.lastSuccess === false);
    if (failed.length > 0) {
      await sendNotification(env, 'failure', { failed: failed.length, names: failed.map(d => d.name) });
    }
    await sendNotification(env, 'report', {});
    console.log(`[keepalive] Complete at ${new Date().toISOString()}`);
  },
};
