import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const wranglerJsonc = resolve(root, 'wrangler.jsonc');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf-8', ...opts });
}

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('=== DB Keep-Alive Manager Setup ===\n');

  // 1. Check wrangler
  try {
    run('npx wrangler --version', { silent: true });
    console.log('✅ wrangler 已就绪');
  } catch {
    console.log('正在安装 wrangler...');
    run('npm install -g wrangler');
  }

  // 2. Login
  try {
    run('npx wrangler whoami', { silent: true });
    console.log('✅ 已登录 Cloudflare');
  } catch {
    console.log('请登录 Cloudflare...');
    run('npx wrangler login');
  }

  // 3. Create KV namespaces
  console.log('\n创建 KV namespace...');
  let prodId, previewId;
  try {
    const out = run('npx wrangler kv:namespace create DATABASE_KV', { silent: true });
    const match = out.match(/"([^"]+)"/);
    prodId = match ? match[1] : null;
    console.log(`✅ 生产 KV ID: ${prodId}`);
  } catch (e) {
    // Maybe already exists
    const out = run('npx wrangler kv:namespace list', { silent: true });
    const match = out.match(/"id":"([^"]+)"/);
    prodId = match ? match[1] : null;
    if (prodId) console.log(`✅ 使用已有 KV ID: ${prodId}`);
  }

  try {
    const out = run('npx wrangler kv:namespace create DATABASE_KV --preview', { silent: true });
    const match = out.match(/"([^"]+)"/);
    previewId = match ? match[1] : null;
    console.log(`✅ Preview KV ID: ${previewId}`);
  } catch {
    previewId = prodId;
  }

  if (!prodId) {
    console.error('❌ 无法获取 KV namespace ID');
    process.exit(1);
  }

  // 4. Write IDs to wrangler.jsonc
  let config = readFileSync(wranglerJsonc, 'utf-8');
  config = config.replace(/"KV_ID_PLACEHOLDER"/g, `"${prodId}"`);
  config = config.replace(/"preview_id":\s*"[^"]*"/, `"preview_id": "${previewId || prodId}"`);
  writeFileSync(wranglerJsonc, config);
  console.log('✅ KV ID 已写入 wrangler.jsonc');

  // 5. Set ADMIN_KEY secret
  const key1 = await ask('设置管理员密钥 (ADMIN_KEY): ');
  const key2 = await ask('确认密钥: ');
  if (key1 !== key2 || !key1) {
    console.error('❌ 密钥不匹配或为空');
    process.exit(1);
  }
  run(`echo "${key1}" | npx wrangler secret put ADMIN_KEY`);
  console.log('✅ ADMIN_KEY 已设置');

  // 6. Deploy
  console.log('\n部署中...');
  try {
    const out = run('npx wrangler deploy', { silent: true });
    const urlMatch = out.match(/https:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '部署完成';
    console.log(`\n🎉 部署成功！访问地址: ${url}`);
    console.log('打开浏览器，登录后添加你的数据库连接字符串即可。');
  } catch (e) {
    console.error('❌ 部署失败:', e.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ 安装失败:', e.message);
  process.exit(1);
});
