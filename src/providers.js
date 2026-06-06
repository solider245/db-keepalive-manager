export const PROVIDERS = [
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

export const TEMPLATES = {
  supabase: 'postgresql://postgres.<project_ref>:<password>@aws-0-region.pooler.supabase.com:5432/postgres',
  neon: 'postgresql://<user>:<password>@ep-<slug>.us-east-2.aws.neon.tech/neondb',
  render: 'postgresql://<user>:<password>@<instance>.render.com/<database>',
  aiven: 'postgresql://<user>:<password>@<project>.aivencloud.com:<port>/<database>',
  koyeb: 'postgresql://<user>:<password>@<instance>.koyeb.app:5432/<database>',
  railway: 'postgresql://<user>:<password>@<host>.railway.app:5432/<database>',
  flyio: 'postgresql://<user>:<password>@<host>.fly.io:5432/<database>',
  cockroachdb: 'postgresql://<user>:<password>@<cluster>.cockroachlabs.cloud:26257/<database>?sslmode=require',
  upstash: 'redis://default:<password>@<region>.upstash.io:6379',
  rediscloud: 'rediss://default:<password>@<host>.redis-cloud.com:6379',
  insforge: 'postgresql://<user>:<password>@<project>.db.insforge.dev:5432/<database>?sslmode=require',
  'alibaba-supabase': 'postgresql://postgres:<password>@<IP>:5432/postgres',
};
