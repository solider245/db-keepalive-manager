<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare" />
  <img src="https://img.shields.io/badge/PostgreSQL-✓-4169E1?logo=postgresql" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://deploy.workers.cloudflare.com/button" />
</p>

<h1 align="center">DB Keep-Alive Manager 数据库保活管理工具</h1>

<p align="center">
  一个在 Cloudflare Workers 上运行的开源数据库保活管理工具，自动防止免费数据库因无活动而休眠。
</p>

---

## 这是什么？

**DB Keep-Alive Manager** 是一个运行在 Cloudflare Workers 上的数据库保活管理工具，内置 Web 管理面板，可统一管理多个 PostgreSQL 数据库的连接串，自动定时保活，防止免费数据库（Supabase、Neon、Render、Aiven 等）因无活动而休眠。

连接串使用 **AES-256-GCM 加密** 存储在 Cloudflare KV 中。支持 **Telegram 通知**，包括保活失败提醒和每日/每周/每月汇总报告。

无需额外构建步骤，无需额外基础设施，一键部署即可长期使用。

## 功能特性

- **Web 管理面板** — 无需构建前端，打开 URL 即可使用
- **一键部署** — Fork 项目 + 点击 Deploy 按钮 = 完成
- **AES-256 加密存储** — 连接串在静态存储时全程加密
- **自动保活** — 每 10 分钟自动执行一次保活（Cloudflare Cron Trigger）
- **失败重试** — 保活失败后 3 秒自动重试一次
- **批量导入** — 一次性粘贴多个连接串，批量测试并保存
- **Telegram 告警** — 数据库异常时即时推送通知
- **定期报告** — 支持日报 / 周报 / 月报汇总自动推送
- **配置导入导出** — 一键备份和恢复数据库列表（JSON 格式）
- **双击编辑** — 双击数据库名称即可重命名
- **自动识别提供商** — 自动检测 Supabase、Neon、Render、Aiven、Fly.io、Railway 等平台
- **免费数据库引导** — 提供各平台免费数据库获取指南
- **状态徽章** — 可在你的 README 中嵌入状态展示

## 快速开始

### 方式一（推荐）— Deploy 按钮部署

1. Fork 本项目到你的 GitHub 账号
2. 点击上方 **Deploy to Cloudflare** 按钮
3. 授权 Cloudflare，按提示设置 `ADMIN_KEY`（管理员密钥）
4. 等待部署完成
5. 打开 Worker 地址，用 `ADMIN_KEY` 登录
6. 粘贴数据库连接串 → 测试 → 自动保存，后续全自动

### 方式二 — CLI 命令行部署

```bash
# Fork 并克隆
git clone https://github.com/your-username/db-keepalive-manager.git
cd db-keepalive-manager
npm install

# 交互式部署（自动登录 Cloudflare、创建 KV、部署 Worker）
npm run setup
```

## 使用说明

1. 在浏览器中打开 Worker 地址
2. 输入部署时设置的 `ADMIN_KEY` 登录
3. 在输入框中粘贴 PostgreSQL 连接串：
   ```
   postgresql://user:password@host:5432/database
   ```
4. 点击 **测试** — Worker 会尝试连接并返回结果
5. 连接成功自动保存，之后每 10 分钟自动保活
6. 状态一目了然：绿色=正常，红色=异常，灰色=尚未保活

> 如需 Telegram 告警和报告，在设置面板中配置 Bot Token 和 Chat ID 即可。

## Telegram 通知

在 Web 管理面板的设置中配置以下信息：

| 配置项 | 说明 |
|--------|------|
| **Bot Token** | 通过 [@BotFather](https://t.me/BotFather) 创建机器人获取 |
| **Chat ID** | 你的用户 ID（可用 [@userinfobot](https://t.me/userinfobot) 查询） |
| **报告频率** | 日报 / 周报 / 月报 / 不发送 |

向你的机器人发送 `/status` 可随时查询所有数据库的当前状态。

## API 接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | 否 | Web 管理界面 |
| POST | `/api/auth` | 否 | 使用 ADMIN_KEY 登录 |
| GET | `/api/status` | 是 | 所有数据库状态汇总 |
| GET | `/api/badge` | 是 | 兼容 Shields.io 的状态徽章 |
| GET | `/api/databases` | 是 | 获取数据库列表 |
| POST | `/api/databases` | 是 | 添加数据库 |
| POST | `/api/databases/test` | 是 | 测试连接串是否可用 |
| POST | `/api/databases/detect` | 是 | 自动识别数据库提供商 |
| PUT | `/api/databases/:id` | 是 | 更新数据库名称 |
| DELETE | `/api/databases/:id` | 是 | 删除数据库 |
| POST | `/api/ping` | 是 | 保活所有数据库 |
| POST | `/api/ping/:id` | 是 | 保活指定数据库 |
| GET | `/api/logs` | 是 | 最近保活日志 |
| GET | `/api/export` | 是 | 导出全部数据为 JSON |
| POST | `/api/import` | 是 | 从 JSON 导入数据 |
| GET | `/api/notifications/config` | 是 | 获取通知配置 |
| POST | `/api/notifications/config` | 是 | 更新通知配置 |
| POST | `/api/notifications/test` | 是 | 发送测试通知 |

## 架构设计

```
┌──────────┐     ┌──────────────────┐     ┌───────────┐     ┌─────────────┐
│  浏览器   │────▶│  Cloudflare      │────▶│  Cloudflare│     │ PostgreSQL  │
│  (Web UI) │     │  Worker          │     │  KV 存储   │     │  (SELECT 1) │
└──────────┘     └──────────┬───────┘     └───────────┘     └─────────────┘
                            │
                    ┌───────▼────────┐
                    │  Cron 触发器   │
                    │  (*/10 * * * *)│
                    └────────────────┘
```

- **Worker**（`src/index.js`）— 提供 Web 界面、处理 API 请求、加密存储连接串、执行保活、发送 Telegram 通知。
- **KV 存储**（`DATABASE_KV`）— 存储加密后的连接串、保活日志和通知配置。
- **Cron 触发器** — 每 10 分钟触发一次，在后台保活所有数据库。
- **postgres.js** — 唯一的运行时依赖，用于轻量级 PostgreSQL 连接。

## 本地开发

```bash
# 创建 .dev.vars 文件，写入本地密钥
echo 'ADMIN_KEY=my-local-dev-key' > .dev.vars

# 启动开发服务器（支持热重载）
npm run dev
```

开发服务器使用 `wrangler dev`，可在 `http://localhost:8787` 访问完整的 Web 界面。

## 开源许可

[MIT](LICENSE) — 永久免费开源。
