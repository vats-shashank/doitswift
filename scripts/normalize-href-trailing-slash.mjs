// One-off / maintenance: root-relative page hrefs get a trailing slash (not static assets / /#anchors).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'src');

const staticExt = /\.(svg|png|jpe?g|gif|webp|ico|css|js|mjs|txt|xml|woff2?|map|html|pdf|zip)$/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

function normalizeContent(s) {
  const repl = (m, quote, p) => {
    if (p === '/' || p === '') return m;
    if (staticExt.test(p)) return m;
    if (p.endsWith('/')) return m;
    return `href=${quote}${p}/${quote}`;
  };
  let out = s.replace(/href=(["'])(\/[^"'#?]*?)\1/g, repl);
  // Data arrays: `href: '/calculator/sip'` (not matched by attribute pattern)
  out = out.replace(/href: '(\/(?:calculator|image|blog|pdf)\/[a-z0-9/-]+)'/g, (m, p) =>
    p.endsWith('/') ? m : `href: '${p}/'`,
  );
  return out;
}

let changed = 0;
for (const fp of walk(src)) {
  const before = fs.readFileSync(fp, 'utf8');
  const after = normalizeContent(before);
  if (after !== before) {
    fs.writeFileSync(fp, after);
    changed++;
  }
}
console.log(`normalize-href-trailing-slash: updated ${changed} file(s).`);
