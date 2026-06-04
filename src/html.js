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
.db-table th { position: relative; }
.db-table th:after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 4px; cursor: col-resize; }
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

  <!-- First-time Guide -->
  <div id="guide-overlay" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:300">
    <div style="background:#fff;border-radius:16px;padding:32px;width:420px;max-width:90vw;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2)">
      <div style="font-size:40px;margin-bottom:12px">🚀</div>
      <h2 style="font-size:18px;margin-bottom:8px">欢迎使用 DB Keep-Alive Manager</h2>
      <p style="font-size:14px;color:#667085;margin-bottom:20px;line-height:1.6">
        三步开始保活你的数据库：
      </p>
      <div style="text-align:left;font-size:14px;line-height:2;margin-bottom:24px">
        <div>1️⃣ 从上方卡片获取免费数据库连接串</div>
        <div>2️⃣ 粘贴到表格底部输入框，点测试</div>
        <div>3️⃣ 系统自动每10分钟保活全部</div>
      </div>
      <div style="font-size:13px;color:#98a2b3;margin-bottom:16px">
        💡 还可以配置 Telegram 通知，保活异常即时推送
      </div>
      <button class="btn btn-primary" onclick="closeGuide()" style="width:100%;justify-content:center">开始使用</button>
      <label style="display:block;margin-top:12px;font-size:12px;color:#98a2b3">
        <input type="checkbox" id="guide-dont-show"> 不再显示
      </label>
    </div>
  </div>

  <!-- Dashboard -->
  <div id="dashboard-view" class="hidden">
    <div class="header">
      <h1>⚡ DB Keep-Alive Manager</h1>
      <button onclick="logout()">退出</button>
    </div>

    <!-- Fail Banner -->
    <div id="fail-banner" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:13px;color:#dc2626;display:none">
      <span id="fail-msg"></span>
      <button onclick="this.parentElement.style.display='none'" style="float:right;background:none;border:none;cursor:pointer;color:#dc2626">✕</button>
    </div>

    <!-- Provider Cards -->
    <div class="card">
      <h2 onclick="toggleProviders()" style="cursor:pointer;user-select:none">📦 免费 PostgreSQL 数据库 <span id="prov-toggle" style="font-size:12px;color:#98a2b3">▲</span></h2>
      <div id="providers-wrap" class="providers">
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
        <button class="btn btn-outline" onclick="exportData()" title="导出配置" style="font-size:11px;padding:3px 8px">📤</button>
        <button class="btn btn-outline" onclick="importData()" title="导入配置" style="font-size:11px;padding:3px 8px">📥</button>
        <button class="btn btn-primary" onclick="pingAll()" id="ping-all-btn" style="font-size:12px;padding:5px 12px">⚡ 保活全部</button>
        <button class="btn btn-outline" onclick="toggleNotif()" id="notif-toggle-btn" style="font-size:12px;padding:3px 8px">🔔</button>
        <button class="btn btn-outline" onclick="toggleBatch()" style="font-size:12px;padding:3px 8px" title="批量导入">📋</button>
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
      <div id="empty-state" class="hidden" style="text-align:center;padding:32px 0;color:#98a2b3">
        <div style="font-size:48px;margin-bottom:12px">🗄️</div>
        <div style="font-size:15px;font-weight:500;color:#667085;margin-bottom:8px">还没有添加数据库</div>
        <div style="font-size:13px;line-height:1.8">
          1. 从左侧 Provider 卡片获取免费数据库<br>
          2. 粘贴连接串到底部输入框<br>
          3. 点击"测试"自动保存并开始保活
        </div>
      </div>
    </div>

    <!-- Logs -->
    <div class="card">
      <h2>📋 保活日志</h2>
      <div id="logs-wrapper" class="log-list">
        <div style="color:#98a2b3;font-size:13px;text-align:center;padding:12px 0">暂无日志</div>
      </div>
    </div>

    <!-- Notification Settings -->
    <div class="card" id="notif-card" style="display:none">
      <h2>🔔 通知设置 <span style="font-size:12px;font-weight:400;color:#667085">Telegram Bot</span></h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;color:#344054">Bot Token</label>
          <input type="password" id="tg-token" placeholder="123456:ABC-DEF..." style="font-size:13px;padding:6px 8px">
        </div>
        <div>
          <label style="font-size:12px;color:#344054">Chat ID</label>
          <input type="text" id="tg-chatid" placeholder="123456789" style="font-size:13px;padding:6px 8px">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap">
        <select id="tg-frequency" style="font-size:12px;padding:4px 8px;border:1px solid #d0d5dd;border-radius:5px">
          <option value="daily">每日报告</option>
          <option value="weekly">每周报告</option>
          <option value="monthly">每月报告</option>
          <option value="never">不推送</option>
        </select>
        <select id="tg-report-time" style="font-size:12px;padding:4px 8px;border:1px solid #d0d5dd;border-radius:5px">
          <option value="9">09:00 推送</option>
          <option value="12">12:00 推送</option>
          <option value="18">18:00 推送</option>
          <option value="21">21:00 推送</option>
        </select>
        <button class="btn btn-outline" onclick="saveNotifConfig()" style="font-size:12px;padding:4px 10px">保存</button>
        <button class="btn btn-outline" onclick="testNotif()" style="font-size:12px;padding:4px 10px">测试通知</button>
        <span id="notif-status" style="font-size:12px;color:#667085"></span>
      </div>
    </div>
  </div>

  <!-- Provider Modal -->
  <div id="provider-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:200">
    <div style="background:#fff;border-radius:12px;padding:24px;width:360px;max-width:90vw;box-shadow:0 8px 30px rgba(0,0,0,0.12)">
      <h3 id="modal-title" style="font-size:16px;margin-bottom:12px"></h3>
      <div id="modal-body" style="font-size:14px;line-height:1.8;color:#344054;white-space:pre-line"></div>
      <div style="margin-top:16px;text-align:right">
        <button class="btn btn-primary" onclick="closeModal()" style="font-size:13px;padding:6px 16px">知道了</button>
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
    setTimeout(() => {
      const el = document.getElementById('new-url');
      if (el) el.focus();
    }, 500);
  } else {
    document.getElementById('login-error').textContent = '密钥错误，请重试';
    document.getElementById('login-error').style.display = 'block';
  }
}

function logout() { sessionStorage.removeItem('adminKey'); adminKey = null; location.reload(); }

// Provider info
function showProviderInfo(provider) {
  const guides = {
    supabase: { title: 'Supabase 免费版', body: '额度: 500MB PostgreSQL\\n自动暂停: 7 天无活动\\n\\n获取连接串:\\n1. 登录 supabase.com\\n2. 新建项目\\n3. Project Settings → Database → Connection string → 复制 URI', link: 'https://supabase.com' },
    neon: { title: 'Neon 免费版', body: '额度: 500MB PostgreSQL\\n自动暂停: 1 小时无活动\\n\\n获取连接串:\\n1. 登录 console.neon.tech\\n2. 新建项目\\n3. Dashboard → Connection Details → 复制', link: 'https://console.neon.tech' },
    render: { title: 'Render 免费版', body: '额度: 1GB PostgreSQL\\n自动暂停: 15 分钟无活动\\n\\n获取连接串:\\n1. 登录 dashboard.render.com\\n2. New PostgreSQL\\n3. 创建后复制 Internal Database URL', link: 'https://dashboard.render.com' },
    aiven: { title: 'Aiven 免费版', body: '额度: 5GB PostgreSQL\\n自动暂停: 无(始终运行)\\n\\n获取连接串:\\n1. 登录 console.aiven.io\\n2. 创建服务 → PostgreSQL\\n3. Connection Info → 复制 URI', link: 'https://console.aiven.io' }
  };
  const info = guides[provider];
  if (!info) return;
  document.getElementById('modal-title').textContent = info.title;
  document.getElementById('modal-body').textContent = info.body;
  document.getElementById('provider-modal').classList.remove('hidden');
  document.getElementById('provider-modal').style.display = 'flex';
  window.open(info.link, '_blank');
}

function closeModal() {
  document.getElementById('provider-modal').classList.add('hidden');
  document.getElementById('provider-modal').style.display = 'none';
}

// Refresh all data
async function refreshAll() {
  const dbs = await api('/api/databases');
  if (!dbs) return;
  const failed = dbs.filter(d => d.lastSuccess === false);
  const banner = document.getElementById('fail-banner');
  if (failed.length > 0) {
    banner.style.display = 'block';
    document.getElementById('fail-msg').textContent = '⚠️ ' + failed.length + ' 个数据库保活异常';
  } else {
    banner.style.display = 'none';
  }
  await loadDatabases();
  await loadLogs();
}

// Load databases
async function loadDatabases() {
  const dbs = await api('/api/databases');
  if (!dbs) return;
  // Sort: failed first, then never-pinged, then healthy
  dbs.sort((a, b) => {
    const getPriority = (db) => {
      if (db.lastSuccess === false) return 0;
      if (db.lastSuccess === null) return 1;
      return 2;
    };
    return getPriority(a) - getPriority(b);
  });
  const tbody = document.getElementById('db-tbody');
  const empty = document.getElementById('empty-state');

  let html = '';
  let ok = 0;
  const total = dbs.length;
  for (const db of dbs) {
    if (db.lastSuccess === true) ok++;
    const cls = db.lastSuccess === null ? 'status-none' : db.lastSuccess ? 'status-ok' : 'status-fail';
    const txt = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '正常' : '失败';
    html += '<tr>' +
      '<td class="url-cell" title="' + esc(db.displayUrl || '') + '">' + esc(truncate(db.displayUrl || '', 55)) + '</td>' +
      '<td ondblclick="editName(\\'' + db.id + '\\',this)" title="双击编辑">' + esc(db.name) + '</td>' +
      '<td>' + esc(db.type || 'postgres') + '</td>' +
      '<td class="' + cls + '"><span class="status-dot"></span>' + txt + '</td>' +
      '<td>' +
        '<button class="btn-icon" onclick="pingOne(\\'' + db.id + '\\')" title="保活">⚡</button>' +
        (db.consoleUrl ? '<button class="btn-icon" onclick="window.open(\\'' + esc(db.consoleUrl) + '\\',\\'_blank\\')" title="打开后台">🔗</button>' : '') +
        '<button class="btn-icon" onclick="copyUrl(\\'' + esc(db.displayUrl || '') + '\\')" title="复制连接串">📋</button>' +
        '<button class="btn-icon danger" onclick="deleteDb(\\'' + db.id + '\\')" title="删除">✕</button>' +
      '</td></tr>';
  }

  // New row (Excel style - always blank at bottom)
  html += '<tr>' +
    '<td><input type="text" id="new-url" placeholder="粘贴连接串..." oninput="onPasteUrl(this.value)" onkeydown="if(event.key===\\'Enter\\')testNew()"></td>' +
    '<td><span id="new-name" style="color:#98a2b3;font-size:12px">自动识别</span></td>' +
    '<td><span id="new-type" style="color:#98a2b3;font-size:12px">-</span></td>' +
    '<td><span id="new-status"></span></td>' +
    '<td><button class="btn btn-outline" onclick="testNew()" id="test-new-btn" style="font-size:12px;padding:3px 8px">测试</button></td>' +
    '</tr>';

  // Batch paste toggle
  html += '<tr id="batch-row" style="display:none">' +
    '<td colspan="5"><textarea id="batch-input" rows="3" placeholder="每行一个连接串，批量导入..." style="width:100%;padding:6px;border:1px solid #d0d5dd;border-radius:5px;font-family:monospace;font-size:12px"></textarea>' +
    '<button class="btn btn-outline" onclick="batchImport()" style="font-size:12px;margin-top:4px">批量测试并保存</button>' +
    '</td></tr>';

  tbody.innerHTML = html;
  empty.classList.toggle('hidden', dbs.length > 0);
  document.getElementById('status-summary').textContent = '(' + ok + '/' + dbs.length + ' 正常)';
  const countBtn = document.getElementById('ping-all-btn');
  if (countBtn && dbs.length > 0) {
    countBtn.textContent = '⚡ 保活全部 (' + dbs.length + ')';
  }
  document.title = 'DB Keep-Alive (' + ok + '/' + dbs.length + ')';
}

// Paste detection
let detectTimer = null;
async function onPasteUrl(url) {
  clearTimeout(detectTimer);
  if (!url || url.length < 10) return;
  // Basic URL format check
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://') && !url.startsWith('redis://')) {
    document.getElementById('new-type').textContent = '格式?';
    return;
  }
  document.getElementById('new-type').textContent = '检测中...';
  detectTimer = setTimeout(async () => {
    try {
      const info = await api('/api/databases/detect', { method: 'POST', body: JSON.stringify({ url }) });
      if (info && info.detectedName) {
        document.getElementById('new-name').textContent = info.detectedName;
        const typeMap = { 'supabase-http': 'Supabase', postgres: 'PG', redis: 'Redis', 'neon': 'Neon' };
        document.getElementById('new-type').textContent = typeMap[info.type] || info.type || 'PG';
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
    document.getElementById('new-url').focus();
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

// Export
async function exportData() {
  const data = await api('/api/export');
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'db-keepalive-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Import
async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);
      const res = await api('/api/import', { method: 'POST', body: text });
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
  navigator.clipboard.writeText(url).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = orig, 1000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
}

// Load logs
async function loadLogs() {
  const logs = await api('/api/logs');
  if (!logs) return;
  const wrapper = document.getElementById('logs-wrapper');
  if (logs.length === 0) { wrapper.innerHTML = '<div style="color:#98a2b3;text-align:center;padding:12px 0">暂无日志</div>'; return; }
  wrapper.innerHTML = logs.map(log =>
    '<div class="log-entry">' +
    '<span class="log-time">' + formatRelativeTime(log.timestamp) + '</span>' +
    '<span class="log-db">' + esc(log.dbName) + '</span>' +
    '<span class="log-msg ' + (log.success ? 'status-ok' : 'status-fail') + '">' +
    (log.success ? '✅ 成功' : '❌ ' + esc(log.error || '失败')) +
    (log.durationMs ? ' (' + log.durationMs + 'ms)' : '') +
    '</span></div>'
  ).join('');
}

function toggleBatch() {
  const row = document.getElementById('batch-row');
  if (row.style.display === 'none') {
    row.style.display = 'table-row';
    document.getElementById('batch-input').focus();
  } else {
    row.style.display = 'none';
  }
}

async function batchImport() {
  const text = document.getElementById('batch-input').value.trim();
  if (!text) return;
  const urls = text.split('\\n').map(s => s.trim()).filter(s => s.length > 10);
  if (urls.length === 0) return;
  const btn = document.querySelector('#batch-row button');
  btn.disabled = true; btn.textContent = '导入中 0/' + urls.length + '...';
  let ok = 0;
  for (let i = 0; i < urls.length; i++) {
    btn.textContent = '导入中 ' + (i+1) + '/' + urls.length + '...';
    try {
      const testRes = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: urls[i] }) });
      if (testRes && testRes.success) {
        const name = urls[i].match(/@([^:./]+)/)?.[1] || 'db' + (i+1);
        await api('/api/databases', { method: 'POST', body: JSON.stringify({ name, url: urls[i] }) });
        ok++;
      }
    } catch(e) {}
  }
  btn.disabled = false; btn.textContent = '批量测试并保存';
  document.getElementById('batch-input').value = '';
  document.getElementById('batch-row').style.display = 'none';
  alert('导入完成: ' + ok + '/' + urls.length + ' 成功');
  await loadDatabases();
}

async function editName(id, td) {
  const current = td.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.style.width = '100%';
  input.style.padding = '2px 6px';
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();

  const save = async () => {
    const val = input.value.trim();
    if (val && val !== current) {
      await api('/api/databases/' + id, { method: 'PUT', body: JSON.stringify({ name: val }) });
      await loadDatabases();
    } else {
      td.textContent = current;
    }
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') { e.preventDefault(); await save(); }
    if (e.key === 'Escape') { td.textContent = current; }
  });
}

// Notification functions
function toggleNotif() {
  const card = document.getElementById('notif-card');
  const isHidden = card.style.display === 'none' || card.style.display === '';
  card.style.display = isHidden ? 'block' : 'none';
  if (isHidden) loadNotifConfig();
}

async function loadNotifConfig() {
  const cfg = await api('/api/notifications/config');
  if (!cfg) return;
  if (cfg.telegramBotToken) document.getElementById('tg-token').value = '✓已配置';
  if (cfg.telegramChatId) document.getElementById('tg-chatid').value = cfg.telegramChatId;
  const freqMap = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', never: 'never' };
  if (cfg.reportFrequency && freqMap[cfg.reportFrequency]) {
    document.getElementById('tg-frequency').value = cfg.reportFrequency;
  }
  if (cfg.reportTime) {
    document.getElementById('tg-report-time').value = String(cfg.reportTime);
  }
}

async function saveNotifConfig() {
  const token = document.getElementById('tg-token').value;
  const chatId = document.getElementById('tg-chatid').value;
  const freq = document.getElementById('tg-frequency').value;
  const reportTime = document.getElementById('tg-report-time').value;
  const body = { reportFrequency: freq, reportTime };
  if (token && token !== '✓已配置') body.telegramBotToken = token;
  if (chatId) body.telegramChatId = chatId;
  const res = await api('/api/notifications/config', { method: 'POST', body: JSON.stringify(body) });
  document.getElementById('notif-status').textContent = res && res.ok ? '✅ 已保存' : '❌ 保存失败';
  setTimeout(() => document.getElementById('notif-status').textContent = '', 2000);
}

async function testNotif() {
  const res = await api('/api/notifications/test', { method: 'POST' });
  document.getElementById('notif-status').textContent = res && res.ok ? '✅ 已发送' : '❌ ' + (res?.error || '失败');
  setTimeout(() => document.getElementById('notif-status').textContent = '', 3000);
}

// Guide
function closeGuide() {
  if (document.getElementById('guide-dont-show').checked) {
    localStorage.setItem('guide-done', 'true');
  }
  document.getElementById('guide-overlay').classList.add('hidden');
  document.getElementById('guide-overlay').style.display = 'none';
}

// Providers toggle
function toggleProviders() {
  const wrap = document.getElementById('providers-wrap');
  const toggle = document.getElementById('prov-toggle');
  if (wrap.style.display === 'none') {
    wrap.style.display = 'grid';
    toggle.textContent = '▲';
  } else {
    wrap.style.display = 'none';
    toggle.textContent = '▼';
  }
}

// Init
document.getElementById('login-key').addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
if (adminKey) {
  document.title = 'DB Keep-Alive Manager';
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  refreshAll();
  setInterval(refreshAll, 30000);
  // Show guide for first-time users
  if (!localStorage.getItem('guide-done')) {
    setTimeout(() => {
      document.getElementById('guide-overlay').classList.remove('hidden');
      document.getElementById('guide-overlay').style.display = 'flex';
    }, 800);
  }
}
</script>
</body>
</html>`;
}
