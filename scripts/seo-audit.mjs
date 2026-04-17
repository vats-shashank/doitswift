// Run after `npm run build`. Validates sitemap ↔ dist, canonical / og:url, built HTML href hygiene,
// and source files for risky absolute URLs (http, doitswift.com page URLs without trailing slash).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const SITE_ORIGIN = 'https://doitswift.com';

const ASSET_EXT = /\.(svg|png|jpe?g|gif|webp|ico|css|js|mjs|txt|xml|woff2?|map|html|pdf|zip)$/i;

function fail(msg) {
  console.error('seo-audit FAIL:', msg);
  process.exit(1);
}

if (!fs.existsSync(dist)) fail('dist/ missing — run npm run build first.');

/** --- 1) Sitemap locs resolve to built files --- */
function readSitemapLocs() {
  const p = path.join(dist, 'sitemap-0.xml');
  if (!fs.existsSync(p)) fail('dist/sitemap-0.xml missing');
  const xml = fs.readFileSync(p, 'utf8');
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  if (locs.length === 0) fail('sitemap-0.xml has no <loc> entries');
  return locs;
}

function locToDistIndex(loc) {
  const u = new URL(loc);
  if (u.origin !== SITE_ORIGIN) return { ok: false, err: `wrong origin: ${u.origin}` };
  const p = u.pathname;
  if (p !== '/' && !p.endsWith('/')) return { ok: false, err: 'loc pathname must end with /' };
  const rel = p === '/' ? 'index.html' : path.join(...p.split('/').filter(Boolean), 'index.html');
  const fp = path.join(dist, rel);
  if (!fs.existsSync(fp)) return { ok: false, err: `missing ${rel}` };
  return { ok: true, fp, rel };
}

const locs = readSitemapLocs();
for (const loc of locs) {
  const r = locToDistIndex(loc);
  if (!r.ok) fail(`${loc}: ${r.err}`);
}

/** --- 2) sitemap-index.xml points at sitemap-0.xml --- */
const idxPath = path.join(dist, 'sitemap-index.xml');
if (!fs.existsSync(idxPath)) fail('dist/sitemap-index.xml missing');
const idxXml = fs.readFileSync(idxPath, 'utf8');
if (!idxXml.includes('sitemap-0.xml')) fail('sitemap-index.xml does not reference sitemap-0.xml');

/** --- 3) robots.txt --- */
const robotsPath = path.join(dist, 'robots.txt');
if (!fs.existsSync(robotsPath)) fail('dist/robots.txt missing');
const robots = fs.readFileSync(robotsPath, 'utf8');
if (!/Sitemap:\s*https:\/\/doitswift\.com\/sitemap-index\.xml/i.test(robots)) {
  fail('robots.txt missing Sitemap: https://doitswift.com/sitemap-index.xml');
}

/** --- 4) Walk built HTML (skip _astro) --- */
function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_astro') continue;
      walkHtml(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function extractCanonicalHrefs(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const hrefs = [];
  for (const tag of tags) {
    if (!/\brel\s*=\s*["']canonical["']/i.test(tag)) continue;
    const hm = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (hm) hrefs.push(hm[1]);
  }
  return hrefs;
}

function extractOgUrl(html) {
  let m = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1];
  m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i);
  return m ? m[1] : null;
}

const issues = [];
const htmlFiles = walkHtml(dist);

for (const fp of htmlFiles) {
  const rel = path.relative(dist, fp).replace(/\\/g, '/');
  const html = fs.readFileSync(fp, 'utf8');
  const canons = extractCanonicalHrefs(html);

  if (canons.length === 0) {
    issues.push(`${rel}: missing <link rel="canonical">`);
    continue;
  }
  if (canons.length > 1) {
    issues.push(`${rel}: multiple canonical links (${canons.length})`);
    continue;
  }

  const c = canons[0];
  if (!c.startsWith(`${SITE_ORIGIN}/`) && c !== `${SITE_ORIGIN}/`) {
    if (c === SITE_ORIGIN) issues.push(`${rel}: canonical should use ${SITE_ORIGIN}/ (with slash)`);
    else if (!c.startsWith('https://')) issues.push(`${rel}: canonical must be absolute https (${c})`);
    else issues.push(`${rel}: canonical not under ${SITE_ORIGIN}/ (${c})`);
  }
  if (c.startsWith(SITE_ORIGIN) && c.length > SITE_ORIGIN.length + 1) {
    const pathPart = c.slice(SITE_ORIGIN.length);
    if (!pathPart.endsWith('/')) issues.push(`${rel}: canonical path must end with / (${c})`);
  }

  const og = extractOgUrl(html);
  if (og && og !== c) {
    issues.push(`${rel}: og:url !== canonical\n  canonical: ${c}\n  og:url:     ${og}`);
  }

  const hrefs = html.matchAll(/\bhref\s*=\s*["'](\/[^"']*)["']/gi);
  for (const m of hrefs) {
    const h = m[1];
    if (h === '/' || h.startsWith('/#') || h.startsWith('/_')) continue;
    if (ASSET_EXT.test(h)) continue;
    if (h.endsWith('/')) continue;
    issues.push(`${rel}: page href missing trailing slash: ${h}`);
  }
}

/** --- 5) Source scan: http://doitswift, absolute page URLs without trailing slash --- */
function walkSrc(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(p, exts, out);
    else if (exts.some((ext) => e.name.endsWith(ext))) out.push(p);
  }
  return out;
}

const srcFiles = walkSrc(path.join(root, 'src'), ['.astro']);
const readme = path.join(root, 'README.md');
if (fs.existsSync(readme)) srcFiles.push(readme);

const absDoitSwiftRe = /https:\/\/doitswift\.com(\/[^"'\\\s>\)]+)/gi;

for (const fp of srcFiles) {
  const text = fs.readFileSync(fp, 'utf8');
  const rel = path.relative(root, fp).replace(/\\/g, '/');
  if (/http:\/\/doitswift\.com/i.test(text)) {
    issues.push(`${rel}: uses http://doitswift.com (use https)`);
  }
  let m;
  absDoitSwiftRe.lastIndex = 0;
  while ((m = absDoitSwiftRe.exec(text)) !== null) {
    let pathPart = m[1].replace(/[,;.]+$/, '');
    if (pathPart === '' || pathPart === '/') continue;
    if (pathPart.endsWith('/')) continue;
    if (ASSET_EXT.test(pathPart)) continue;
    issues.push(`${rel}: absolute page URL missing trailing slash: https://doitswift.com${pathPart}`);
  }
}

if (issues.length) {
  console.error('seo-audit found issues:\n');
  for (const i of issues) console.error(i);
  process.exit(1);
}

console.log(
  `seo-audit OK — ${locs.length} sitemap URL(s), ${htmlFiles.length} HTML file(s), robots + sitemap-index OK, canonical/og + href hygiene OK, source URL scan OK.`,
);
