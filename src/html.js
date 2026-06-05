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
.db-table input { width: 100%; padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 5px; font-size: 12px; font-family: "SF Mono","Fira Code",monospace; }
.db-table input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
.status { font-size: 13px; }
.status.ok { color: #039855; }
.status.fail { color: #dc2626; }
.status.none { color: #98a2b3; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }
.status.ok .status-dot { background: #039855; }
.status.fail .status-dot { background: #dc2626; }
.status.none .status-dot { background: #d0d5dd; }
tr.configured { cursor: pointer; }
tr.configured:hover { background: #f9fafb; }
.prov-name { font-weight: 500; }
.prov-quota { font-size: 11px; color: #98a2b3; margin-left: 4px; }
.detail-row { display: none; }
.detail-row.open { display: table-row; }
.detail-row td { background: #f9fafb; padding: 12px 16px; }
.detail-box { font-size: 12px; }
.detail-box .field { margin-bottom: 6px; }
.detail-box .label { color: #667085; display: inline-block; width: 70px; }
.detail-box .value { font-family: "SF Mono","Fira Code",monospace; color: #1d2939; word-break: break-all; }
.detail-box .cpy { color: #6366f1; cursor: pointer; font-size: 11px; margin-left: 6px; }
.actions-cell { white-space: nowrap; }
.actions-cell button { background: none; border: 1px solid transparent; border-radius: 4px; padding: 2px 5px; cursor: pointer; font-size: 13px; }
.actions-cell button:hover { background: #f2f4f7; border-color: #d0d5dd; }
.actions-cell .del:hover { background: #fef2f2; border-color: #fecaca; }
.provider-row td { border-bottom-color: #eaecf0; }
.get-link { color: #6366f1; font-size: 12px; cursor: pointer; text-decoration: none; }
.get-link:hover { text-decoration: underline; }
.btn-test { background: #fff; color: #344054; border: 1px solid #d0d5dd; border-radius: 5px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
.btn-test:hover { background: #f2f4f7; }
tr.divider td { border-bottom: 2px solid #eaecf0; padding: 0; height: 0; }
.tooltip { position: relative; display: inline-block; cursor: help; }
.tooltip .tip { visibility: hidden; opacity: 0; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #1d2939; color: #fff; padding: 5px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; transition: .15s; z-index: 10; }
.tooltip:hover .tip { visibility: visible; opacity: 1; }
.tooltip .tip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: #1d2939; }
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
</style>
</head>
<body>
<div class="container" id="app">

  <!-- Login overlay -->
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
    <div id="debug-bar" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:13px;color:#dc2626"></div>
    <div class="header">
      <h1>⚡ DB Keep-Alive Manager</h1>
      <div style="display:flex;gap:4px">
        <button onclick="toggleSettings()" title="设置">⚙️</button>
        <button onclick="logout()">退出</button>
      </div>
    </div>

    <!-- Database table -->
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
            <th style="width:30%">数据库</th>
            <th style="width:40%">连接串/状态</th>
            <th style="width:12%">保活</th>
            <th style="width:18%">操作</th>
          </tr>
        </thead>
        <tbody id="db-tbody"></tbody>
      </table>
    </div>

    <!-- Log bar -->
    <div id="log-bar" style="margin-top:8px;padding-top:8px;border-top:1px solid #eaecf0;font-size:12px;color:#667085;display:flex;gap:12px;flex-wrap:wrap;min-height:20px"></div>

    <!-- Add form -->
    <div class="card">
      <div style="font-weight:500;margin-bottom:10px">+ 添加数据库</div>
      <input type="text" id="add-url" placeholder="postgresql://user:password@host:5432/database" style="width:100%;padding:6px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:13px;font-family:monospace;margin-bottom:8px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" id="add-name" placeholder="名称" style="flex:1;min-width:100px;padding:5px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:13px">
        <select id="add-template" style="padding:5px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:12px">
          <option value="">自定义</option>
          <option value="supabase">Supabase</option>
          <option value="neon">Neon</option>
          <option value="render">Render</option>
          <option value="aiven">Aiven</option>
        </select>
        <button class="btn btn-outline" onclick="fillTemplate()" style="font-size:12px;padding:4px 10px">填入</button>
        <button class="btn btn-primary" onclick="testAdd()" style="font-size:12px;padding:5px 12px">测试并保存</button>
        <span id="add-status" style="font-size:12px"></span>
      </div>
    </div>

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
// Provider definitions
var PROVIDERS = [
  { id: 'supabase', name: 'Supabase', quota: '500MB', url: 'https://supabase.com/dashboard/project/_/settings/database' },
  { id: 'neon', name: 'Neon', quota: '500MB', url: 'https://console.neon.tech/app/projects/_/connection_details' },
  { id: 'render', name: 'Render', quota: '1GB', url: 'https://dashboard.render.com/d/u/_/info' },
  { id: 'aiven', name: 'Aiven', quota: '5GB', url: 'https://console.aiven.io' },
];

const API = '';
var adminKey = sessionStorage.getItem('adminKey');

// Utility: API wrapper
async function api(path, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.removeItem('adminKey'); location.reload(); return null; }
  return res.json();
}

// Utility: HTML escape

// Override console to show in debug bar
var _log = console.log;
console.log = function() {
  var msg = Array.prototype.join.call(arguments, " ");
  _log(msg);
  dbg(msg);
};
var _error = console.error;
console.error = function() {
  var msg = Array.prototype.join.call(arguments, " ");
  _error(msg);
  dbg("❌ " + msg);
};

function esc(s) { return String(s).replace(/[&<>"]/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

// Utility: format relative time
function formatRelativeTime(ts) {
  if (!ts) return '-';
  var diff = Date.now() - ts;
  var seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + '分钟前';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '小时前';
  var days = Math.floor(hours / 24);
  return days + '天前';
}

// Match a URL to a provider
function matchProvider(url) {
  if (!url) return null;
  var u = String(url).toLowerCase();
  for (var i = 0; i < PROVIDERS.length; i++) {
    if (u.includes(PROVIDERS[i].id)) return PROVIDERS[i];
  }
  return null;
}

// Login
async function login() {
  var key = document.getElementById('login-key').value;
  if (!key) return;
  document.getElementById('login-btn').disabled = true;
  document.getElementById('login-error').style.display = 'none';
  var res = await api('/api/auth', { method: 'POST', body: JSON.stringify({ key: key }) });
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

// Refresh all data
async function refreshAll() {
  await loadDatabases();
  await loadLogs();
}

// Load databases and render table
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
  var html = '';
  var ok = 0;
  var usedProviders = {};
  for (var i = 0; i < PROVIDERS.length; i++) {
    usedProviders[PROVIDERS[i].id] = false;
  }

  // Render configured rows
  for (var i = 0; i < dbs.length; i++) {
    var db = dbs[i];
    if (db.lastSuccess === true) ok++;

    var matchUrl = db.url || db.displayUrl || '';
    var prov = matchProvider(matchUrl);
    var provName = prov ? prov.name : '数据库';
    var provQuota = prov ? prov.quota : '';
    if (prov) usedProviders[prov.id] = true;

    var cls = db.lastSuccess === null ? 'none' : db.lastSuccess ? 'ok' : 'fail';
    var txt = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '正常' : '失败';
    var detailId = 'detail-' + db.id;

    // Build status text with relative time
    var statusTxt = txt;
    if (db.lastSuccess === true && db.lastPingAt) {
      statusTxt += ' \\u00b7 ' + formatRelativeTime(db.lastPingAt);
    }

    html += '<tr class="configured" onclick="toggleDetail(\\'' + detailId + '\\')">' +
      '<td><span class="prov-name">' + esc(provName) + '</span>' +
      (provQuota ? '<span class="prov-quota">' + esc(provQuota) + '</span>' : '') +
      (db.anonKey ? ' <span style="font-size:10px;color:#6366f1">\\ud83d\\udd11</span>' : '') +
      '</td>' +
      '<td><span class="status ' + cls + '"><span class="status-dot"></span>' + statusTxt + '</span>' +
      (db.lastError ? '<span class="tooltip" style="margin-left:4px">\\u24d8<span class="tip">' + esc(db.lastError) + '</span></span>' : '') +
      '</td>' +
      '<td><span style="font-size:11px;color:#98a2b3">\\u2b50 \\u23ce</span></td>' +
      '<td class="actions-cell">' +
        '<button onclick="event.stopPropagation();pingOne(\\'' + db.id + '\\')" title="\\u26a1">\\u26a1</button>' +
        (db.consoleUrl ? '<button onclick="event.stopPropagation();window.open(\\'' + esc(db.consoleUrl) + '\\',\\'_blank\\')" title="\\ud83d\\udd17">\\ud83d\\udd17</button>' : '') +
        '<button class="del" onclick="event.stopPropagation();deleteDb(\\'' + db.id + '\\')" title="\\u2716">\\u2716</button>' +
      '</td></tr>' +
      '<tr class="detail-row" id="' + detailId + '">' +
        '<td colspan="4"><div class="detail-box">' +
          '<div class="field"><span class="label">\\u540d\\u79f0</span>' +
            '<input type="text" value="' + esc(db.name) + '" style="width:200px;display:inline;font-family:inherit" id="name-input-' + db.id + '">' +
            '<button class="btn-test" style="padding:2px 8px;margin-left:4px" onclick="saveName(\\'' + db.id + '\\')">\\u4fdd\\u5b58</button></div>' +
          '<div class="field"><span class="label">\\u8fde\\u63a5\\u4e32</span><span class="value' + (db.anonKey ? ' detail-url' : ' detail-url') + '">' + esc(db.displayUrl || '') + '</span>' +
            '<span class="cpy" onclick="copyDetailUrl(\\'' + db.id + '\\')">\\ud83d\\udccb \\u590d\\u5236</span></div>' +
          (db.anonKey ? '<div class="field"><span class="label">anon key</span><span class="value">\\u2713 \\u5df2\\u914d\\u7f6e</span></div>' : '') +
          (db.consoleUrl ? '<div class="field"><span class="label">\\u7ba1\\u7406\\u540e\\u53f0</span><span class="value" style="color:#6366f1;cursor:pointer" onclick="window.open(\\'' + esc(db.consoleUrl) + '\\',\\'_blank\\')">' + esc(db.consoleUrl) + ' \\u2192</span></div>' : '') +
          (db.lastError ? '<div class="field"><span class="label">\\u6700\\u8fd1\\u9519\\u8bef</span><span class="value" style="color:#dc2626">' + esc(db.lastError) + '</span></div>' : '') +
          '<div style="margin-top:8px"><span style="color:#dc2626;font-size:11px;cursor:pointer" onclick="if(confirm(\\'\\u786e\\u5b9a\\u5220\\u9664\\uff1f\\')){deleteDb(\\'' + db.id + '\\')}">\\u5220\\u9664\\u6b64\\u6570\\u636e\\u5e93</span></div>' +
        '</div></td>' +
      '</tr>';
  }

  // Divider
  if (dbs.length > 0) {
    html += '<tr class="divider"><td colspan="4"></td></tr>';
  }

  // Render provider template rows for unconfigured providers
  for (var i = 0; i < PROVIDERS.length; i++) {
    if (!usedProviders[PROVIDERS[i].id]) {
      html += '<tr class="provider-row">' +
        '<td><span class="prov-name">' + esc(PROVIDERS[i].name) + '</span><span class="prov-quota">' + esc(PROVIDERS[i].quota) + '</span></td>' +
        '<td><input type="text" placeholder="\\u7c98\\u8d34\\u8fde\\u63a5\\u4e32..." oninput="onUrlInput(this)" /></td>' +
        '<td><button class="btn-test" onclick="testRow(this)">\\u6d4b\\u8bd5</button></td>' +
        '<td><a class="get-link" href="#" onclick="window.open(\\'' + esc(PROVIDERS[i].url) + '\\',\\'_blank\\');return false">\\ud83d\\udc49\\u83b7\\u53d6</a></td>' +
        '</tr>';
    }
  }

  // Custom row (always shown)
  html += '<tr class="provider-row" style="border-top:1px dashed #d0d5dd">' +
    '<td><span class="prov-name" style="color:#98a2b3">\\u81ea\\u5b9a\\u4e49</span></td>' +
    '<td><input type="text" placeholder="\\u5176\\u4ed6 PostgreSQL \\u8fde\\u63a5\\u4e32..." oninput="onUrlInput(this)" /></td>' +
    '<td><button class="btn-test" onclick="testRow(this)">\\u6d4b\\u8bd5</button></td>' +
    '<td></td></tr>';

  tbody.innerHTML = html;

  // Update status summary
  document.getElementById('status-summary').textContent = '(' + ok + '/' + dbs.length + ' \\u6b63\\u5e38)';
  document.title = 'DB Keep-Alive (' + ok + '/' + dbs.length + ')';
  var countBtn = document.getElementById('ping-all-btn');
  if (countBtn && dbs.length > 0) {
    countBtn.textContent = '\\u26a1 \\u4fdd\\u6d3b\\u5168\\u90e8 (' + dbs.length + ')';
  }
}

// Toggle detail row expand/collapse
function toggleDetail(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// Detect URL on input in provider row
function onUrlInput(input) {
  var val = input.value;
  if (val.length > 15) {
    if (val.includes('supabase') || val.includes('pooler.supabase')) {
      input.style.borderColor = '#f59e0b';
      input.title = '\\u68c0\\u6d4b\\u5230 Supabase\\uff0c\\u53ef\\u80fd\\u9700\\u8981 anon key';
    } else if (val.includes('neon.tech')) {
      input.style.borderColor = '#039855';
      input.title = '\\u2705 Neon \\u76f4\\u8fde\\u4fdd\\u6d3b';
    } else if (val.includes('render.com')) {
      input.style.borderColor = '#f59e0b';
      input.title = '\\u26a0\\ufe0f Render \\u8bf7\\u4f7f\\u7528 External URL';
    } else {
      input.style.borderColor = '#6366f1';
      input.title = '';
    }
  } else {
    input.style.borderColor = '#d0d5dd';
    input.title = '';
  }
}

// Test URL from a provider/custom row, then save if successful
async function testRow(btn) {
  var tr = btn.closest('tr');
  var input = tr.querySelector('input[type="text"]');
  var url = input.value.trim();
  if (!url) return;
  btn.disabled = true;
  btn.textContent = '\\u6d4b\\u8bd5\\u4e2d...';
  var res = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: url }) });
  var resetBtn = function() {
    btn.textContent = '\\u6d4b\\u8bd5';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.disabled = false;
  };
  if (res && res.success) {
    btn.textContent = '\\u2705';
    btn.style.background = '#ecfdf5';
    btn.style.color = '#039855';
    btn.style.borderColor = '#a7f3d0';
    var name = url.match(/@([^:.\\/]+)/) ? url.match(/@([^:.\\/]+)/)[1] : 'db';
    var saveRes = await api('/api/databases', { method: 'POST', body: JSON.stringify({ name: name, url: url }) });
    if (saveRes && saveRes.ok) {
      await loadDatabases();
    } else {
      resetBtn();
    }
  } else {
    btn.textContent = '\\u274c ' + (res && res.error ? res.error : '\\u8fde\\u63a5\\u5931\\u8d25');
    btn.style.background = '#fef2f2';
    btn.style.color = '#dc2626';
    btn.style.borderColor = '#fecaca';
    setTimeout(resetBtn, 2500);
  }
}

// Ping single database
async function pingOne(id) {
  await api('/api/ping/' + id, { method: 'POST' });
  await refreshAll();
}

// Ping all databases
async function pingAll() {
  var btn = document.getElementById('ping-all-btn');
  btn.disabled = true;
  btn.textContent = '\\u4fdd\\u6d3b\\u4e2d...';
  await api('/api/ping', { method: 'POST' });
  btn.disabled = false;
  btn.textContent = '\\u26a1 \\u4fdd\\u6d3b\\u5168\\u90e8';
  await refreshAll();
}

// Delete a database
async function deleteDb(id) {
  if (!confirm('\\u786e\\u5b9a\\u5220\\u9664\\uff1f')) return;
  await api('/api/databases/' + id, { method: 'DELETE' });
  await loadDatabases();
}

// Save name edit from detail row
async function saveName(id) {
  var input = document.getElementById('name-input-' + id);
  if (!input) return;
  var val = input.value.trim();
  if (val) {
    await api('/api/databases/' + id, { method: 'PUT', body: JSON.stringify({ name: val }) });
    await loadDatabases();
  }
}

// Copy URL from detail row
function copyDetailUrl(id) {
  var detail = document.getElementById('detail-' + id);
  if (!detail) return;
  var val = detail.querySelector('.detail-box .value');
  if (!val) return;
  var url = val.textContent;
  navigator.clipboard.writeText(url).then(function() {
    var cpy = val.parentElement.querySelector('.cpy');
    if (cpy) {
      var orig = cpy.textContent;
      cpy.textContent = '\\u2705';
      setTimeout(function() { cpy.textContent = orig; }, 1000);
    }
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
  if (logs.length === 0) { bar.innerHTML = '<span style="color:#98a2b3">\\u6682\\u65e0\\u4fdd\\u6d3b\\u65e5\\u5fd7</span>'; return; }
  bar.innerHTML = '\\ud83d\\udccb ' + logs.slice(0, 6).map(function(log) {
    return '<span style="display:inline-flex;gap:4px;align-items:center">' +
    '<span style="color:#98a2b3;font-family:monospace;font-size:11px">' + formatRelativeTime(log.timestamp) + '</span> ' +
    '<span style="color:' + (log.success ? '#039855' : '#dc2626') + '">' +
    (log.success ? '\\u2705' : '\\u274c') + ' ' + esc(log.name || log.dbName) +
    (log.error ? ' (' + esc(log.error.substring(0, 30)) + ')' : '') +
    '</span></span>';
  }).join(' | ');
}

// Export data
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

// Import data
async function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async function() {
    try {
      var text = await input.files[0].text();
      JSON.parse(text);
      var res = await api('/api/import', { method: 'POST', body: text });
      if (res && res.ok) {
        alert('\\u5bfc\\u5165\\u6210\\u529f\\uff1a' + res.count + ' \\u4e2a\\u6570\\u636e\\u5e93');
        refreshAll();
      }
    } catch(e) {
      alert('\\u5bfc\\u5165\\u5931\\u8d25\\uff1a' + e.message);
    }
  };
  input.click();
}

// Toggle batch import area
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

// Batch import
async function batchImport() {
  var text = document.getElementById('batch-input').value.trim();
  if (!text) return;
  var urls = text.split('\\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 10; });
  if (urls.length === 0) return;
  var btnEl = document.querySelector('#batch-area button');
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '\\u5bfc\\u5165\\u4e2d 0/' + urls.length + '...'; }
  var ok = 0;
  for (var i = 0; i < urls.length; i++) {
    if (btnEl) btnEl.textContent = '\\u5bfc\\u5165\\u4e2d ' + (i + 1) + '/' + urls.length + '...';
    try {
      var testRes = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: urls[i] }) });
      if (testRes && testRes.success) {
        var name = (urls[i].match(/@([^:.\\/]+)/) ? urls[i].match(/@([^:.\\/]+)/)[1] : 'db') + (i + 1);
        await api('/api/databases', { method: 'POST', body: JSON.stringify({ name: name, url: urls[i] }) });
        ok++;
      }
    } catch(e) {}
  }
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = '\\u6279\\u91cf\\u6d4b\\u8bd5\\u5e76\\u4fdd\\u5b58'; }
  document.getElementById('batch-input').value = '';
  document.getElementById('batch-area').style.display = 'none';
  alert('\\u5bfc\\u5165\\u5b8c\\u6210: ' + ok + '/' + urls.length + ' \\u6210\\u529f');
  await loadDatabases();
}

// Notification config
async function loadNotifConfig() {
  var cfg = await api('/api/notifications/config');
  if (!cfg) return;
  if (cfg.telegramBotToken) document.getElementById('tg-token').value = '\\u2713\\u5df2\\u914d\\u7f6e';
  if (cfg.telegramChatId) document.getElementById('tg-chatid').value = cfg.telegramChatId;
  if (cfg.reportFrequency && ['daily','weekly','monthly','never'].indexOf(cfg.reportFrequency) !== -1) {
    document.getElementById('tg-frequency').value = cfg.reportFrequency;
  }
}

async function saveNotifConfig() {
  var token = document.getElementById('tg-token').value;
  var chatId = document.getElementById('tg-chatid').value;
  var freq = document.getElementById('tg-frequency').value;
  var body = { reportFrequency: freq };
  if (token && token !== '\\u2713\\u5df2\\u914d\\u7f6e') body.telegramBotToken = token;
  if (chatId) body.telegramChatId = chatId;
  var res = await api('/api/notifications/config', { method: 'POST', body: JSON.stringify(body) });
  document.getElementById('notif-status').textContent = res && res.ok ? '\\u2705 \\u5df2\\u4fdd\\u5b58' : '\\u274c \\u4fdd\\u5b58\\u5931\\u8d25';
  setTimeout(function() { document.getElementById('notif-status').textContent = ''; }, 2000);
}

async function testNotif() {
  var res = await api('/api/notifications/test', { method: 'POST' });
  document.getElementById('notif-status').textContent = res && res.ok ? '\\u2705 \\u5df2\\u53d1\\u9001' : '\\u274c ' + (res ? res.error : '\\u5931\\u8d25');
  setTimeout(function() { document.getElementById('notif-status').textContent = ''; }, 3000);
}

// Settings panel toggle
function toggleSettings() {
  var panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') loadNotifConfig();
}

// Guide close
function closeGuide() {
  localStorage.setItem('guide-done', 'true');
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
var TEMPLATES = { supabase: "postgresql://postgres.<project_ref>:<password>@aws-0-region.pooler.supabase.com:5432/postgres", neon: "postgresql://<user>:<password>@ep-<slug>.us-east-2.aws.neon.tech/neondb", render: "postgresql://<user>:<password>@<instance>.render.com/<database>", aiven: "postgresql://<user>:<password>@<project>.aivencloud.com:<port>/<database>" };

function fillTemplate() {
  var t = document.getElementById("add-template").value;
  if (t && TEMPLATES[t]) document.getElementById("add-url").value = TEMPLATES[t];
}


function dbg(msg) {
  var bar = document.getElementById("debug-bar");
  if (bar) { bar.style.display = "block"; bar.innerHTML = "🔍 " + msg; }
}

async function testAdd() {
  try {
    var url = document.getElementById("add-url").value.trim();
    if (!url) { console.log("testAdd: empty url"); return; }
    var btn = document.getElementById("test-add-btn");
    if (!btn) { console.error("testAdd: button not found"); return; }
    var st = document.getElementById("add-status");
    btn.disabled = true; btn.textContent = "测试中...";
    console.log("testAdd: testing " + url.substring(0, 40) + "...");
    var res = await api("/api/databases/test", { method: "POST", body: JSON.stringify({ url: url }) });
    console.log("testAdd: result " + JSON.stringify(res).substring(0, 100));
    if (res && res.success) {
      var name = document.getElementById("add-name").value.trim() || url.match(/@([^:.]+)/)?.[1] || "db";
      var body = { name: name, url: url };
      var saved = await api("/api/databases", { method: "POST", body: JSON.stringify(body) });
      if (saved && saved.ok) {
        st.innerHTML = "✅ " + (saved.name || "成功");
        document.getElementById("add-url").value = "";
        document.getElementById("add-name").value = "";
        await loadDatabases();
      } else { st.innerHTML = "❌ 保存失败"; }
    } else {
      st.innerHTML = "❌ " + (res ? (res.error || res.note || "未知错误") : "连接失败");
    }
    btn.disabled = false; btn.textContent = "测试并保存";
  } catch(e) {
    console.error("testAdd:", e);
    var st = document.getElementById("add-status");
    if (st) st.innerHTML = "❌ " + e.message;
    var btn = document.getElementById("test-add-btn");
    if (btn) { btn.disabled = false; btn.textContent = "测试并保存"; }
  }
}

</script>
</body>
</html>`;
}
