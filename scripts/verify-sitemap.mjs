/**
 * Ensures every built index.html under dist has a matching loc in sitemap-0.xml.
 * Run after astro build. Site base is taken from the first sitemap URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const sitemapPath = path.join(dist, 'sitemap-0.xml');
const indexPath = path.join(dist, 'sitemap-index.xml');

function walkIndexHtml(dir, baseRel = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = baseRel ? `${baseRel}/${name.name}` : name.name;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...walkIndexHtml(full, rel));
    } else if (name.name === 'index.html') {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

function relToUrlPath(relPosix) {
  if (relPosix === 'index.html') return '/';
  if (relPosix.endsWith('/index.html')) {
    return `/${relPosix.slice(0, -'/index.html'.length)}/`;
  }
  return null;
}

function extractLocs(xml) {
  const locs = new Set();
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    locs.add(m[1].trim());
  }
  return locs;
}

if (!fs.existsSync(sitemapPath)) {
  console.error('verify-sitemap: missing dist/sitemap-0.xml — run astro build first.');
  process.exit(1);
}

const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
const locs = extractLocs(sitemapXml);
if (locs.size === 0) {
  console.error('verify-sitemap: no <loc> entries in sitemap-0.xml');
  process.exit(1);
}

const first = [...locs][0];
const origin = new URL(first).origin;

const rels = walkIndexHtml(dist);
const expected = new Set();
for (const rel of rels) {
  const p = relToUrlPath(rel);
  if (p) expected.add(new URL(p, origin).href);
}

const missing = [];
for (const url of expected) {
  if (!locs.has(url)) missing.push(url);
}

if (missing.length) {
  console.error('verify-sitemap: built pages missing from sitemap-0.xml:');
  for (const u of missing.sort()) console.error('  ', u);
  process.exit(1);
}

// sitemap-index should reference child sitemap(s)
if (fs.existsSync(indexPath)) {
  const idx = fs.readFileSync(indexPath, 'utf8');
  if (!idx.includes('sitemap-0.xml')) {
    console.error('verify-sitemap: sitemap-index.xml does not reference sitemap-0.xml');
    process.exit(1);
  }
}

console.log(
  `verify-sitemap: OK — ${expected.size} page URL(s) match dist (index.html) and sitemap-0.xml (${locs.size} loc(s)).`,
);
