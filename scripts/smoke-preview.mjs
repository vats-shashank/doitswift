/**
 * Starts `astro preview`, waits for HTTP 200 on /, then checks key calculator routes.
 * Requires: npm run build first. Uses port 4321 by default (Astro preview).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = process.env.PREVIEW_PORT || '4321';
const base = `http://${HOST}:${PORT}`;

const paths = [
  '/',
  '/calculator/',
  '/calculator/ppf/',
  '/calculator/emi/',
  '/calculator/fraction/',
  '/calculator/statistics/',
  '/calculator/personal-loan/',
  '/calculator/mortgage/',
];

async function fetchStatus(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return res.status;
}

async function waitForReady(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const s = await fetchStatus(`${base}/`);
      if (s === 200) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Preview did not respond with 200 at ${base}/ within ${maxMs}ms`);
}

// Invoke CLI via node + astro.mjs (avoids Windows spawn EINVAL on npm.cmd).
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

try {
  await waitForReady();
  const failures = [];
  for (const p of paths) {
    const url = new URL(p, base).href;
    const status = await fetchStatus(url);
    if (status !== 200) failures.push({ url, status });
  }
  if (failures.length) {
    console.error('smoke-preview: non-200 responses:');
    for (const f of failures) console.error(' ', f.status, f.url);
    process.exitCode = 1;
  } else {
    console.log(`smoke-preview: OK — ${paths.length} URL(s) returned 200 at ${base}`);
  }
} catch (e) {
  console.error('smoke-preview:', e.message);
  if (stderr) console.error(stderr.slice(-2000));
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
