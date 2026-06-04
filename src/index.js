import postgres from 'postgres';

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
  if (logs.length > 50) logs.length = 50;
  await env.DATABASE_KV.put('logs', JSON.stringify(logs));
}

// ============ Pinger ============

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

// ============ HTML UI ============

function renderHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DB Keep-Alive Manager</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f7fa; color: #333; min-height: 100vh; display: flex; justify-content: center; padding: 20px; }
.container { max-width: 800px; width: 100%; }
.card { background: #fff; border-radius: 10px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 16px 0; }
.header h1 { font-size: 22px; font-weight: 600; }
.header button { background: none; border: 1px solid #d0d5dd; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 14px; color: #667085; }
.header button:hover { background: #f2f4f7; }
h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #1d2939; }
label { display: block; font-size: 13px; font-weight: 500; color: #344054; margin-bottom: 4px; }
input, textarea { width: 100%; padding: 8px 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 14px; font-family: inherit; margin-bottom: 12px; }
textarea { resize: vertical; min-height: 40px; font-family: "SF Mono", "Fira Code", monospace; font-size: 13px; }
input:focus, textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: background 0.15s; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-primary:hover { background: #4f46e5; }
.btn-primary:disabled { background: #a5b4fc; cursor: not-allowed; }
.btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 10px; font-size: 13px; }
.btn-danger:hover { background: #fee2e2; }
.btn-outline { background: #fff; color: #344054; border: 1px solid #d0d5dd; }
.btn-outline:hover { background: #f9fafb; }
.form-row { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 12px; }
.form-row .field { flex: 1; }
.form-actions { display: flex; gap: 8px; align-items: center; }
.test-result { font-size: 14px; padding: 6px 0; }
.test-result.success { color: #059669; }
.test-result.error { color: #dc2626; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f2f4f7; }
th { font-weight: 500; color: #667085; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
td { color: #1d2939; }
.status-ok { color: #059669; font-weight: 500; }
.status-fail { color: #dc2626; font-weight: 500; }
.status-none { color: #98a2b3; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge-ok { background: #ecfdf5; color: #059669; }
.badge-fail { background: #fef2f2; color: #dc2626; }
.log-list { max-height: 200px; overflow-y: auto; }
.log-entry { padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f9fafb; display: flex; gap: 12px; align-items: center; }
.log-entry:last-child { border-bottom: none; }
.log-time { color: #98a2b3; font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; flex-shrink: 0; }
.log-db { font-weight: 500; flex-shrink: 0; }
.log-msg { flex: 1; }
.login-card { max-width: 360px; margin: 80px auto; text-align: center; }
.login-card h1 { margin-bottom: 8px; }
.login-card p { color: #667085; font-size: 14px; margin-bottom: 24px; }
.loading { opacity: 0.5; pointer-events: none; }
.empty-state { color: #98a2b3; font-size: 14px; text-align: center; padding: 24px 0; }
@media (max-width: 600px) {
  .container { padding: 0; }
  .card { padding: 16px; }
  .form-row { flex-direction: column; }
  table { font-size: 13px; }
  th, td { padding: 8px; }
}
</style>
</head>
<body>
<div class="container" id="app">
  <!-- Login -->
  <div id="login-view" class="card login-card" style="display:none">
    <h1>DB Keep-Alive Manager</h1>
    <p>输入管理员密钥登录</p>
    <input type="password" id="login-key" placeholder="ADMIN_KEY" onkeydown="if(event.key==='Enter')login()">
    <button class="btn btn-primary" onclick="login()" style="width:100%;justify-content:center" id="login-btn">登录</button>
    <div id="login-error" style="color:#dc2626;font-size:13px;margin-top:8px;display:none"></div>
  </div>

  <!-- Dashboard -->
  <div id="dashboard-view" style="display:none">
    <div class="header">
      <h1>DB Keep-Alive Manager</h1>
      <button onclick="logout()">退出登录</button>
    </div>

    <!-- Add Database -->
    <div class="card">
      <h2>+ 添加数据库</h2>
      <div class="form-row">
        <div class="field">
          <label for="db-name">名称</label>
          <input type="text" id="db-name" placeholder="例如: Supabase 生产">
        </div>
      </div>
      <div class="field">
        <label for="db-url">连接字符串</label>
        <textarea id="db-url" rows="2" placeholder="postgresql://user:password@host:5432/database?sslmode=require"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="testConnection()" id="test-btn">测试连接</button>
        <button class="btn btn-outline" onclick="saveDatabase()" id="save-btn" style="display:none">保存</button>
        <span id="test-result" class="test-result"></span>
      </div>
    </div>

    <!-- Database List -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0">数据库列表</h2>
        <button class="btn btn-primary" onclick="pingAll()" id="ping-all-btn" style="font-size:13px">保活全部</button>
      </div>
      <div id="db-table-wrapper">
        <div class="empty-state">暂无数据库，添加一个开始吧</div>
      </div>
    </div>

    <!-- Logs -->
    <div class="card">
      <h2>保活日志</h2>
      <div id="logs-wrapper" class="log-list">
        <div class="empty-state">暂无日志</div>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let adminKey = sessionStorage.getItem('adminKey');
let refreshTimer = null;

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.removeItem('adminKey'); location.reload(); return null; }
  return res.json();
}

function showLogin() {
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('dashboard-view').style.display = 'none';
  if (refreshTimer) clearInterval(refreshTimer);
}

function showDashboard() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  loadDatabases();
  loadLogs();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadDatabases, 30000);
}

async function login() {
  const key = document.getElementById('login-key').value;
  if (!key) return;
  document.getElementById('login-btn').disabled = true;
  document.getElementById('login-error').style.display = 'none';
  const res = await api('/api/auth', { method: 'POST', body: JSON.stringify({ key }) });
  document.getElementById('login-btn').disabled = false;
  if (res && res.ok) {
    sessionStorage.setItem('adminKey', key);
    adminKey = key;
    showDashboard();
  } else {
    document.getElementById('login-error').textContent = '密钥错误，请重试';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() {
  sessionStorage.removeItem('adminKey');
  adminKey = null;
  showLogin();
}

function formatTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadDatabases() {
  const dbs = await api('/api/databases');
  if (!dbs) return;
  const wrapper = document.getElementById('db-table-wrapper');
  if (dbs.length === 0) {
    wrapper.innerHTML = '<div class="empty-state">暂无数据库，添加一个开始吧</div>';
    return;
  }
  wrapper.innerHTML = '<table><thead><tr><th>名称</th><th>类型</th><th>上次保活</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
    dbs.map(db => {
      const statusClass = db.lastSuccess === null ? 'status-none' : db.lastSuccess ? 'status-ok' : 'status-fail';
      const statusText = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '✅ 正常' : '❌ 失败';
      return '<tr>' +
        '<td><strong>' + esc(db.name) + '</strong></td>' +
        '<td>' + esc(db.type || 'postgres') + '</td>' +
        '<td>' + formatTime(db.lastPingAt) + '</td>' +
        '<td class="' + statusClass + '">' + statusText + '</td>' +
        '<td><button class="btn btn-danger" onclick="deleteDatabase(\'' + db.id + '\')">删除</button></td>' +
        '</tr>';
    }).join('') + '</tbody></table>';
}

function esc(s) { return String(s).replace(/[&<>"]/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

async function loadLogs() {
  const logs = await api('/api/logs');
  if (!logs) return;
  const wrapper = document.getElementById('logs-wrapper');
  if (logs.length === 0) {
    wrapper.innerHTML = '<div class="empty-state">暂无日志</div>';
    return;
  }
  wrapper.innerHTML = logs.map(log =>
    '<div class="log-entry">' +
    '<span class="log-time">' + formatTime(log.timestamp) + '</span>' +
    '<span class="log-db">' + esc(log.dbName) + '</span>' +
    '<span class="log-msg ' + (log.success ? 'status-ok' : 'status-fail') + '">' +
    (log.success ? '✅ 成功' : '❌ ' + esc(log.error || '失败')) +
    '</span></div>'
  ).join('');
}

async function testConnection() {
  const url = document.getElementById('db-url').value.trim();
  const btn = document.getElementById('test-btn');
  const result = document.getElementById('test-result');
  const saveBtn = document.getElementById('save-btn');
  if (!url) { result.textContent = '请输入连接字符串'; result.className = 'test-result error'; return; }
  btn.disabled = true;
  btn.textContent = '测试中...';
  result.textContent = '';
  saveBtn.style.display = 'none';
  const res = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url }) });
  btn.disabled = false;
  btn.textContent = '测试连接';
  if (res && res.success) {
    result.textContent = '✅ 连接成功 (' + res.durationMs + 'ms)';
    result.className = 'test-result success';
    saveBtn.style.display = 'inline-flex';
  } else {
    result.textContent = '❌ 连接失败: ' + (res && res.error ? res.error : '未知错误');
    result.className = 'test-result error';
  }
}

async function saveDatabase() {
  const name = document.getElementById('db-name').value.trim();
  const url = document.getElementById('db-url').value.trim();
  if (!name) { alert('请输入数据库名称'); return; }
  if (!url) { alert('请输入连接字符串'); return; }
  const res = await api('/api/databases', { method: 'POST', body: JSON.stringify({ name, url }) });
  if (res) {
    document.getElementById('db-name').value = '';
    document.getElementById('db-url').value = '';
    document.getElementById('test-result').textContent = '';
    document.getElementById('save-btn').style.display = 'none';
    loadDatabases();
  }
}

async function deleteDatabase(id) {
  if (!confirm('确定要删除这个数据库吗？')) return;
  await api('/api/databases/' + id, { method: 'DELETE' });
  loadDatabases();
}

async function pingAll() {
  const btn = document.getElementById('ping-all-btn');
  btn.disabled = true;
  btn.textContent = '保活中...';
  document.getElementById('db-table-wrapper').classList.add('loading');
  await api('/api/ping', { method: 'POST' });
  btn.disabled = false;
  btn.textContent = '保活全部';
  document.getElementById('db-table-wrapper').classList.remove('loading');
  loadDatabases();
  loadLogs();
}

// Init
if (adminKey) { showDashboard(); } else { showLogin(); }
</script>
</body>
</html>`;
}

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
        const result = await pingPostgres(dbUrl);
        return Response.json(result);
      }

      // Add database
      if (method === 'POST' && pathname === '/api/databases') {
        const { name, url: dbUrl } = await request.json();
        if (!name || !dbUrl) {
          return Response.json({ error: 'Name and URL are required' }, { status: 400 });
        }
        const encryptedUrl = await encrypt(dbUrl, env.ADMIN_KEY);
        const record = {
          id: crypto.randomUUID(),
          name,
          type: 'postgres',
          encryptedUrl,
          createdAt: Date.now(),
          lastPingAt: null,
          lastSuccess: null,
          lastError: null,
        };
        const dbs = await getDatabases(env);
        dbs.push(record);
        await setDatabases(env, dbs);
        return Response.json({ ok: true, id: record.id, name: record.name });
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
            const result = await pingPostgres(dbUrl);
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

      // Get logs
      if (method === 'GET' && pathname === '/api/logs') {
        return Response.json(await getLogs(env));
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
        const result = await pingPostgres(dbUrl);
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
