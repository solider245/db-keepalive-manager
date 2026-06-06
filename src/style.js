export const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
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
.modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:200; }
.modal-content { background: #fff; border-radius: 12px; width: 620px; max-width: 90vw; max-height: 85vh; display:flex; flex-direction:column; box-shadow: 0 8px 40px rgba(0,0,0,0.18); }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #eaecf0; font-weight:600; font-size:15px; }
.modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:#98a2b3; padding:0 4px; }
.modal-close:hover { color:#667085; }
.modal-tabs { display:flex; border-bottom:1px solid #eaecf0; }
.modal-tabs .tab { flex:1; padding:10px; border:none; background:#f9fafb; cursor:pointer; font-size:13px; color:#667085; transition:all .15s; }
.modal-tabs .tab:hover { background:#f2f4f7; }
.modal-tabs .tab.active { background:#fff; color:#1d2939; font-weight:500; border-bottom:2px solid #6366f1; }
.modal-body { padding:16px 20px; overflow-y:auto; flex:1; }
.modal-textarea { width:100%; height:320px; padding:10px 12px; border:1px solid #d0d5dd; border-radius:6px; font-family:"SF Mono","Fira Code",monospace; font-size:12px; line-height:1.5; resize:vertical; }
.modal-textarea:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,0.1); }
.modal-textarea[readonly] { background:#f9fafb; color:#344054; }
.modal-actions { display:flex; gap:6px; justify-content:flex-end; margin-top:10px; }
.modal-actions .btn { font-size:12px; padding:6px 14px; }
.format-toggle { display:flex; margin-bottom:8px; background:#f2f4f7; border-radius:6px; padding:2px; width:fit-content; }
.format-opt { padding:4px 14px; font-size:12px; border-radius:4px; cursor:pointer; color:#667085; user-select:none; transition:all .15s; }
.format-opt.active { background:#fff; color:#1d2939; font-weight:500; box-shadow:0 1px 2px rgba(0,0,0,0.08); }
`;