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
.db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.db-table th { text-align: left; padding: 8px 10px; font-weight: 500; color: #667085; font-size: 12px; border-bottom: 2px solid #eaecf0; white-space: nowrap; }
.db-table td { padding: 8px 10px; border-bottom: 1px solid #f2f4f7; vertical-align: middle; }
.db-table tr:last-child td { border-bottom: none; }
.db-table .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; font-family: "SF Mono","Fira Code",monospace; font-size: 12px; }
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
  .db-table .url-cell { max-width: 140px; }
  .db-table th:nth-child(2), .db-table td:nth-child(2) { display: none; }
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
      <div style="display:flex;gap:4px">
        <button onclick="toggleSettings()" title="设置">⚙️</button>
        <button onclick="logout()">退出</button>
      </div>
    </div>

    <!-- Database Table -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:15px;font-weight:600">💾 数据库 <span id="status-summary" style="font-size:12px;font-weight:400;color:#667085"></span></span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-primary" onclick="pingAll()" id="ping-all-btn" style="font-size:12px;padding:5px 12px">⚡ 保活全部</button>
        </div>
      </div>
      <table class="db-table">
        <thead>
          <tr>
            <th style="width:45%">连接串</th>
            <th style="width:15%">名称</th>
            <th style="width:12%">状态</th>
            <th style="width:28%">操作</th>
          </tr>
        </thead>
        <tbody id="db-tbody"></tbody>
      </table>
      <div id="empty-state" class="hidden" style="text-align:center;padding:32px 0;color:#98a2b3">
        <div style="font-size:48px;margin-bottom:12px">🗄️</div>
        <div style="font-size:15px;font-weight:500;color:#667085;margin-bottom:8px">还没有添加数据库</div>
        <div style="font-size:13px;line-height:1.8">
          粘贴连接串到下方输入框，点击"测试"自动保存
        </div>
      </div>
    </div>

    <!-- Log bar -->
    <div id="log-bar" style="margin-top:8px;padding-top:8px;border-top:1px solid #eaecf0;font-size:12px;color:#667085;display:flex;gap:12px;flex-wrap:wrap;min-height:20px"></div>

    <!-- Hint panel -->
    <div id="hint-panel" style="display:none;margin-top:8px;padding:10px 14px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;font-size:13px">
      <div style="font-weight:500;margin-bottom:6px;color:#344054">👉 不知道连接串在哪？</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <a href="#" onclick="window.open('https://supabase.com/dashboard/project/_/settings/database','_blank');return false" style="padding:4px 10px;border:1px solid #d0d5dd;border-radius:5px;color:#6366f1;text-decoration:none;font-size:12px">获取 Supabase →</a>
        <a href="#" onclick="window.open('https://console.neon.tech/app/projects/_/connection_details','_blank');return false" style="padding:4px 10px;border:1px solid #d0d5dd;border-radius:5px;color:#6366f1;text-decoration:none;font-size:12px">获取 Neon →</a>
        <a href="#" onclick="window.open('https://dashboard.render.com/d/u/_/info','_blank');return false" style="padding:4px 10px;border:1px solid #d0d5dd;border-radius:5px;color:#6366f1;text-decoration:none;font-size:12px">获取 Render →</a>
        <a href="#" onclick="window.open('https://console.aiven.io','_blank');return false" style="padding:4px 10px;border:1px solid #d0d5dd;border-radius:5px;color:#6366f1;text-decoration:none;font-size:12px">获取 Aiven →</a>
      </div>
      <div style="color:#98a2b3;font-size:12px;margin-top:6px">点击直达对应平台，复制连接串后粘贴</div>
    </div>

    <!-- Detect panel -->
    <div id="detect-panel" style="display:none;margin-top:8px;padding:10px 14px;border-radius:8px;font-size:13px"></div>

    <!-- Settings panel -->
    <div id="settings-panel" style="display:none;margin-top:12px;padding:16px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;font-size:13px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div>
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#344054">📦 免费数据库</h3>
          <div style="font-size:12px;line-height:1.8">
            <a href="#" onclick="window.open('https://supabase.com','_blank');return false" style="color:#6366f1">Supabase</a> <span style="display:inline-block;background:#ecfdf5;color:#039855;font-size:10px;padding:0 5px;border-radius:3px">500MB</span><br>
            <a href="#" onclick="window.open('https://console.neon.tech','_blank');return false" style="color:#6366f1">Neon</a> <span style="display:inline-block;background:#ecfdf5;color:#039855;font-size:10px;padding:0 5px;border-radius:3px">500MB</span><br>
            <a href="#" onclick="window.open('https://dashboard.render.com','_blank');return false" style="color:#6366f1">Render</a> <span style="display:inline-block;background:#ecfdf5;color:#039855;font-size:10px;padding:0 5px;border-radius:3px">1GB</span><br>
            <a href="#" onclick="window.open('https://console.aiven.io','_blank');return false" style="color:#6366f1">Aiven</a> <span style="display:inline-block;background:#ecfdf5;color:#039855;font-size:10px;padding:0 5px;border-radius:3px">5GB</span>
          </div>
        </div>
        <div>
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#344054">🔔 Telegram 通知</h3>
          <input type="password" id="tg-token" placeholder="Bot Token" style="width:100%;padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px;margin-bottom:4px">
          <input type="text" id="tg-chatid" placeholder="Chat ID" style="width:100%;padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px;margin-bottom:4px">
          <select id="tg-frequency" style="width:100%;padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px;margin-bottom:4px">
            <option value="daily">每日报告</option>
            <option value="weekly">每周报告</option>
            <option value="monthly">每月报告</option>
            <option value="never">不推送</option>
          </select>
          <div style="display:flex;gap:4px">
            <button onclick="saveNotifConfig()" style="padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">保存</button>
            <button onclick="testNotif()" style="padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">测试</button>
            <span id="notif-status" style="font-size:11px;color:#667085"></span>
          </div>
        </div>
        <div>
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#344054">📤 数据管理</h3>
          <div style="font-size:12px;color:#667085;margin-bottom:8px">导出/导入全部配置</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button onclick="exportData()" style="padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">📤 导出</button>
            <button onclick="importData()" style="padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">📥 导入</button>
            <button onclick="toggleBatch()" style="padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">📋 批量导入</button>
          </div>
          <div id="batch-area" style="display:none;margin-top:8px">
            <textarea id="batch-input" rows="2" placeholder="每行一个连接串，批量导入..." style="width:100%;padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-family:monospace;font-size:11px"></textarea>
            <button onclick="batchImport()" style="margin-top:4px;padding:3px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;font-size:11px;cursor:pointer">批量测试并保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let adminKey = sessionStorage.getItem('adminKey');

async function api(path, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.removeItem('adminKey'); location.reload(); return null; }
  return res.json();
}

function esc(s) { return String(s).replace(/[&<>"]/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

function truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; }

function formatRelativeTime(ts) {
  if (!ts) return '-';
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + '分钟前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '小时前';
  const days = Math.floor(hours / 24);
  return days + '天前';
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
    setTimeout(function() {
      var el = document.getElementById('new-url');
      if (el) el.focus();
    }, 500);
  } else {
    document.getElementById('login-error').textContent = '密钥错误，请重试';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() { sessionStorage.removeItem('adminKey'); adminKey = null; location.reload(); }

// Refresh all data
async function refreshAll() {
  await loadDatabases();
  await loadLogs();
}

// Load databases
async function loadDatabases() {
  var dbs = await api('/api/databases');
  if (!dbs) return;
  dbs.sort(function(a, b) {
    var getPriority = function(db) {
      if (db.lastSuccess === false) return 0;
      if (db.lastSuccess === null) return 1;
      return 2;
    };
    return getPriority(a) - getPriority(b);
  });
  var tbody = document.getElementById('db-tbody');
  var empty = document.getElementById('empty-state');
  var html = '';
  var ok = 0;
  var total = dbs.length;
  for (var i = 0; i < dbs.length; i++) {
    var db = dbs[i];
    if (db.lastSuccess === true) ok++;
    var cls = db.lastSuccess === null ? 'status-none' : db.lastSuccess ? 'status-ok' : 'status-fail';
    var txt = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '正常' : '失败';
    html += '<tr>' +
      '<td class="url-cell" title="' + esc(db.displayUrl || '') + '">' + esc(truncate(db.displayUrl || '', 55)) + (db.anonKey ? ' <span style="font-size:10px;color:#6366f1">🔑</span>' : '') + '</td>' +
      '<td ondblclick="editName(\\'' + db.id + '\\',this)" title="双击编辑">' + esc(db.name) + '</td>' +
      '<td class="' + cls + '" title="' + (db.lastError ? esc(db.lastError) : '') + '" style="cursor:' + (db.lastError ? 'help' : 'default') + '">' +
        '<span class="status-dot"></span>' + txt +
        (db.lastError ? '<span style="margin-left:4px;cursor:pointer;font-size:11px;color:#dc2626" onclick="alert(\\'' + esc(db.lastError) + '\\')">ⓘ</span>' : '') +
      '</td>' +
      '<td>' +
        '<button class="btn-icon" onclick="pingOne(\\'' + db.id + '\\')" title="保活">⚡</button>' +
        (db.consoleUrl ? '<button class="btn-icon" onclick="window.open(\\'' + esc(db.consoleUrl) + '\\',\\'_blank\\')" title="打开后台">🔗</button>' : '') +
        '<button class="btn-icon" onclick="copyUrl(\\'' + esc(db.displayUrl || '') + '\\')" title="复制连接串">📋</button>' +
        '<button class="btn-icon danger" onclick="deleteDb(\\'' + db.id + '\\')" title="删除">✕</button>' +
      '</td></tr>';
  }
  // New row
  html += '<tr>' +
    '<td style="position:relative">' +
      '<input type="text" id="new-url" placeholder="粘贴连接串..." oninput="onPasteUrl(this.value)" onfocus="onFocusUrl()" onblur="onBlurUrl()" onkeydown="if(event.key===\\'Enter\\')testNew()">' +
    '</td>' +
    '<td><span id="new-name" style="color:#98a2b3;font-size:12px">自动识别</span></td>' +
    '<td><span id="new-status"></span></td>' +
    '<td>' +
      '<input type="text" id="new-anonkey" placeholder="anon key (Supabase需要)" style="display:none;font-size:11px;padding:2px 6px;width:100%;margin-bottom:2px;border:1px solid #d0d5dd;border-radius:4px">' +
      '<button class="btn btn-outline" onclick="testNew()" id="test-new-btn" style="font-size:12px;padding:3px 8px">测试</button>' +
    '</td></tr>';
  tbody.innerHTML = html;
  empty.classList.toggle('hidden', dbs.length > 0);
  document.getElementById('status-summary').textContent = '(' + ok + '/' + dbs.length + ' 正常)';
  var countBtn = document.getElementById('ping-all-btn');
  if (countBtn && dbs.length > 0) {
    countBtn.textContent = '⚡ 保活全部 (' + dbs.length + ')';
  }
  document.title = 'DB Keep-Alive (' + ok + '/' + dbs.length + ')';
}

// Hint panel
function onFocusUrl() {
  var hintPanel = document.getElementById('hint-panel');
  if (hintPanel) hintPanel.style.display = 'block';
}

function onBlurUrl() {
  setTimeout(function() {
    var hintPanel = document.getElementById('hint-panel');
    if (hintPanel) hintPanel.style.display = 'none';
  }, 200);
}

// Paste detection
var detectTimer = null;

async function onPasteUrl(url) {
  clearTimeout(detectTimer);
  var hintPanel = document.getElementById('hint-panel');
  if (hintPanel) hintPanel.style.display = 'none';
  var detectPanel = document.getElementById('detect-panel');
  if (!url || url.length < 15) {
    if (detectPanel) { detectPanel.style.display = 'none'; }
    return;
  }
  // Format check
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://') && !url.startsWith('redis://')) {
    if (detectPanel) {
      detectPanel.style.display = 'block';
      detectPanel.style.background = '#fff5f5';
      detectPanel.style.border = '1px solid #fecaca';
      detectPanel.style.color = '#dc2626';
      detectPanel.innerHTML = '⚠️ 格式不正确，请粘贴 PostgreSQL 连接串';
    }
    return;
  }
  if (detectPanel) {
    detectPanel.style.display = 'block';
    detectPanel.style.background = '#f0f9ff';
    detectPanel.style.border = '1px solid #bae6fd';
    detectPanel.style.color = '#1d2939';
    detectPanel.innerHTML = '检测中...';
  }
  detectTimer = setTimeout(async function() {
    try {
      var info = await api('/api/databases/detect', { method: 'POST', body: JSON.stringify({ url: url }) });
      if (info && info.detectedName) {
        document.getElementById('new-name').textContent = info.detectedName;
        if (detectPanel) {
          if (info.type === 'supabase-http') {
            detectPanel.style.background = '#fffbeb';
            detectPanel.style.border = '1px solid #fde68a';
            detectPanel.style.color = '#92400e';
            detectPanel.innerHTML = '⚠️ 检测到 <strong>Supabase</strong>，保活需要 anon key，请在下方输入';
            document.getElementById('new-anonkey').style.display = 'block';
          } else {
            detectPanel.style.background = '#f0fdf4';
            detectPanel.style.border = '1px solid #bbf7d0';
            detectPanel.style.color = '#166534';
            detectPanel.innerHTML = '✅ 检测到 <strong>' + esc(info.detectedName) + '</strong>，可直接保活';
            document.getElementById('new-anonkey').style.display = 'none';
          }
        }
      } else {
        if (detectPanel) {
          detectPanel.style.background = '#f0fdf4';
          detectPanel.style.border = '1px solid #bbf7d0';
          detectPanel.style.color = '#166534';
          detectPanel.innerHTML = '✅ 格式正确，可测试保活';
        }
      }
    } catch(e) {
      if (detectPanel) {
        detectPanel.style.background = '#fff5f5';
        detectPanel.style.border = '1px solid #fecaca';
        detectPanel.style.color = '#dc2626';
        detectPanel.innerHTML = '检测失败，可直接测试';
      }
    }
  }, 400);
}

// Test and auto-save
async function testNew() {
  var url = document.getElementById('new-url').value.trim();
  if (!url) return;
  var btn = document.getElementById('test-new-btn');
  var status = document.getElementById('new-status');
  btn.disabled = true; btn.textContent = '测试中...';
  var res = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: url }) });
  if (res && res.success) {
    status.innerHTML = '<span style="color:#039855">✅</span>';
    var name = document.getElementById('new-name').textContent === '自动识别' ? (url.match(/@([^:]+)/) ? url.match(/@([^:]+)/)[1] : 'db') : document.getElementById('new-name').textContent;
    var anonKey = document.getElementById('new-anonkey').value.trim();
    var payload = { name: name, url: url };
    if (anonKey) payload.anonKey = anonKey;
    await api('/api/databases', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('new-url').value = '';
    document.getElementById('new-name').textContent = '自动识别';
    document.getElementById('new-anonkey').value = '';
    document.getElementById('new-anonkey').style.display = 'none';
    status.innerHTML = '';
    await loadDatabases();
    document.getElementById('new-url').focus();
  } else {
    status.innerHTML = '<span style="color:#dc2626">❌ ' + esc(res ? res.error : '连接失败') + '</span>';
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
  var btn = document.getElementById('ping-all-btn');
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

// Export
async function exportData() {
  var data = await api('/api/export');
  if (!data) return;
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'db-keepalive-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Import
async function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async function() {
    try {
      var text = await input.files[0].text();
      var data = JSON.parse(text);
      var res = await api('/api/import', { method: 'POST', body: text });
      if (res && res.ok) {
        alert('导入成功：' + res.count + ' 个数据库');
        refreshAll();
      }
    } catch(e) {
      alert('导入失败：' + e.message);
    }
  };
  input.click();
}

// Copy URL
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(function() {
    var btn = event.target;
    var orig = btn.textContent;
    btn.textContent = '✅';
    setTimeout(function() { btn.textContent = orig; }, 1000);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
}

// Load logs
async function loadLogs() {
  var logs = await api('/api/logs');
  if (!logs) return;
  var bar = document.getElementById('log-bar');
  if (logs.length === 0) { bar.innerHTML = '<span style="color:#98a2b3">暂无保活日志</span>'; return; }
  bar.innerHTML = '📋 ' + logs.slice(0, 6).map(function(log) {
    return '<span style="display:inline-flex;gap:4px;align-items:center">' +
    '<span style="color:#98a2b3;font-family:monospace;font-size:11px">' + formatRelativeTime(log.timestamp) + '</span> ' +
    '<span style="color:' + (log.success ? '#039855' : '#dc2626') + '">' +
    (log.success ? '✅' : '❌') + ' ' + esc(log.name || log.dbName) +
    (log.error ? ' (' + esc(log.error.substring(0, 30)) + ')' : '') +
    '</span></span>';
  }).join(' | ');
}

// Batch import
function toggleBatch() {
  var area = document.getElementById('batch-area');
  if (!area) return;
  if (area.style.display === 'none') {
    area.style.display = 'block';
    var input = document.getElementById('batch-input');
    if (input) input.focus();
  } else {
    area.style.display = 'none';
  }
}

async function batchImport() {
  var text = document.getElementById('batch-input').value.trim();
  if (!text) return;
  var urls = text.split('\\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 10; });
  if (urls.length === 0) return;
  var btnEl = document.querySelector('#batch-area button');
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '导入中 0/' + urls.length + '...'; }
  var ok = 0;
  for (var i = 0; i < urls.length; i++) {
    if (btnEl) btnEl.textContent = '导入中 ' + (i + 1) + '/' + urls.length + '...';
    try {
      var testRes = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: urls[i] }) });
      if (testRes && testRes.success) {
        var name = (urls[i].match(/@([^:.\/]+)/) ? urls[i].match(/@([^:.\/]+)/)[1] : 'db') + (i + 1);
        await api('/api/databases', { method: 'POST', body: JSON.stringify({ name: name, url: urls[i] }) });
        ok++;
      }
    } catch(e) {}
  }
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = '批量测试并保存'; }
  document.getElementById('batch-input').value = '';
  document.getElementById('batch-area').style.display = 'none';
  alert('导入完成: ' + ok + '/' + urls.length + ' 成功');
  await loadDatabases();
}

// Edit name
async function editName(id, td) {
  var current = td.textContent;
  var input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.style.width = '100%';
  input.style.padding = '2px 6px';
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();
  var save = async function() {
    var val = input.value.trim();
    if (val && val !== current) {
      await api('/api/databases/' + id, { method: 'PUT', body: JSON.stringify({ name: val }) });
      await loadDatabases();
    } else {
      td.textContent = current;
    }
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') { e.preventDefault(); await save(); }
    if (e.key === 'Escape') { td.textContent = current; }
  });
}

// Notification functions
async function loadNotifConfig() {
  var cfg = await api('/api/notifications/config');
  if (!cfg) return;
  if (cfg.telegramBotToken) document.getElementById('tg-token').value = '✓已配置';
  if (cfg.telegramChatId) document.getElementById('tg-chatid').value = cfg.telegramChatId;
  var freqMap = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', never: 'never' };
  if (cfg.reportFrequency && freqMap[cfg.reportFrequency]) {
    document.getElementById('tg-frequency').value = cfg.reportFrequency;
  }
}

async function saveNotifConfig() {
  var token = document.getElementById('tg-token').value;
  var chatId = document.getElementById('tg-chatid').value;
  var freq = document.getElementById('tg-frequency').value;
  var body = { reportFrequency: freq };
  if (token && token !== '✓已配置') body.telegramBotToken = token;
  if (chatId) body.telegramChatId = chatId;
  var res = await api('/api/notifications/config', { method: 'POST', body: JSON.stringify(body) });
  document.getElementById('notif-status').textContent = res && res.ok ? '✅ 已保存' : '❌ 保存失败';
  setTimeout(function() { document.getElementById('notif-status').textContent = ''; }, 2000);
}

async function testNotif() {
  var res = await api('/api/notifications/test', { method: 'POST' });
  document.getElementById('notif-status').textContent = res && res.ok ? '✅ 已发送' : '❌ ' + (res ? res.error : '失败');
  setTimeout(function() { document.getElementById('notif-status').textContent = ''; }, 3000);
}

// Guide
function closeGuide() {
  localStorage.setItem('guide-done', 'true');
}

// Providers toggle
function toggleProviders() {}

// Close modal
function closeModal() {}

// Toggle settings
function toggleSettings() {
  var panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') loadNotifConfig();
}

// Init
document.getElementById('login-key').addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
if (adminKey) {
  document.title = 'DB Keep-Alive Manager';
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  refreshAll();
  setInterval(refreshAll, 30000);
}
</script>
</body>
</html>`;
}
