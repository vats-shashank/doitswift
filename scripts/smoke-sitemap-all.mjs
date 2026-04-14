/**
 * After `npm run build` and `astro preview`, fetches every URL in dist/sitemap-0.xml.
 * Usage: PREVIEW_PORT=4322 node scripts/smoke-sitemap-all.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = process.env.PREVIEW_PORT || '4321';
const base = `http://127.0.0.1:${PORT}`;

const xml = readFileSync(path.join(root, 'dist', 'sitemap-0.xml'), 'utf8');
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/^https:\/\/doitswift\.com/, base),
);

const failures = [];
const badBody = [];

for (const url of locs) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.status !== 200) failures.push({ url, status: res.status });
    else {
      const t = await res.text();
      if (!t.includes('</html>')) badBody.push({ url, reason: 'no closing html' });
      const isRedirectStub =
        t.includes('http-equiv="refresh"') || /Redirecting/i.test(t.slice(0, 800));
      if (t.length < 500 && !isRedirectStub) badBody.push({ url, reason: `short body (${t.length})` });
    }
  } catch (e) {
    failures.push({ url, error: String(e.message) });
  }
}

console.log(`smoke-sitemap-all: checked ${locs.length} URL(s) at ${base}`);
if (failures.length) {
  console.error('HTTP failures:', failures);
  process.exitCode = 1;
} else {
  console.log('smoke-sitemap-all: all HTTP 200');
}
if (badBody.length) {
  console.error('Body issues:', badBody);
  process.exitCode = 1;
} else {
  console.log('smoke-sitemap-all: all bodies look like full HTML pages');
}
