// scripts/cache.mjs
// Inspect or clear the local SerpApi response cache.
//
//   node scripts/cache.mjs          list what is cached (and therefore free)
//   node scripts/cache.mjs clear    delete every cached response
//
// Also prints the live credit balance so you know where you stand before a demo.

import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.join(process.cwd(), '.serpapi-cache');
const command = process.argv[2];

function readEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // no env file; credit lookup is skipped below
  }
  return env;
}

if (command === 'clear') {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    console.log('Cache cleared. The next run will spend credits again.');
  } else {
    console.log('Cache is already empty.');
  }
  process.exit(0);
}

if (!fs.existsSync(CACHE_DIR)) {
  console.log('Cache is empty — every search will spend a credit.\n');
} else {
  const now = Date.now();
  const rows = [];

  for (const file of fs.readdirSync(CACHE_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      rows.push({
        label: entry.label || '(unlabelled)',
        fresh: entry.expires > now,
        expiresIn: Math.round((entry.expires - now) / 60000),
      });
    } catch {
      rows.push({ label: '(corrupt entry)', fresh: false, expiresIn: 0 });
    }
  }

  rows.sort((a, b) => a.label.localeCompare(b.label));

  const fresh = rows.filter((r) => r.fresh);
  console.log(`Cached searches: ${rows.length} total, ${fresh.length} still fresh\n`);

  for (const r of rows) {
    const status = r.fresh
      ? `free for ${r.expiresIn >= 60 ? `${Math.round(r.expiresIn / 60)}h` : `${r.expiresIn}m`}`
      : 'EXPIRED — will cost 1 credit';
    console.log(`  ${r.fresh ? 'FREE   ' : 'STALE  '} ${r.label.padEnd(46)} ${status}`);
  }
  console.log();
}

const env = readEnv();
if (env.SERPAPI_API_KEY) {
  try {
    const res = await fetch(
      `https://serpapi.com/account?api_key=${encodeURIComponent(env.SERPAPI_API_KEY)}`
    );
    const j = await res.json();
    console.log(
      `SerpApi balance: ${j.total_searches_left}/${j.searches_per_month} credits left ` +
        `(${j.this_month_usage} used this month)`
    );
  } catch (error) {
    console.log('Could not reach SerpApi to check the balance:', error.message);
  }
}
