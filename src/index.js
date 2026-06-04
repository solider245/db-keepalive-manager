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
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 15s')), 15000)),
    ]);
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    return { success: false, error: err.message, durationMs: Date.now() - start };
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
    console.log(`[keepalive] Complete at ${new Date().toISOString()}`);
  },
};
