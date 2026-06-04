export function renderHTML() {
return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DB Keep-Alive Manager</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f2f4f7; color: #1d2939; min-height: 100vh; display: flex; justify-content: center; padding: 16px; }
.container { max-width: 960px; width: 100%; }
.card { background: #fff; border-radius: 10px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
.header button { background: none; border: 1px solid #d0d5dd; border-radius: 6px; padding: 5px 12px; cursor: pointer; font-size: 13px; color: #667085; }
.header button:hover { background: #f2f4f7; }
h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
h2 .badge { font-size: 12px; font-weight: 400; color: #667085; }
h2 .count { font-size: 12px; font-weight: 500; color: #039855; margin-left: auto; }

.providers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.provider-card { border: 1px solid #eaecf0; border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: box-shadow .15s; }
.provider-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.provider-card .name { font-weight: 600; font-size: 14px; }
.provider-card .quota { font-size: 12px; color: #667085; margin: 2px 0; }
.provider-card .tag { display: inline-block; background: #ecfdf5; color: #039855; font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.provider-card .get-link { font-size: 12px; color: #6366f1; margin-top: 6px; display: inline-block; }

.db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.db-table th { text-align: left; padding: 8px 10px; font-weight: 500; color: #667085; font-size: 12px; border-bottom: 2px solid #eaecf0; white-space: nowrap; }
.db-table td { padding: 8px 10px; border-bottom: 1px solid #f2f4f7; vertical-align: middle; }
.db-table tr:last-child td { border-bottom: none; }
.db-table .url-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; font-family: "SF Mono","Fira Code",monospace; font-size: 12px; }
.db-table .url-cell:hover { overflow: visible; white-space: normal; word-break: break-all; position: relative; background: #fff; }
.db-table input { width: 100%; padding: 6px 8px; border: 1px solid #d0d5dd; border-radius: 5px; font-size: 13px; font-family: "SF Mono","Fira Code",monospace; }
.db-table input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.status-ok { color: #039855; }
.status-ok .status-dot { background: #039855; }
.status-fail { color: #dc2626; }
.status-fail .status-dot { background: #dc2626; }
.status-none { color: #98a2b3; }
.status-none .status-dot { background: #d0d5dd; }
.btn-icon { background: none; border: 1px solid transparent; border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 14px; line-height: 1; }
.btn-icon:hover { background: #f2f4f7; border-color: #d0d5dd; }
.btn-icon.danger:hover { background: #fef2f2; border-color: #fecaca; }
.btn { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: background .15s; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-primary:hover { background: #4f46e5; }
.btn-primary:disabled { background: #a5b4fc; cursor: not-allowed; }
.btn-outline { background: #fff; color: #344054; border: 1px solid #d0d5dd; }
.btn-outline:hover { background: #f9fafb; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.log-list { max-height: 160px; overflow-y: auto; font-size: 13px; }
.log-entry { padding: 4px 0; display: flex; gap: 10px; align-items: center; }
.log-time { color: #98a2b3; font-family: "SF Mono","Fira Code",monospace; font-size: 11px; flex-shrink: 0; }
.log-db { font-weight: 500; flex-shrink: 0; }
.log-msg { flex: 1; }

.login-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:100; }
.login-box { background: #fff; border-radius: 12px; padding: 32px; width: 340px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
.login-box h1 { font-size: 20px; margin-bottom: 4px; }
.login-box p { color: #667085; font-size: 14px; margin-bottom: 20px; }
.login-box input { width: 100%; padding: 10px 12px; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
.login-box input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.login-box .btn { width: 100%; justify-content: center; }
.login-error { color: #dc2626; font-size: 13px; margin-top: 8px; display: none; }
.hidden { display: none !important; }

@media (max-width:640px) {
  .providers { grid-template-columns: repeat(2,1fr); }
  .db-table .url-cell { max-width: 120px; }
  .db-table th:nth-child(3), .db-table td:nth-child(3) { display: none; }
}
</style>
</head>
<body>
<div class="container" id="app">
  <!-- Login -->
  <div id="login-view" class="login-overlay">
    <div class="login-box">
      <h1>DB Keep-Alive Manager</h1>
      <p>输入管理员密钥登录</p>
      <input type="password" id="login-key" placeholder="ADMIN_KEY" autofocus>
      <button class="btn btn-primary" onclick="login()" id="login-btn">登录</button>
      <div id="login-error" class="login-error"></div>
    </div>
  </div>

  <!-- Dashboard -->
  <div id="dashboard-view" class="hidden">
    <div class="header">
      <h1>⚡ DB Keep-Alive Manager</h1>
      <button onclick="logout()">退出</button>
    </div>

    <!-- Provider Cards -->
    <div class="card">
      <h2>📦 免费 PostgreSQL 数据库</h2>
      <div class="providers">
        <div class="provider-card" onclick="showProviderInfo('supabase')">
          <div class="name">Supabase</div>
          <div class="quota">500MB · PostgreSQL</div>
          <span class="tag">免费</span>
          <div class="get-link">获取连接串 →</div>
        </div>
        <div class="provider-card" onclick="showProviderInfo('neon')">
          <div class="name">Neon</div>
          <div class="quota">500MB · PostgreSQL</div>
          <span class="tag">免费</span>
          <div class="get-link">获取连接串 →</div>
        </div>
        <div class="provider-card" onclick="showProviderInfo('render')">
          <div class="name">Render</div>
          <div class="quota">1GB · PostgreSQL</div>
          <span class="tag">免费</span>
          <div class="get-link">获取连接串 →</div>
        </div>
        <div class="provider-card" onclick="showProviderInfo('aiven')">
          <div class="name">Aiven</div>
          <div class="quota">5GB · PostgreSQL</div>
          <span class="tag">免费</span>
          <div class="get-link">获取连接串 →</div>
        </div>
      </div>
    </div>

    <!-- Database Table -->
    <div class="card">
      <div class="toolbar">
        <h2>💾 我的数据库 <span id="status-summary" class="badge"></span></h2>
        <button class="btn btn-primary" onclick="pingAll()" id="ping-all-btn" style="font-size:12px;padding:5px 12px">⚡ 保活全部</button>
      </div>
      <table class="db-table">
        <thead>
          <tr>
            <th style="width:38%">连接串</th>
            <th style="width:15%">名称</th>
            <th style="width:12%">类型</th>
            <th style="width:10%">状态</th>
            <th style="width:25%">操作</th>
          </tr>
        </thead>
        <tbody id="db-tbody"></tbody>
      </table>
      <div id="empty-state" class="hidden" style="text-align:center;padding:24px 0;color:#98a2b3;font-size:14px">暂无数据库，在上方粘贴连接串开始</div>
    </div>

    <!-- Logs -->
    <div class="card">
      <h2>📋 保活日志</h2>
      <div id="logs-wrapper" class="log-list">
        <div style="color:#98a2b3;font-size:13px;text-align:center;padding:12px 0">暂无日志</div>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let adminKey = sessionStorage.getItem('adminKey');

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.removeItem('adminKey'); location.reload(); return null; }
  return res.json();
}

function esc(s) { return String(s).replace(/[&<>"]/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

function truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; }

function formatTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Login
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
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    refreshAll();
    setInterval(refreshAll, 30000);
  } else {
    document.getElementById('login-error').textContent = '密钥错误，请重试';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() { sessionStorage.removeItem('adminKey'); adminKey = null; location.reload(); }

// Provider info
function showProviderInfo(provider) {
  const guide = {
    supabase: '1.登录 supabase.com | 2.新建项目 | 3.Project Settings > Database > Connection string > 复制 URI',
    neon: '1.登录 console.neon.tech | 2.新建项目 | 3.Dashboard > Connection Details > 复制连接串',
    render: '1.登录 dashboard.render.com | 2.New PostgreSQL | 3.创建后复制 Internal Database URL',
    aiven: '1.登录 console.aiven.io | 2.创建服务 > PostgreSQL | 3.Connection Info > 复制 URI'
  };
  const links = { supabase: 'https://supabase.com', neon: 'https://console.neon.tech', render: 'https://dashboard.render.com', aiven: 'https://console.aiven.io' };
  alert(guide[provider] || '');
  window.open(links[provider], '_blank');
}

// Refresh all data
async function refreshAll() { await Promise.all([loadDatabases(), loadLogs()]); }

// Load databases
async function loadDatabases() {
  const dbs = await api('/api/databases');
  if (!dbs) return;
  const tbody = document.getElementById('db-tbody');
  const empty = document.getElementById('empty-state');

  let html = '';
  let ok = 0;
  for (const db of dbs) {
    if (db.lastSuccess === true) ok++;
    const cls = db.lastSuccess === null ? 'status-none' : db.lastSuccess ? 'status-ok' : 'status-fail';
    const txt = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '正常' : '失败';
    html += '<tr>' +
      '<td class="url-cell" title="' + esc(db.encryptedUrl || '') + '">' + esc(truncate(db.encryptedUrl || '', 55)) + '</td>' +
      '<td>' + esc(db.name) + '</td>' +
      '<td>' + esc(db.type || 'postgres') + '</td>' +
      '<td class="' + cls + '"><span class="status-dot"></span>' + txt + '</td>' +
      '<td>' +
        '<button class="btn-icon" onclick="pingOne(\'' + db.id + '\')" title="保活">⚡</button>' +
        (db.consoleUrl ? '<button class="btn-icon" onclick="window.open(\'' + esc(db.consoleUrl) + '\',\'_blank\')" title="打开后台">🔗</button>' : '') +
        '<button class="btn-icon danger" onclick="deleteDb(\'' + db.id + '\')" title="删除">✕</button>' +
      '</td></tr>';
  }

  // New row (Excel style - always blank at bottom)
  html += '<tr>' +
    '<td><input type="text" id="new-url" placeholder="粘贴连接串..." oninput="onPasteUrl(this.value)" onkeydown="if(event.key===\'Enter\')testNew()"></td>' +
    '<td><span id="new-name" style="color:#98a2b3;font-size:12px">自动识别</span></td>' +
    '<td><span id="new-type" style="color:#98a2b3;font-size:12px">-</span></td>' +
    '<td><span id="new-status"></span></td>' +
    '<td><button class="btn btn-outline" onclick="testNew()" id="test-new-btn" style="font-size:12px;padding:3px 8px">测试</button></td>' +
    '</tr>';

  tbody.innerHTML = html;
  empty.classList.toggle('hidden', dbs.length > 0);
  document.getElementById('status-summary').textContent = '(' + ok + '/' + dbs.length + ' 正常)';
}

// Paste detection
let detectTimer = null;
async function onPasteUrl(url) {
  clearTimeout(detectTimer);
  if (!url || url.length < 15) return;
  detectTimer = setTimeout(async () => {
    try {
      const info = await api('/api/databases/detect', { method: 'POST', body: JSON.stringify({ url }) });
      if (info && info.detectedName) {
        document.getElementById('new-name').textContent = info.detectedName;
        document.getElementById('new-type').textContent = info.type === 'supabase-http' ? 'Supabase' : 'PG';
      }
    } catch(e) {}
  }, 400);
}

// Test and auto-save
async function testNew() {
  const url = document.getElementById('new-url').value.trim();
  if (!url) return;
  const btn = document.getElementById('test-new-btn');
  const status = document.getElementById('new-status');
  btn.disabled = true; btn.textContent = '测试中...';
  const res = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url }) });
  if (res && res.success) {
    status.innerHTML = '<span style="color:#039855">✅</span>';
    // Auto-save after success
    const name = document.getElementById('new-name').textContent === '自动识别' ? url.match(/@([^:]+)/)?.[1] || 'db' : document.getElementById('new-name').textContent;
    await api('/api/databases', { method: 'POST', body: JSON.stringify({ name, url }) });
    document.getElementById('new-url').value = '';
    document.getElementById('new-name').textContent = '自动识别';
    document.getElementById('new-type').textContent = '-';
    status.innerHTML = '';
    await loadDatabases();
  } else {
    status.innerHTML = '<span style="color:#dc2626">❌ ' + esc(res?.error || '连接失败') + '</span>';
  }
  btn.disabled = false; btn.textContent = '测试';
}

// Ping single
async function pingOne(id) {
  await api('/api/ping/' + id, { method: 'POST' });
  await refreshAll();
}

// Ping all
async function pingAll() {
  const btn = document.getElementById('ping-all-btn');
  btn.disabled = true; btn.textContent = '保活中...';
  await api('/api/ping', { method: 'POST' });
  btn.disabled = false; btn.textContent = '⚡ 保活全部';
  await refreshAll();
}

// Delete
async function deleteDb(id) {
  if (!confirm('确定删除？')) return;
  await api('/api/databases/' + id, { method: 'DELETE' });
  await loadDatabases();
}

// Load logs
async function loadLogs() {
  const logs = await api('/api/logs');
  if (!logs) return;
  const wrapper = document.getElementById('logs-wrapper');
  if (logs.length === 0) { wrapper.innerHTML = '<div style="color:#98a2b3;text-align:center;padding:12px 0">暂无日志</div>'; return; }
  wrapper.innerHTML = logs.map(log =>
    '<div class="log-entry">' +
    '<span class="log-time">' + formatTime(log.timestamp) + '</span>' +
    '<span class="log-db">' + esc(log.dbName) + '</span>' +
    '<span class="log-msg ' + (log.success ? 'status-ok' : 'status-fail') + '">' +
    (log.success ? '✅ 成功' : '❌ ' + esc(log.error || '失败')) +
    '</span></div>'
  ).join('');
}

// Init
document.getElementById('login-key').addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
if (adminKey) {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  refreshAll();
  setInterval(refreshAll, 30000);
}
</script>
</body>
</html>`;
}
