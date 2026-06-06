export const clientCode = String.raw`
var PROVIDERS = [
  { id: 'supabase', name: 'Supabase', quota: '500MB', url: 'https://supabase.com/dashboard/project/_/settings/database' },
  { id: 'neon', name: 'Neon', quota: '500MB', url: 'https://console.neon.tech/app/projects/_/connection_details' },
  { id: 'render', name: 'Render', quota: '1GB/256MB RAM', url: 'https://dashboard.render.com/d/u/_/info' },
  { id: 'aiven', name: 'Aiven', quota: '5GB', url: 'https://console.aiven.io' },
  { id: 'koyeb', name: 'Koyeb', quota: '1GB RAM', url: 'https://app.koyeb.com/' },
  { id: 'railway', name: 'Railway', quota: '免费', url: 'https://railway.app/' },
  { id: 'flyio', name: 'Fly.io', quota: '3GB卷', url: 'https://fly.io/dashboard' },
  { id: 'cockroachdb', name: 'CockroachDB', quota: '免费层', url: 'https://www.cockroachlabs.com/' },
  { id: 'upstash', name: 'Upstash', quota: '256MB/500K命令', url: 'https://console.upstash.com/' },
  { id: 'rediscloud', name: 'Redis Cloud', quota: '30MB', url: 'https://app.redislabs.com/' },
  { id: 'insforge', name: 'InsForge', quota: '500MB', url: 'https://insforge.dev/' },
  { id: 'alibaba-supabase', name: '阿里云 Supabase', quota: '1核2GB', url: 'https://www.alibabacloud.com/help/zh/analyticdb/analyticdb-for-postgresql/supabase/' },
];

const API = '';
var adminKey = sessionStorage.getItem('adminKey');

async function api(path, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { sessionStorage.removeItem('adminKey'); location.reload(); return null; }
  return res.json();
}

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

function matchProvider(url) {
  if (!url) return null;
  var u = String(url).toLowerCase();
  for (var i = 0; i < PROVIDERS.length; i++) {
    if (u.includes(PROVIDERS[i].id)) return PROVIDERS[i];
  }
  return null;
}

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

async function refreshAll() {
  await loadDatabases();
  await loadLogs();
}

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

  if (dbs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px 20px;color:#98a2b3;font-size:13px;line-height:2">' +
      '还没有数据库<br>' +
      '在上方粘贴连接串 → 点击「测试并保存」开始<br><br>' +
      '免费数据库推荐：' +
      '<a href="#" onclick="window.open(\'' + esc('https://supabase.com') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Supabase 500MB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://console.neon.tech') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Neon 500MB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://dashboard.render.com') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Render 1GB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://console.aiven.io') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Aiven 5GB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://app.koyeb.com') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Koyeb 1GB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://railway.app') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Railway</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://fly.io') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">Fly.io 3GB</a> · ' +
      '<a href="#" onclick="window.open(\'' + esc('https://www.cockroachlabs.com') + '\',\'_blank\');return false" style="color:#6366f1;text-decoration:none">CockroachDB</a>' +
      '</td></tr>';
    document.getElementById('status-summary').textContent = '(0/0)';
    document.title = 'DB Keep-Alive Manager';
    return;
  }

  var usedProviders = {};
  for (var i = 0; i < PROVIDERS.length; i++) {
    usedProviders[PROVIDERS[i].id] = false;
  }

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

    var statusTxt = txt;
    if (db.lastSuccess === true && db.lastPingAt) {
      statusTxt += ' · ' + formatRelativeTime(db.lastPingAt);
    }
    if (db.lastNote && db.lastNote === 'TCP reachable') {
      statusTxt += ' <span style="font-size:10px;color:#98a2b3;border:1px solid #d0d5dd;border-radius:3px;padding:0 5px;margin-left:3px">TCP</span>';
    }

    html += '<tr class="configured" onclick="toggleDetail(\'' + detailId + '\')">' +
      '<td><span class="prov-name">' + esc(provName) + '</span>' +
      (provQuota ? '<span class="prov-quota">' + esc(provQuota) + '</span>' : '') +
      (db.anonKey ? ' <span style="font-size:10px;color:#6366f1">🔑</span>' : '') +
      '</td>' +
      '<td><span class="status ' + cls + '"><span class="status-dot"></span>' + statusTxt + '</span>' +
      (db.lastError ? '<span class="tooltip" style="margin-left:4px">ⓘ<span class="tip">' + esc(db.lastError) + '</span></span>' : '') +
      '</td>' +
      '<td><span style="font-size:11px;color:#98a2b3">⭐ ⏎</span></td>' +
      '<td class="actions-cell">' +
        '<button onclick="event.stopPropagation();pingOne(\'' + db.id + '\')" title="⚡">⚡</button>' +
        (db.consoleUrl ? '<button onclick="event.stopPropagation();window.open(\'' + esc(db.consoleUrl) + '\',\'_blank\')" title="🔗">🔗</button>' : '') +
        '<button class="del" onclick="event.stopPropagation();deleteDb(\'' + db.id + '\')" title="✖">✖</button>' +
      '</td></tr>' +
      '<tr class="detail-row" id="' + detailId + '">' +
        '<td colspan="4"><div class="detail-box">' +
          '<div class="field"><span class="label">名称</span>' +
            '<input type="text" value="' + esc(db.name) + '" style="width:200px;display:inline;font-family:inherit" id="name-input-' + db.id + '">' +
            '<button class="btn-test" style="padding:2px 8px;margin-left:4px" onclick="saveName(\'' + db.id + '\')">保存</button></div>' +
          '<div class="field"><span class="label">连接串</span>' +
            '<input type="text" value="' + esc(db.displayUrl || '') + '" style="width:300px;display:inline;font-family:monospace;font-size:11px" id="url-input-' + db.id + '">' +
            '<button class="btn-test" style="padding:2px 8px;margin-left:4px" onclick="saveUrl(\'' + db.id + '\')">保存</button></div>' +
          (db.anonKey ? '<div class="field"><span class="label">anon key</span><span class="value">✓ 已配置</span></div>' : '') +
          (db.consoleUrl ? '<div class="field"><span class="label">管理后台</span><span class="value" style="color:#6366f1;cursor:pointer" onclick="window.open(\'' + esc(db.consoleUrl) + '\',\'_blank\')">' + esc(db.consoleUrl) + ' →</span></div>' : '') +
          (db.lastError ? '<div class="field"><span class="label">最近错误</span><span class="value" style="color:#dc2626">' + esc(db.lastError) + '</span></div>' : '') +
          '<div style="margin-top:8px"><span style="color:#dc2626;font-size:11px;cursor:pointer" onclick="if(confirm(\'确定删除？\')){deleteDb(\'' + db.id + '\')}">删除此数据库</span></div>' +
        '</div></td>' +
      '</tr>';
  }

  if (dbs.length > 0) {
    html += '<tr class="divider"><td colspan="4"></td></tr>';
  }

  for (var i = 0; i < PROVIDERS.length; i++) {
    if (!usedProviders[PROVIDERS[i].id]) {
      html += '<tr class="provider-row">' +
        '<td><span class="prov-name">' + esc(PROVIDERS[i].name) + '</span><span class="prov-quota">' + esc(PROVIDERS[i].quota) + '</span></td>' +
        '<td><input type="text" placeholder="粘贴连接串..." oninput="onUrlInput(this)" /></td>' +
        '<td><button class="btn-test" onclick="testRow(this)">测试</button></td>' +
        '<td><a class="get-link" href="#" onclick="window.open(\'' + esc(PROVIDERS[i].url) + '\',\'_blank\');return false">👉获取</a></td>' +
        '</tr>';
    }
  }

  html += '<tr class="provider-row" style="border-top:1px dashed #d0d5dd">' +
    '<td><span class="prov-name" style="color:#98a2b3">自定义</span></td>' +
    '<td><input type="text" placeholder="其他 PostgreSQL 连接串..." oninput="onUrlInput(this)" /></td>' +
    '<td><button class="btn-test" onclick="testRow(this)">测试</button></td>' +
    '<td></td></tr>';

  tbody.innerHTML = html;

  document.getElementById('status-summary').textContent = '(' + ok + '/' + dbs.length + ' 正常)';
  var lr = document.getElementById('last-refresh');
  if (lr) lr.textContent = '最后检查 ' + formatRelativeTime(Date.now());
  document.title = 'DB Keep-Alive (' + ok + '/' + dbs.length + ')';
  var countBtn = document.getElementById('ping-all-btn');
  if (countBtn && dbs.length > 0) {
    countBtn.textContent = '⚡ 保活全部 (' + dbs.length + ')';
  }
}

function toggleDetail(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function onUrlInput(input) {
  var val = input.value;
  var sel = document.getElementById('add-template');
  if (val.length > 15) {
    if (val.includes('supabase') || val.includes('pooler.supabase')) {
      input.style.borderColor = '#f59e0b';
      input.title = '检测到 Supabase，可能需要 anon key';
      if (sel) sel.value = 'supabase';
    } else if (val.includes('neon.tech')) {
      input.style.borderColor = '#039855';
      input.title = '✅ Neon 直连保活';
      if (sel) sel.value = 'neon';
    } else if (val.includes('render.com')) {
      input.style.borderColor = '#f59e0b';
      input.title = '⚠️ Render 请使用 External URL';
      if (sel) sel.value = 'render';
    } else if (val.includes('aivencloud.com')) {
      input.style.borderColor = '#f59e0b';
      input.title = '⚠️ Aiven 请使用 SSL 连接';
      if (sel) sel.value = 'aiven';
    } else if (val.includes('koyeb.app')) {
      input.style.borderColor = '#039855';
      input.title = '✅ Koyeb 直连保活';
      if (sel) sel.value = 'koyeb';
    } else if (val.includes('railway.app')) {
      input.style.borderColor = '#6366f1';
      input.title = 'Railway PostgreSQL';
      if (sel) sel.value = 'railway';
    } else if (val.includes('fly.io')) {
      input.style.borderColor = '#6366f1';
      input.title = 'Fly.io PostgreSQL';
      if (sel) sel.value = 'flyio';
    } else if (val.includes('cockroachlabs.cloud')) {
      input.style.borderColor = '#f59e0b';
      input.title = '⚠️ CockroachDB 需要 SSL';
      if (sel) sel.value = 'cockroachdb';
    } else if (val.includes('upstash.io')) {
      input.style.borderColor = '#e11d48';
      input.title = '🔴 Upstash Redis';
      if (sel) sel.value = 'upstash';
    } else if (val.includes('redis-cloud.com')) {
      input.style.borderColor = '#e11d48';
      input.title = '🔴 Redis Cloud';
      if (sel) sel.value = 'rediscloud';
    } else if (val.includes('db.insforge.dev')) {
      input.style.borderColor = '#039855';
      input.title = '✅ InsForge 直连保活';
      if (sel) sel.value = 'insforge';
    } else if (val.startsWith('redis://') || val.startsWith('rediss://')) {
      input.style.borderColor = '#e11d48';
      input.title = '🔴 Redis (TCP 保活)';
      if (sel) sel.value = '';
    } else {
      input.style.borderColor = '#6366f1';
      input.title = '';
      if (sel) sel.value = '';
    }
  } else {
    input.style.borderColor = '#d0d5dd';
    input.title = '';
  }
}

async function testRow(btn) {
  var tr = btn.closest('tr');
  var input = tr.querySelector('input[type="text"]');
  var url = input.value.trim();
  if (!url) return;
  btn.disabled = true;
  btn.textContent = '测试中...';
  var res = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: url }) });
  var resetBtn = function() {
    btn.textContent = '测试';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.disabled = false;
  };
  if (res && res.success) {
    btn.textContent = '✅';
    btn.style.background = '#ecfdf5';
    btn.style.color = '#039855';
    btn.style.borderColor = '#a7f3d0';
    var name = url.match(/@([^.:\/]+)/) ? url.match(/@([^.:\/]+)/)[1] : 'db';
    var saveRes = await api('/api/databases', { method: 'POST', body: JSON.stringify({ name: name, url: url }) });
    if (saveRes && saveRes.ok) {
      await loadDatabases();
    } else {
      resetBtn();
    }
  } else {
    btn.textContent = '❌ ' + (res && res.error ? res.error : '连接失败');
    btn.style.background = '#fef2f2';
    btn.style.color = '#dc2626';
    btn.style.borderColor = '#fecaca';
    setTimeout(resetBtn, 2500);
  }
}

async function pingOne(id) {
  await api('/api/ping/' + id, { method: 'POST' });
  await refreshAll();
}

async function pingAll() {
  var btn = document.getElementById('ping-all-btn');
  btn.disabled = true;
  btn.textContent = '保活中...';
  await api('/api/ping', { method: 'POST' });
  btn.disabled = false;
  btn.textContent = '⚡ 保活全部';
  await refreshAll();
}

async function deleteDb(id) {
  if (!confirm('确定删除？')) return;
  await api('/api/databases/' + id, { method: 'DELETE' });
  await loadDatabases();
}

async function saveName(id) {
  var input = document.getElementById('name-input-' + id);
  if (!input) return;
  var val = input.value.trim();
  if (val) {
    await api('/api/databases/' + id, { method: 'PUT', body: JSON.stringify({ name: val }) });
    await loadDatabases();
  }
}

async function saveUrl(id) {
  var input = document.getElementById('url-input-' + id);
  if (!input) return;
  var val = input.value.trim();
  if (val) {
    await api('/api/databases/' + id, { method: 'PUT', body: JSON.stringify({ url: val }) });
    await loadDatabases();
  }
}

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
      cpy.textContent = '✅';
      setTimeout(function() { cpy.textContent = orig; }, 1000);
    }
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
}

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

function showImportExportModal(tab) {
  var modal = document.getElementById('import-export-modal');
  if (!modal) return;
  modal.style.display = 'block';
  switchImportExportTab(tab || 'export');
}

function closeImportExportModal() {
  document.getElementById('import-export-modal').style.display = 'none';
  document.getElementById('export-textarea').value = '';
}

function switchImportExportTab(tab) {
  var contents = document.querySelectorAll('#import-export-body .tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].style.display = 'none';
  var content = document.getElementById('import-export-tab-' + tab);
  if (content) content.style.display = 'block';
  var tabs = document.querySelectorAll('.modal-tabs .tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  var btn = document.querySelector('.modal-tabs .tab[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');
  if (tab === 'export') exportToTextarea();
}

async function exportToTextarea() {
  var ta = document.getElementById("export-textarea");
  if (!ta) return;
  ta.placeholder = "加载中...";
  var data = await api("/api/export");
  if (!data) { ta.value = "// 获取数据失败"; ta.placeholder = ""; return; }
  var fmt = getExportFormat();
  if (fmt === "url") {
    var urls = (data.databases || []).map(function(db) { return db.displayUrl || db.url || ""; }).filter(function(u) { return u; });
    ta.value = urls.length ? urls.join("\n") : "// 暂无数据库";
  } else {
    ta.value = JSON.stringify(data, null, 2);
  }
}

function getExportFormat() {
  var active = document.querySelector("#import-export-tab-export .format-opt.active");
  return active ? active.getAttribute("data-val") : "json";
}

function getImportFormat() {
  var active = document.querySelector("#import-export-tab-import .format-opt.active");
  return active ? active.getAttribute("data-val") : "json";
}

function switchExportFormat(fmt) {
  var opts = document.querySelectorAll("#import-export-tab-export .format-opt");
  for (var i = 0; i < opts.length; i++) opts[i].classList.remove("active");
  var sel = document.querySelector('#import-export-tab-export .format-opt[data-val="' + fmt + '"]');
  if (sel) sel.classList.add("active");
  exportToTextarea();
}

function switchImportFormat(fmt) {
  var opts = document.querySelectorAll("#import-export-tab-import .format-opt");
  for (var i = 0; i < opts.length; i++) opts[i].classList.remove("active");
  var sel = document.querySelector('#import-export-tab-import .format-opt[data-val="' + fmt + '"]');
  if (sel) sel.classList.add("active");
  var ta = document.getElementById("import-textarea");
  if (!ta) return;
  ta.placeholder = fmt === "url" ? "每行一个连接串，批量导入..." : "粘贴 JSON 配置内容...";
  ta.value = "";
}

function copyExportJson() {
  var ta = document.getElementById('export-textarea');
  if (!ta || !ta.value) return;
  navigator.clipboard.writeText(ta.value).then(function() {
    var btn = document.querySelector('#import-export-tab-export .copy-btn');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = '✅ 已复制';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    }
    toast('✅ 已复制到剪贴板');
  }).catch(function() {
    ta.select();
    document.execCommand('copy');
    toast('✅ 已复制到剪贴板');
  });
}

async function importFromTextarea() {
  var ta = document.getElementById("import-textarea");
  if (!ta) return;
  var text = ta.value.trim();
  if (!text) { toast("❌ 请粘贴要导入的内容", true); return; }
  var fmt = getImportFormat();
  if (fmt === "url") {
    var urls = text.split("\n").map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 10; });
    if (urls.length === 0) { toast("❌ 未找到有效的连接串", true); return; }
    var ok = 0;
    var btn = document.querySelector("#import-export-tab-import .btn-primary");
    if (btn) { btn.disabled = true; btn.textContent = "导入中 0/" + urls.length + "..."; }
    for (var i = 0; i < urls.length; i++) {
      if (btn) btn.textContent = "导入中 " + (i + 1) + "/" + urls.length + "...";
      try {
        var testRes = await api("/api/databases/test", { method: "POST", body: JSON.stringify({ url: urls[i] }) });
        if (testRes && testRes.success) {
          var name = (urls[i].match(/@([^.:\/]+)/) ? urls[i].match(/@([^.:\/]+)/)[1] : "db") + (i + 1);
          await api("/api/databases", { method: "POST", body: JSON.stringify({ name: name, url: urls[i] }) });
          ok++;
        }
      } catch(e) {}
    }
    if (btn) { btn.disabled = false; btn.textContent = "📥 导入"; }
    ta.value = "";
    toast("✅ 导入完成: " + ok + "/" + urls.length + " 成功");
    closeImportExportModal();
    refreshAll();
  } else {
    var parsed;
    try { parsed = JSON.parse(text); } catch(e) { toast("❌ JSON 格式错误：" + e.message, true); return; }
    if (!parsed.databases || !Array.isArray(parsed.databases)) {
      toast("❌ JSON 缺少 databases 字段", true);
      return;
    }
    var res = await api("/api/import", { method: "POST", body: text });
    if (res && res.ok) {
      toast("✅ 导入成功：" + res.count + " 个数据库");
      closeImportExportModal();
      refreshAll();
    } else {
      toast("❌ 导入失败", true);
    }
  }
}

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
        alert('导入成功：' + res.count + ' 个数据库');
        refreshAll();
      }
    } catch(e) {
      alert('导入失败：' + e.message);
    }
  };
  input.click();
}

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
  var urls = text.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 10; });
  if (urls.length === 0) return;
  var btnEl = document.querySelector('#batch-area button');
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '导入中 0/' + urls.length + '...'; }
  var ok = 0;
  for (var i = 0; i < urls.length; i++) {
    if (btnEl) btnEl.textContent = '导入中 ' + (i + 1) + '/' + urls.length + '...';
    try {
      var testRes = await api('/api/databases/test', { method: 'POST', body: JSON.stringify({ url: urls[i] }) });
      if (testRes && testRes.success) {
        var name = (urls[i].match(/@([^.:\/]+)/) ? urls[i].match(/@([^.:\/]+)/)[1] : 'db') + (i + 1);
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

async function loadNotifConfig() {
  var cfg = await api('/api/notifications/config');
  if (!cfg) return;
  if (cfg.telegramBotToken) document.getElementById('tg-token').value = '✓已配置';
  if (cfg.telegramChatId) document.getElementById('tg-chatid').value = cfg.telegramChatId;
  if (cfg.reportFrequency && ['daily','weekly','monthly','never'].indexOf(cfg.reportFrequency) !== -1) {
    document.getElementById('tg-frequency').value = cfg.reportFrequency;
  }
  var tmplEl = document.getElementById('tg-template');
  if (tmplEl && cfg.messageTemplate) tmplEl.value = cfg.messageTemplate;
}

async function saveNotifConfig() {
  var token = document.getElementById('tg-token').value;
  var chatId = document.getElementById('tg-chatid').value;
  var freq = document.getElementById('tg-frequency').value;
  var tmpl = document.getElementById('tg-template').value.trim();
  var body = { reportFrequency: freq, messageTemplate: tmpl || null };
  if (token && token !== '✓已配置') body.telegramBotToken = token;
  if (chatId) body.telegramChatId = chatId;
  var res = await api('/api/notifications/config', { method: 'POST', body: JSON.stringify(body) });
  toast(res && res.ok ? '✅ 设置已保存' : '❌ 保存失败', !(res && res.ok));
}

async function testNotif() {
  var tmpl = document.getElementById('tg-template').value.trim();
  var res = await api('/api/notifications/test', { method: 'POST', body: JSON.stringify({ template: tmpl || null }) });
  toast(res && res.ok ? '✅ 已发送，请查看 Telegram' : '❌ ' + (res ? res.error : '失败'), !(res && res.ok));
}

var PRESET_TEMPLATES = {
  full: '📊 *DB Keep-Alive 报告*\n━━━━━━━━━━━━━━━━━━━━━━━━\n⏰ {time}\n📦 数据库: {total} 个 | ✅ 正常: {ok} | ❌ 异常: {fail} | 📈 成功率: {rate}%\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 数据库状态\n{db_list}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n📌 🟢正常 · 🔴异常 · ⚪未保活',
  concise: '📊 *DB Keep-Alive* · {time}\n正常: {ok}/{total} · 异常: {fail} · 成功率: {rate}',
  detailed: '📊 *DB Keep-Alive 报告*\n时间: {time}\n---\n{db_list}\n---\n总计: {total} | 正常: {ok} | 异常: {fail} | 成功率: {rate}',
  'failures-only': '⚠️ *DB Keep-Alive 异常报告*\n时间: {time}\n\n{fail_dbs}',
  'daily-brief': '📊 *DB Keep-Alive 日报*\n{time}\n\n✅ 正常: {ok}/{total}\n❌ 异常: {fail}\n📈 成功率: {rate}\n\n{db_list}',
  'markdown-table': '📊 *DB Keep-Alive 报告*\n时间: {time}\n\n数据库 | 状态 | 上次保活\n---|---|---\n{db_table}',
  'ops-report': '📊 *DB Keep-Alive 运维报告*\n━━━━━━━━━━━━━━━\n📅 报告时间: {time}\n\n📋 概览\n  数据库总数: {total}\n  正常运行: {ok}\n  异常告警: {fail}\n  成功率: {rate}\n\n📌 各库状态\n{db_list}\n━━━━━━━━━━━━━━━',
  'chinese-full': '📊 *DB Keep-Alive 状态报告*\n\n⏰ 报告时间：{time}\n📦 数据库总数：{total} 个\n✅ 正常运行：{ok} 个\n❌ 异常告警：{fail} 个\n📈 整体成功率：{rate}\n\n📋 数据库详情：\n{db_list}',
  english: '📊 *DB Keep-Alive Report*\nTime: {time}\n\nHealthy: {ok}/{total} | Failed: {fail} | Rate: {rate}\n\n{db_list}',
  'json-format': '{db_json}',
  minimal: 'DB Keep-Alive: {ok}/{total} OK, {fail} failed ({rate})',
};

function fillPresetTemplate() {
  var sel = document.getElementById('template-preset');
  if (!sel || !sel.value) return;
  var el = document.getElementById('tg-template');
  if (!el) return;
  if (sel.value === '__clear') { el.value = ''; return; }
  var tmpl = PRESET_TEMPLATES[sel.value];
  if (tmpl) el.value = tmpl;
}

function closeGuide() {
  localStorage.setItem('guide-done', 'true');
}

document.getElementById('login-key').addEventListener('keydown', function(e) { if (e.key === 'Enter') login(); });
if (adminKey) {
  document.title = 'DB Keep-Alive Manager';
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  refreshAll();
  loadNotifConfig();
  setInterval(refreshAll, 30000);
}
var TEMPLATES = { supabase: "postgresql://postgres.<project_ref>:<password>@aws-0-region.pooler.supabase.com:5432/postgres", neon: "postgresql://<user>:<password>@ep-<slug>.us-east-2.aws.neon.tech/neondb", render: "postgresql://<user>:<password>@<instance>.render.com/<database>", aiven: "postgresql://<user>:<password>@<project>.aivencloud.com:<port>/<database>", insforge: "postgresql://<user>:<password>@<project>.db.insforge.dev:5432/<database>?sslmode=require", "alibaba-supabase": "postgresql://postgres:<password>@<IP>:5432/postgres" };

function fillTemplate() {
  var t = document.getElementById("add-template").value;
  if (t && TEMPLATES[t]) document.getElementById("add-url").value = TEMPLATES[t];
}

function dbg(msg) {
  var bar = document.getElementById("debug-bar");
  if (bar) { bar.style.display = "block"; bar.innerHTML = "🔍 " + msg; }
}

function toast(msg, isError) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? "#dc2626" : "#1d2939";
  el.style.display = "block";
  setTimeout(function() { el.style.display = "none"; }, 3000);
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
        toast("✅ " + (saved.name || "成功"));
        document.getElementById("add-url").value = "";
        document.getElementById("add-name").value = "";
        await loadDatabases();
      } else {
        toast("❌ 保存失败", true);
      }
    } else {
      toast("❌ " + (res ? (res.error || res.note || "未知错误") : "连接失败"), true);
    }
    btn.disabled = false; btn.textContent = "测试并保存";
  } catch(e) {
    console.error("testAdd:", e);
    toast("❌ " + e.message, true);
    var btnx = document.getElementById("test-add-btn");
    if (btnx) { btnx.disabled = false; btnx.textContent = "测试并保存"; }
  }
}
`;
