export async function getDatabases(env) {
  return (await env.DATABASE_KV.get('databases', 'json')) || [];
}

export async function setDatabases(env, dbs) {
  await env.DATABASE_KV.put('databases', JSON.stringify(dbs));
}

export async function getLogs(env) {
  return (await env.DATABASE_KV.get('logs', 'json')) || [];
}

export async function appendLog(env, entry) {
  const logs = await getLogs(env);
  logs.unshift(entry);
  if (logs.length > 10) logs.length = 10;
  await env.DATABASE_KV.put('logs', JSON.stringify(logs));
}

export async function getConfig(env) {
  return (await env.DATABASE_KV.get('config', 'json')) || {};
}

export async function setConfig(env, cfg) {
  await env.DATABASE_KV.put('config', JSON.stringify(cfg));
}
