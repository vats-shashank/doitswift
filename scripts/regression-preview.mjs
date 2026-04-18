/**
 * After `npm run build`: starts `astro preview`, fetches every <loc> from dist/sitemap-0.xml
 * (rewritten to localhost), checks HTTP 200, then validates trailing-slash redirects for a sample.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const sitemapPath = path.join(dist, 'sitemap-0.xml');
const HOST = '127.0.0.1';
const PORT = process.env.PREVIEW_PORT || '4321';
const base = `http://${HOST}:${PORT}`;

/** Canonical entry points (must return 200 — matches site trailingSlash: 'always'). */
const ENTRY_SMOKE = [
  '/',
  '/blog/',
  '/blog/heic-vs-jpg/',
  '/image/',
  '/image/heic-to-jpg/',
  '/pdf/merge-pdf/',
  '/calculator/bmi/',
  '/pro/',
];

/**
 * Without trailing slash, `astro preview` on static output often returns 404 (no redirect).
 * Production hosts may 301/308 to /path/. We only warn here — not a failure.
 */
const NO_SLASH_ADVISORY = ['/blog/heic-vs-jpg', '/image/heic-to-jpg', '/calculator/bmi'];

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

function toLocal(loc) {
  try {
    const u = new URL(loc);
    return `${base}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

async function fetchStatus(url, init = {}) {
  const res = await fetch(url, { redirect: 'follow', ...init });
  return { status: res.status, finalUrl: res.url };
}

async function waitForReady(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { status } = await fetchStatus(`${base}/`);
      if (status === 200) return;
    } catch {
      /* preview not listening yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Preview did not return 200 at ${base}/ within ${maxMs}ms`);
}

async function main() {
  if (!fs.existsSync(sitemapPath)) {
    console.error('regression-preview: run npm run build first (missing dist/sitemap-0.xml)');
    process.exit(1);
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const prodLocs = extractLocs(xml);
  if (prodLocs.length === 0) {
    console.error('regression-preview: no <loc> in sitemap-0.xml');
    process.exit(1);
  }

  const astroMjs = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(process.execPath, [astroMjs, 'preview', '--host', HOST, '--port', PORT], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  let stderr = '';
  child.stderr?.on('data', (d) => {
    stderr += d.toString();
  });

  let exitCode = 0;
  try {
    await waitForReady();

    const failures = [];
    const localUrls = prodLocs.map(toLocal).filter(Boolean);

    for (let i = 0; i < localUrls.length; i++) {
      const url = localUrls[i];
      try {
        const { status, finalUrl } = await fetchStatus(url);
        if (status !== 200) failures.push({ url, status, finalUrl, phase: 'sitemap' });
      } catch (e) {
        failures.push({ url, status: 'ERR', error: e.message, phase: 'sitemap' });
      }
    }

    for (const p of ENTRY_SMOKE) {
      const url = `${base}${p}`;
      try {
        const { status } = await fetchStatus(url);
        if (status !== 200) failures.push({ url, status, phase: 'entry-smoke' });
      } catch (e) {
        failures.push({ url, status: 'ERR', error: e.message, phase: 'entry-smoke' });
      }
    }

    let advisory = 0;
    for (const p of NO_SLASH_ADVISORY) {
      const url = `${base}${p}`;
      try {
        const res = await fetch(url, { redirect: 'manual' });
        if (res.status === 404) advisory++;
        else if (res.status !== 200 && res.status !== 301 && res.status !== 302 && res.status !== 307 && res.status !== 308) {
          failures.push({ url, status: res.status, phase: 'no-slash-advisory', note: 'unexpected' });
        }
      } catch (e) {
        failures.push({ url, status: 'ERR', error: e.message, phase: 'no-slash-advisory' });
      }
    }
    if (advisory > 0) {
      console.warn(
        `regression-preview: note — ${advisory} path(s) without trailing / returned 404 under astro preview (static). Canonical URLs use a trailing /. Production may redirect.`,
      );
    }

    if (failures.length) {
      console.error('regression-preview: failures:');
      for (const f of failures) console.error(' ', JSON.stringify(f));
      exitCode = 1;
    } else {
      console.log(
        `regression-preview: OK — ${localUrls.length} sitemap URL(s) + ${ENTRY_SMOKE.length} entry smoke check(s) returned 200 at ${base}`,
      );
    }
  } catch (e) {
    console.error('regression-preview:', e.message);
    if (stderr) console.error(stderr.slice(-2000));
    exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 400));
  }
  process.exit(exitCode);
}

main();
