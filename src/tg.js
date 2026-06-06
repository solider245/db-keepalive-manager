import { getDatabases, setDatabases, getConfig, setConfig } from './db.js';
import { encrypt, detectDbType, detectDatabase, maskUrl } from './utils.js';

// Accept optional pre-fetched cfg to avoid redundant getConfig()
export async function sendTelegram(env, message, customChatId, cfg) {
  const config = cfg || await getConfig(env);
  const chatId = customChatId || config.telegramChatId;
  if (!config.telegramBotToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error('Telegram send failed:', e.message);
  }
}

// ============ Command Handling ============

export async function handleTelegramCommand(body, env) {
  const msg = body.message?.text || '';
  const chatId = body.message?.chat?.id;
  if (!chatId) return { ok: true };

  const cfg = await getConfig(env);

  // Verify chat ID if already configured
  if (cfg.telegramChatId && String(chatId) !== String(cfg.telegramChatId)) {
    return { ok: true };
  }

  const args = msg.split(' ');
  const cmd = args[0];

  switch (cmd) {
    case '/start':
    case '/help':
      await sendTelegram(env, getHelpText(), null, cfg);
      break;

    case '/status': {
      const dbs = await getDatabases(env);
      const total = dbs.length;
      const ok = dbs.filter(d => d.lastSuccess === true).length;
      const fail = dbs.filter(d => d.lastSuccess === false).length;
      let text = '📊 *DB Keep-Alive 状态*\n\n';
      text += `总计: ${total} 个\n正常: ${ok} 个\n异常: ${fail} 个\n\n`;
      for (const db of dbs) {
        const icon = db.lastSuccess === true ? '🟢' : db.lastSuccess === false ? '🔴' : '⚪';
        const time = db.lastPingAt ? ` · ${formatTime(db.lastPingAt)}` : '';
        text += `${icon} ${db.name} (${db.type || 'postgres'})${time}\n`;
      }
      await sendTelegram(env, text, null, cfg);
      break;
    }

    case '/report': {
      const dbs = await getDatabases(env);
      const reportText = renderReport(dbs, cfg.messageTemplate);
      await sendTelegram(env, reportText, null, cfg);
      cfg.lastReportDate = Date.now();
      await setConfig(env, cfg);
      break;
    }

    case '/set_template': {
      const template = args.slice(1).join(' ');
      if (!template) {
        await sendTelegram(env, '用法: /set_template <模板>\n\n可用变量:\n{time} {total} {ok} {fail} {rate}\n{db_list} {fail_dbs} {db_table} {db_json}\n\n查看当前模板: /get_template\n恢复默认: /reset_template', null, cfg);
        return { ok: true };
      }
      cfg.messageTemplate = template;
      await setConfig(env, cfg);
      await sendTelegram(env, '✅ 自定义模板已保存', null, cfg);
      break;
    }

    case '/get_template': {
      if (cfg.messageTemplate) {
        await sendTelegram(env, '📄 *当前模板*\n\n```\n' + cfg.messageTemplate + '\n```', null, cfg);
      } else {
        await sendTelegram(env, '当前使用默认模板。使用 /set_template 自定义。', null, cfg);
      }
      break;
    }

    case '/reset_template': {
      delete cfg.messageTemplate;
      await setConfig(env, cfg);
      await sendTelegram(env, '✅ 已恢复默认模板', null, cfg);
      break;
    }

    case '/ping': {
      await sendTelegram(env, '⚡ 保活请求已记录（由定时任务自动执行，每 10 分钟一次）', null, cfg);
      break;
    }

    case '/add_db': {
      const dbUrl = args.slice(1).join(' ');
      if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
        await sendTelegram(env, '用法: /add_db postgresql://user:password@host:5432/database\n\n请提供完整的 PostgreSQL 连接串。', null, cfg);
        return { ok: true };
      }
      try {
        const encryptedUrl = await encrypt(dbUrl, env.ADMIN_KEY);
        const info = detectDatabase(dbUrl);
        const name = info.detectedName || dbUrl.match(/@([^:.]+)/)?.[1] || 'db';
        const record = {
          id: crypto.randomUUID(), name,
          type: detectDbType(dbUrl),
          encryptedUrl, displayUrl: maskUrl(dbUrl),
          consoleUrl: info.consoleUrl, anonKey: null,
          createdAt: Date.now(), lastPingAt: null,
          lastSuccess: null, lastError: null,
        };
        const dbs = await getDatabases(env);
        dbs.push(record);
        await setDatabases(env, dbs);
        await sendTelegram(env, `✅ 数据库已添加\n名称: ${name}\n类型: ${record.type}\n` + (info.consoleUrl ? `管理后台: ${info.consoleUrl}` : ''), null, cfg);
      } catch (e) {
        await sendTelegram(env, `❌ 添加失败: ${e.message}`, null, cfg);
      }
      break;
    }

    default:
      await sendTelegram(env, getHelpText(), null, cfg);
      break;
  }
  return { ok: true };
}

function getHelpText() {
  return '🤖 *DB Keep-Alive Bot*\n\n' +
    '*/status* — 查看当前数据库状态\n' +
    '*/report* — 立即生成状态报告\n' +
    '*/set_template* — 设置自定义报告模板\n' +
    '*/get_template* — 查看当前模板\n' +
    '*/reset_template* — 恢复默认模板\n' +
    '*/add_db <url>* — 远程添加数据库\n' +
    '*/ping* — 触发保活\n' +
    '*/help* — 命令列表\n\n' +
    '📝 *模板变量*\n' +
    '`{time}` 报告时间 · `{total}/{ok}/{fail}` 计数\n' +
    '`{rate}` 成功率 · `{db_list}` 逐库状态\n' +
    '`{fail_dbs}` 仅异常 · `{db_table}` 表格 · `{db_json}` JSON';
}

// ============ Report Rendering ============

export function renderReport(dbs, customTemplate) {
  const now = new Date();
  const total = dbs.length;
  const okCount = dbs.filter(d => d.lastSuccess === true).length;
  const failCount = dbs.filter(d => d.lastSuccess === false).length;
  const rate = total ? Math.round(okCount / total * 100) : 100;

  const dbListLines = dbs.map(db => {
    const icon = db.lastSuccess === true ? '🟢' : db.lastSuccess === false ? '🔴' : '⚪';
    const time = db.lastPingAt ? formatTime(db.lastPingAt) : '未保活';
    const err = db.lastError ? ` · ${db.lastError.substring(0, 40)}` : '';
    return `${icon} ${db.name} · ${time}${err}`;
  });

  const failDbs = dbs.filter(d => d.lastSuccess !== true);
  const failDbLines = failDbs.map(db => {
    const icon = db.lastSuccess === false ? '🔴' : '⚪';
    const err = db.lastError ? ` · ${db.lastError.substring(0, 60)}` : '';
    return `${icon} ${db.name}${err}`;
  });

  const dbTableLines = dbs.map(db => {
    const icon = db.lastSuccess === true ? '🟢' : db.lastSuccess === false ? '🔴' : '⚪';
    const time = db.lastPingAt ? formatTime(db.lastPingAt) : '未保活';
    const status = db.lastSuccess === null ? '未保活' : db.lastSuccess ? '正常' : '异常';
    return `${db.name} | ${icon} ${status} | ${time}`;
  });

  const variables = {
    '{time}': now.toLocaleString('zh-CN'),
    '{total}': String(total), '{ok}': String(okCount),
    '{fail}': String(failCount), '{rate}': rate + '%',
    '{db_list}': dbListLines.join('\n'),
    '{fail_dbs}': failDbLines.length ? failDbLines.join('\n') : '✅ 全部正常，无异常',
    '{db_table}': dbTableLines.join('\n'),
    '{db_json}': JSON.stringify(dbs.map(d => ({
      id: d.id, name: d.name, type: d.type,
      healthy: d.lastSuccess === true,
      lastPingAt: d.lastPingAt, lastError: d.lastError,
    }))),
  };

  if (customTemplate) {
    let text = customTemplate;
    for (const [key, val] of Object.entries(variables)) {
      text = text.replaceAll(key, val);
    }
    return text;
  }

  let text = `📊 *DB Keep-Alive 报告*\n━━━━━━━━━━━━━━━━━━━━━━━━\n⏰ ${variables['{time}']}\n📦 数据库: ${total} 个 | ✅ 正常: ${okCount} | ❌ 异常: ${failCount} | 📈 成功率: ${rate}%\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 数据库状态\n`;
  if (dbs.length > 0) text += variables['{db_list}'] + '\n';
  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n📌 🟢正常 · 🔴异常 · ⚪未保活`;
  return text;
}

function formatTime(ts) {
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

// ============ Notification Sending ============

export async function sendNotification(env, type, data, dbs) {
  const cfg = await getConfig(env);
  const reportFreq = cfg.reportFrequency || 'daily';

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
      const dbList = dbs || await getDatabases(env);
      const reportText = renderReport(dbList, cfg.messageTemplate);
      await sendTelegram(env, reportText, null, cfg);
    }
  }

  if (type === 'failure' && data.failed > 0) {
    const msg = `⚠️ *保活异常通知*\n${data.failed} 个数据库保活失败，请检查:\n${data.names.map(n => `- ${n}`).join('\n')}`;
    await sendTelegram(env, msg, null, cfg);
  }
}
