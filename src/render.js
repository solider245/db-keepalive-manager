import { css } from './style.js';
import { clientCode } from './client.js';

export function renderHTML() {
  const jsBody = clientCode;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DB Keep-Alive Manager</title>
<style>${css}</style>
</head>
<body>
<div class="container" id="app">
  <div id="login-view" class="login-overlay">
    <div class="login-box">
      <h1>DB Keep-Alive Manager</h1>
      <p>输入管理员密钥登录</p>
      <input type="password" id="login-key" placeholder="ADMIN_KEY" autofocus>
      <button class="btn btn-primary" onclick="login()" id="login-btn">登录</button>
      <div id="login-error" class="login-error"></div>
    </div>
  </div>
  <div id="dashboard-view" class="hidden">
    <div id="debug-bar" style="display:none;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:13px;color:#dc2626"></div>
    <div class="header">
      <h1>⚡ DB Keep-Alive Manager</h1>
      <div style="display:flex;gap:4px">
        <button onclick="logout()">退出</button>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:15px;font-weight:600">💾 数据库 <span id="status-summary" style="font-size:12px;font-weight:400;color:#667085"></span> <span id="last-refresh" style="font-size:11px;font-weight:400;color:#98a2b3;margin-left:4px"></span></span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-outline" onclick="showImportExportModal('export')" style="font-size:12px;padding:5px 12px">📤 数据管理</button>
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
    <div id="log-bar" style="margin-top:8px;padding-top:8px;border-top:1px solid #eaecf0;font-size:12px;color:#667085;display:flex;gap:12px;flex-wrap:wrap;min-height:20px"></div>
    <div class="card">
      <div style="font-weight:500;margin-bottom:10px">+ 添加数据库</div>
      <input type="text" id="add-url" placeholder="postgresql://user:password@host:5432/database" style="width:100%;padding:6px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:13px;font-family:monospace;margin-bottom:8px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" id="add-name" placeholder="名称" style="flex:1;min-width:100px;padding:5px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:13px">
        <select id="add-template" style="padding:5px 8px;border:1px solid #d0d5dd;border-radius:5px;font-size:12px" onchange="fillTemplate()">
          <option value="">自定义</option>
          <option value="supabase">Supabase</option>
          <option value="neon">Neon</option>
          <option value="render">Render</option>
          <option value="aiven">Aiven</option>
          <option value="koyeb">Koyeb</option>
          <option value="railway">Railway</option>
          <option value="flyio">Fly.io</option>
          <option value="cockroachdb">CockroachDB</option>
          <option value="upstash">Upstash (Redis)</option>
          <option value="rediscloud">Redis Cloud</option>
	          <option value="insforge">InsForge</option>
	          <option value="alibaba-supabase">阿里云 Supabase</option>
        </select>
        <button class="btn btn-outline" onclick="fillTemplate()" style="font-size:12px;padding:4px 10px">填入</button>
        <button class="btn btn-primary" onclick="testAdd()" id="test-add-btn" style="font-size:12px;padding:5px 12px">测试并保存</button>
        <span id="add-status" style="font-size:12px"></span>
      </div>
    </div>
    <div id="settings-panel" style="margin-top:12px;padding:16px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;font-size:13px">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#344054">🔔 Telegram 通知设置</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <input type="password" id="tg-token" placeholder="Bot Token" style="padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px">
        <input type="text" id="tg-chatid" placeholder="Chat ID" style="padding:4px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:12px;color:#667085;white-space:nowrap">推送频率</span>
        <select id="tg-frequency" style="padding:3px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px">
          <option value="daily">每日报告</option>
          <option value="weekly">每周报告</option>
          <option value="monthly">每月报告</option>
          <option value="never">不推送</option>
        </select>
        <span style="font-size:12px;color:#667085;white-space:nowrap">预置模板</span>
        <select id="template-preset" onchange="fillPresetTemplate()" style="padding:3px 6px;border:1px solid #d0d5dd;border-radius:4px;font-size:12px">
          <option value="">— 选择 —</option>
          <option value="full">📋 完整版</option>
          <option value="__clear">🔄 清空/恢复默认</option>
          <option value="concise">简洁</option>
          <option value="detailed">详细</option>
          <option value="failures-only">仅异常</option>
          <option value="daily-brief">每日简报</option>
          <option value="markdown-table">Markdown 表格</option>
          <option value="ops-report">运维报告</option>
          <option value="chinese-full">中文详细</option>
          <option value="english">English</option>
          <option value="json-format">JSON 输出</option>
          <option value="minimal">极简</option>
        </select>
      </div>
      <div style="margin-bottom:4px">
        <textarea id="tg-template" rows="7" placeholder="推送报告模板，可用变量: {time} {total} {ok} {fail} {rate} {db_list} {fail_dbs} {db_table} {db_json}" style="width:100%;padding:6px 8px;border:1px solid #d0d5dd;border-radius:4px;font-family:monospace;font-size:12px;line-height:1.5"></textarea>
      </div>
      <div style="margin-bottom:8px;font-size:11px;color:#667085;background:#fff;border:1px solid #eaecf0;border-radius:4px;padding:6px 8px;line-height:1.8">
        <span style="font-weight:500;color:#344054">📌 可用变量</span><br>
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{time}</code> 报告时间 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{total}</code> 总数 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{ok}</code> 正常 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{fail}</code> 异常 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{rate}</code> 成功率<br>
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{db_list}</code> 各库状态 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{fail_dbs}</code> 仅异常 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{db_table}</code> 表格 ·
        <code style="background:#f2f4f7;padding:1px 4px;border-radius:2px">{db_json}</code> JSON
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="saveNotifConfig()" style="padding:4px 14px;border:none;border-radius:5px;background:#6366f1;color:#fff;font-size:12px;cursor:pointer;font-weight:500">💾 保存设置</button>
        <button onclick="testNotif()" style="padding:4px 14px;border:1px solid #d0d5dd;border-radius:5px;background:#fff;font-size:12px;cursor:pointer">📨 测试推送</button>
      </div>
    </div>
	    <div id="import-export-modal" style="display:none">
  <div class="modal-overlay" onclick="closeImportExportModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <div class="modal-header">
        <span>📤 数据管理</span>
        <button class="modal-close" onclick="closeImportExportModal()">✕</button>
      </div>
      <div class="modal-tabs">
        <button class="tab active" data-tab="export" onclick="switchImportExportTab('export')">📋 导出配置</button>
        <button class="tab" data-tab="import" onclick="switchImportExportTab('import')">📥 导入配置</button>
      </div>
      <div id="import-export-body" class="modal-body">
        <div id="import-export-tab-export" class="tab-content">
          <div class="format-toggle">
            <label class="format-opt active" data-val="json" onclick="switchExportFormat("json")">JSON</label>
            <label class="format-opt" data-val="url" onclick="switchExportFormat("url")">连接串</label>
          </div>
          <textarea id="export-textarea" class="modal-textarea" readonly placeholder="加载中..."></textarea>
          <div class="modal-actions">
            <button class="btn btn-outline copy-btn" onclick="copyExportJson()">📋 复制到剪贴板</button>
            <button class="btn btn-outline" onclick="exportData()">💾 下载文件</button>
          </div>
        </div>
        <div id="import-export-tab-import" class="tab-content" style="display:none">
          <div class="format-toggle">
            <label class="format-opt active" data-val="json" onclick="switchImportFormat("json")">JSON</label>
            <label class="format-opt" data-val="url" onclick="switchImportFormat("url")">连接串</label>
          </div>
          <textarea id="import-textarea" class="modal-textarea" placeholder="粘贴 JSON 配置内容..."></textarea>
          <div class="modal-actions">
            <button class="btn btn-primary" onclick="importFromTextarea()" style="font-size:12px">📥 导入</button>
            <button class="btn btn-outline" onclick="importData()">📂 选择文件</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="toast" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1d2939;color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;z-index:999;display:none;box-shadow:0 4px 20px rgba(0,0,0,0.15);white-space:nowrap"></div>
<script>${jsBody}</script>
</body>
</html>`;
}
