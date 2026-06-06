import { PROVIDERS } from './providers.js';

// ============ Crypto ============

async function deriveKey(adminKey) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(adminKey));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encrypt(text, adminKey) {
  const key = await deriveKey(adminKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(data, adminKey) {
  const key = await deriveKey(adminKey);
  const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// ============ URL Detection ============

export function detectDbType(url) {
  try {
    if (url.startsWith('redis://') || url.startsWith('rediss://')) return 'redis';
    const u = new URL(url);
    const host = u.hostname;
    const port = u.port || '5432';
    if ((host.includes('supabase.co') || host.includes('pooler.supabase.com')) && port === '6543') return 'supabase-http';
  } catch { /* ignore */ }
  return 'postgres';
}

export function getSupabaseProjectRef(url) {
  const u = new URL(url);
  const user = decodeURIComponent(u.username);
  if (user && user.includes('.')) return user.split('.')[1];
  if (u.hostname.endsWith('.supabase.co')) return u.hostname.split('.')[0];
  return null;
}

export function detectDatabase(url) {
  const host = new URL(url).hostname;
  const u = new URL(url);
  const user = decodeURIComponent(u.username);
  let projectRef = null;
  let type = 'postgres';
  let consoleUrl = null;
  let detectedName = null;

  if (host.includes('supabase.co') || host.includes('pooler.supabase.com')) {
    type = 'supabase-http';
    if (user && user.includes('.')) projectRef = user.split('.')[1];
    else if (host.endsWith('.supabase.co')) projectRef = host.split('.')[0];
    detectedName = projectRef ? projectRef.substring(0, 12) : 'Supabase';
    consoleUrl = projectRef ? 'https://supabase.com/dashboard/project/' + projectRef : 'https://supabase.com/dashboard';
  } else if (host.includes('neon.tech')) {
    const match = host.match(/^([^.]+)/);
    projectRef = match ? match[1] : null;
    detectedName = projectRef ? projectRef.substring(0, 12) : 'Neon';
    consoleUrl = 'https://console.neon.tech/projects';
  } else if (host.includes('render.com')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Render';
    consoleUrl = 'https://dashboard.render.com/databases';
  } else if (host.includes('aivencloud.com')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Aiven';
    consoleUrl = 'https://console.aiven.io';
  } else if (host.includes('fly.io')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Fly.io';
    consoleUrl = 'https://fly.io/dashboard';
  } else if (host.includes('railway.app')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Railway';
    consoleUrl = 'https://railway.app/dashboard';
  } else if (host.includes('cyclic.sh')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Cyclic';
    consoleUrl = null;
  } else if (host.includes('alwaysdata.net')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Alwaysdata';
    consoleUrl = null;
  } else if (host.includes('koyeb.app')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'Koyeb';
    consoleUrl = 'https://app.koyeb.com/';
  } else if (host.includes('cockroachlabs.cloud')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'CockroachDB';
    consoleUrl = 'https://www.cockroachlabs.com/';
  } else if (host.includes('db.insforge.dev')) {
    const match = host.match(/^([^.]+)/);
    detectedName = match ? match[1].substring(0, 12) : 'InsForge';
    consoleUrl = 'https://insforge.dev/';
  } else {
    detectedName = host.split('.')[0] || 'PostgreSQL';
    consoleUrl = null;
  }

  return { type, projectRef, detectedName, consoleUrl };
}

export function maskUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const db = u.pathname === '/' ? '' : u.pathname;
    const params = u.search || '';
    return u.protocol + '//' + host + (u.port ? ':' + u.port : '') + db + params;
  } catch {
    return url.substring(0, 50);
  }
}

export function matchProvider(url) {
  if (!url) return null;
  const u = String(url).toLowerCase();
  for (let i = 0; i < PROVIDERS.length; i++) {
    if (u.includes(PROVIDERS[i].id)) return PROVIDERS[i];
  }
  return null;
}
