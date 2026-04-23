// After `npm run build`, checks root-relative hrefs in src .astro files and README.md
// against dist (pages) and public or dist (static assets).
// Covers `href="/path/"` in markup and `href: '/path/'` in frontmatter / data arrays.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      walk(p, exts, out);
    } else if (exts.some((ext) => e.name.endsWith(ext))) out.push(p);
  }
  return out;
}

function pageOrAssetExists(hrefPath) {
  const rel = hrefPath.replace(/\/$/, '').replace(/^\//, '');
  const low = hrefPath.toLowerCase();
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|txt|xml|woff2?|map|html|csv)$/.test(low)) {
    const pub = path.join(root, 'public', rel);
    const d = path.join(dist, rel);
    return fs.existsSync(pub) || fs.existsSync(d);
  }
  if (!rel) return fs.existsSync(path.join(dist, 'index.html'));
  const asDir = path.join(dist, rel, 'index.html');
  if (fs.existsSync(asDir)) return true;
  const asHtml = path.join(dist, `${rel}.html`);
  if (fs.existsSync(asHtml)) return true;
  return false;
}

const files = [...walk(path.join(root, 'src'), ['.astro'])];
const readme = path.join(root, 'README.md');
if (fs.existsSync(readme)) files.push(readme);

const hrefRe = /href=["'](\/[^"'#?]*)/g;
const hrefColonRe = /href:\s*["'](\/[^"'#?]*)["']/g;
const hrefs = new Set();
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = hrefRe.exec(c))) hrefs.add(m[1]);
  while ((m = hrefColonRe.exec(c))) hrefs.add(m[1]);
}

const missing = [];
for (const h of [...hrefs].sort()) {
  if (!pageOrAssetExists(h)) missing.push(h);
}

if (missing.length) {
  console.error('check-internal-links: missing targets:');
  for (const h of missing) console.error(' ', h);
  process.exit(1);
}
console.log(`check-internal-links: OK — ${hrefs.size} unique root-relative href(s) resolve under dist/public.`);
