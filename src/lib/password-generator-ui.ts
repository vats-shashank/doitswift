/**
 * Password generator UI — uses crypto.getRandomValues only (see secureInt). No Math.random.
 */
import { PASSPHRASE_WORDS } from './passphraseWordlist';

const WORDS = PASSPHRASE_WORDS;
const WORD_N = WORDS.length;

const UPP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOW = 'abcdefghijklmnopqrstuvwxyz';
const NUM = '0123456789';
const SYMS = '!@#$%^&*()_+-=[]:;|.,?/';

const SIM = new Set('0Ool1I');
const AMB = new Set("{[()/'`\"~,;:.<>}\u201c\u201d");

const TIPS = [
  'For online accounts, 16+ characters with symbols is a good default when sites allow it.',
  'For WiFi passwords, passphrases of random words are often easier to share by voice than random symbols.',
  'Use a unique password for every important account, and add two-factor when offered.',
] as const;

function symOnlyInPool(pool: string): string[] {
  const u = UPP.split('').filter((c) => pool.includes(c));
  const l = LOW.split('').filter((c) => pool.includes(c));
  const n = NUM.split('').filter((c) => pool.includes(c));
  return pool.split('').filter((c) => !u.includes(c) && !l.includes(c) && !n.includes(c));
}

function u32(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] >>> 0;
}

function secureInt(max: number): number {
  if (max <= 0) throw new Error('secureInt');
  if (max === 1) return 0;
  const m = 0x100000000;
  const limit = m - (m % max);
  let x: number;
  do {
    x = u32();
  } while (x >= limit);
  return x % max;
}

function pick<T>(arr: readonly T[]): T {
  return arr[secureInt(arr.length)]!;
}

export function buildPool(
  up: boolean,
  lo: boolean,
  num: boolean,
  sym: boolean,
  exSim: boolean,
  exAmb: boolean,
  custom: string
): string | null {
  if (custom.trim().length) {
    let t = custom.split('').filter((c) => c.length);
    if (exSim) t = t.filter((c) => !SIM.has(c));
    if (exAmb) t = t.filter((c) => !AMB.has(c));
    if (!t.length) return null;
    return [...new Set(t)].join('');
  }
  let s = '';
  if (up) s += UPP;
  if (lo) s += LOW;
  if (num) s += NUM;
  if (sym) s += SYMS;
  const f = (str: string) => {
    let o = str;
    if (exSim) o = [...o].filter((c) => !SIM.has(c)).join('');
    if (exAmb) o = [...o].filter((c) => !AMB.has(c)).join('');
    return o;
  };
  s = f(s);
  return s.length ? [...new Set(s.split(''))].join('') : null;
}

function seqTriplePassword(s: string): boolean {
  for (let i = 0; i < s.length - 2; i++) {
    const a = s[i]!.charCodeAt(0);
    const b = s[i + 1]!.charCodeAt(0);
    const c = s[i + 2]!.charCodeAt(0);
    if (b === a + 1 && c === b + 1) return true;
    if (b === a - 1 && c === b - 1) return true;
  }
  return false;
}

function seqTriplePin(s: string): boolean {
  for (let i = 0; i < s.length - 2; i++) {
    const a = +s[i]!,
      b = +s[i + 1]!,
      c = +s[i + 2]!;
    if (a > 9 || a < 0) continue;
    if ((b + 10 - a) % 10 === 1 && (c + 10 - b) % 10 === 1) return true;
    if ((a + 10 - b) % 10 === 1 && (b + 10 - c) % 10 === 1) return true;
  }
  return false;
}

function repeat4(s: string): boolean {
  return /(.)\1{3,}/.test(s);
}

function genFromPool(len: number, pool: string, noSequential: boolean): string | null {
  if (!pool.length) return null;
  const u = UPP.split('').filter((c) => pool.includes(c));
  const l = LOW.split('').filter((c) => pool.includes(c));
  const n = NUM.split('').filter((c) => pool.includes(c));
  const y = symOnlyInPool(pool);

  for (let t = 0; t < 2000; t++) {
    const a: string[] = [];
    for (let i = 0; i < len; i++) a[i] = pool[secureInt(pool.length)]!;

    const s = a.join('');
    if (u.length && !a.some((c) => u.includes(c!))) continue;
    if (l.length && !a.some((c) => l.includes(c!))) continue;
    if (n.length && !a.some((c) => n.includes(c!))) continue;
    if (y.length && !a.some((c) => y.includes(c!))) continue;
    if (repeat4(s)) continue;
    if (noSequential && seqTriplePassword(s)) continue;
    return s;
  }
  return null;
}

function pickWord() {
  return WORDS[secureInt(WORD_N)]!;
}

export function genPassphrase(
  wordCount: number,
  sep: string,
  cap: boolean,
  addNum: boolean,
  addSym: boolean
): string {
  const w: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const raw = pickWord().toLowerCase();
    w.push(cap ? raw[0]!.toUpperCase() + raw.slice(1) : raw);
  }
  let s: string;
  if (sep === 'rand') {
    const seps = ['-', ' ', '.', '_'] as const;
    s = w[0] || '';
    for (let i = 1; i < w.length; i++) s += (pick([...seps]) + (w[i] || '')) as string;
  } else {
    const j = sep === ' ' ? ' ' : sep === '.' ? '.' : sep === '_' ? '_' : '-';
    s = w.join(j);
  }
  if (addNum) s += String(10 + secureInt(90));
  if (addSym) s += pick('!@#$%'.split(''));
  return s;
}

function shuffleDigitsNoRepeat(len: number): string {
  const d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 9; i > 0; i--) {
    const j = secureInt(i + 1);
    [d[i], d[j]] = [d[j]!, d[i]!];
  }
  return d
    .slice(0, len)
    .map((x) => String(x))
    .join('');
}

export function genPin(len: number, noRep: boolean, noSeq: boolean): string {
  const L = noRep ? Math.min(len, 10) : len;
  for (let a = 0; a < 2000; a++) {
    let s: string;
    if (noRep) {
      s = shuffleDigitsNoRepeat(L);
    } else {
      s = '';
      for (let i = 0; i < L; i++) s += String(secureInt(10));
    }
    if (noRep && new Set(s).size !== s.length) continue;
    if (noSeq && seqTriplePin(s)) continue;
    return s;
  }
  return '0'.repeat(L);
}

function countPassphraseWords(s: string): number {
  return s.split(/[- _.\s]+/).filter((x) => x && /^[a-zA-Z]+$/.test(x)).length;
}

export function passwordEntropyBits(pwd: string, pool: string, mode: 'p' | 'a' | 'i'): number {
  if (mode === 'a') {
    const wc = countPassphraseWords(pwd) || 1;
    let b = wc * Math.log2(WORD_N);
    if (/\d{2,}$/.test(pwd)) b += Math.log2(90);
    if (/[!@#$%]$/.test(pwd)) b += Math.log2(5);
    return b;
  }
  if (mode === 'i') {
    if (!pwd.length) return 0;
    if (new Set(pwd).size === pwd.length && pwd.length <= 10) {
      let c = 1;
      for (let i = 0; i < pwd.length; i++) c *= 10 - i;
      return Math.log2(c);
    }
    return pwd.length * Math.log2(10);
  }
  const n = new Set(pool.split('')).size;
  if (n < 2) return pwd.length;
  return pwd.length * Math.log2(n);
}

export function strengthAndCrack(
  pwd: string,
  pool: string,
  mode: 'p' | 'a' | 'i',
  hasTypes: { up: boolean; lo: boolean; num: boolean; sym: boolean }
) {
  const bits = passwordEntropyBits(pwd, pool, mode);
  const len = pwd.length;
  let lenPts = 0;
  if (len < 8) lenPts = 0;
  else if (len <= 11) lenPts = 20;
  else if (len <= 15) lenPts = 40;
  else if (len <= 19) lenPts = 60;
  else lenPts = 80;

  let varPts = 0;
  if (hasTypes.up) varPts += 5;
  if (hasTypes.lo) varPts += 5;
  if (hasTypes.num) varPts += 5;
  if (hasTypes.sym) varPts += 5;
  if (mode === 'a' || mode === 'i') varPts = 20;

  const L = (lenPts / 80) * 100;
  const V = (varPts / 20) * 100;
  const E = Math.min(bits / 120, 1) * 100;
  let score = 0.4 * L + 0.4 * V + 0.2 * E;
  if (repeat4(pwd)) score = Math.max(0, score - 10);
  const sc = Math.min(100, Math.max(0, score));

  let label = 'Very Weak';
  if (sc > 20) label = 'Weak';
  if (sc > 40) label = 'Moderate';
  if (sc > 55) label = 'Strong';
  if (sc > 75) label = 'Very Strong';

  const crack = formatCrack(bits);
  return { label, crack, bits, score: sc };
}

/**
 * Estimates at ~1T guesses/second. Displayed without mentioning that rate (internal assumption only).
 * Uses entropy bits to pick a clear, shareable time scale.
 */
function formatCrack(bits: number): string {
  if (!Number.isFinite(bits) || bits <= 0) return 'Crack time: —';
  const sec = Math.pow(2, bits) / 1e12;
  const years = sec / (365.25 * 24 * 3600);

  if (bits < 30) {
    if (sec < 0.01) return 'Crack time: under 1 second';
    if (sec < 1) return `Crack time: about ${+sec.toFixed(2)} seconds`;
    if (sec < 60) return `Crack time: about ${Math.max(1, Math.round(sec))} seconds`;
    return `Crack time: about ${(sec / 60).toFixed(0)} minutes`;
  }
  if (bits < 40) {
    const min = sec / 60;
    if (min < 2) return 'Crack time: about 1 minute';
    if (min < 100) return `Crack time: about ${Math.round(min)} minutes`;
    return `Crack time: about ${(min / 60).toFixed(1)} hours`;
  }
  if (bits < 50) {
    const days = sec / 86400;
    if (days < 1) return `Crack time: about ${Math.max(1, Math.round(sec / 3600))} hours`;
    if (days < 30) return `Crack time: about ${Math.max(1, Math.round(days))} days`;
    if (days < 500) return `Crack time: about ${Math.round(days)} days`;
    return `Crack time: about ${Math.max(1, Math.round(years))} years`;
  }
  if (bits < 60) {
    if (years < 100) return `Crack time: about ${Math.max(1, Math.round(years))} years`;
    if (years < 1e3) return `Crack time: about ${(years / 1e2).toFixed(0)} hundred years`;
    if (years < 1e5) return `Crack time: about ${(years / 1e3).toFixed(0)} thousand years`;
    return `Crack time: about ${(years / 1e6).toFixed(1)} million years`;
  }
  if (bits < 70) {
    const c = years / 100;
    if (c < 100) return `Crack time: about ${Math.max(1, Math.round(c))} centuries`;
    if (c < 1_000) return `Crack time: about ${(c / 100).toFixed(0)} millennia`;
    return `Crack time: about ${(years / 1e6).toFixed(0)} million years`;
  }
  if (bits < 80) {
    if (years < 1e3) return `Crack time: about ${Math.max(1, Math.round(years))} years`;
    if (years < 1e6) return `Crack time: about ${(years / 1e3).toFixed(0)} thousand years`;
    const m = years / 1e6;
    if (m < 1e3) return `Crack time: about ${m < 10 ? m.toFixed(1) : Math.round(m)} million years`;
    return `Crack time: about ${(years / 1e9).toFixed(1)} billion years`;
  }
  if (bits < 90) {
    if (years < 1e9) return `Crack time: about ${Math.max(1, Math.round(years / 1e6))} million years`;
    return `Crack time: about ${(years / 1e9).toFixed(1)} billion years`;
  }
  const t = years / 1e12;
  if (t < 0.001) return `Crack time: about ${(years / 1e9).toFixed(0)} billion years`;
  if (t < 1e3) {
    if (t < 0.01) return 'Crack time: about 10 billion years';
    return `Crack time: about ${t < 0.1 ? t.toFixed(2) : t < 10 ? t.toFixed(1) : Math.round(t)} trillion years`;
  }
  return 'Crack time: longer than the known age of the universe (illustrative)';
}

export function initPasswordGenerator() {
  const byId = (id: string) => document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | HTMLButtonElement
    | null;

  const out = document.getElementById('pg-output');
  const strLabel = document.getElementById('pg-strength-lbl');
  const strCrack = document.getElementById('pg-crack');
  const segs = document.querySelectorAll<HTMLElement>('.pg-strength-seg');
  const tipsEl = byId('pg-tips');
  const bulkEl = byId('pg-bulk-list');

  if (!out || !strLabel || !strCrack) return;

  function getMode(): 'p' | 'a' | 'i' {
    if (byId('pg-mode-a')?.checked) return 'a';
    if (byId('pg-mode-i')?.checked) return 'i';
    return 'p';
  }

  function getPool() {
    return buildPool(
      !!byId('pg-up')?.checked,
      !!byId('pg-lo')?.checked,
      !!byId('pg-num')?.checked,
      !!byId('pg-sym')?.checked,
      !!byId('pg-sim')?.checked,
      !!byId('pg-amb')?.checked,
      (byId('pg-custom') as HTMLTextAreaElement | null)?.value || ''
    );
  }

  function hasTypes() {
    const pool = getPool();
    if (!pool) return { up: false, lo: false, num: false, sym: false };
    return {
      up: [...pool].some((c) => UPP.includes(c)),
      lo: [...pool].some((c) => LOW.includes(c)),
      num: [...pool].some((c) => NUM.includes(c)),
      sym: symOnlyInPool(pool).length > 0,
    };
  }

  function mapSep(v: string): string {
    const m: Record<string, string> = {
      dash: '-',
      space: ' ',
      dot: '.',
      underscore: '_',
      rand: 'rand',
    };
    return m[v] || '-';
  }

  function one(): string {
    const m = getMode();
    if (m === 'a') {
      return genPassphrase(
        +((byId('pg-wc') as HTMLInputElement | null)?.value || 4),
        mapSep((byId('pg-sep') as HTMLSelectElement | null)?.value || 'dash'),
        !!byId('pg-cap')?.checked,
        !!byId('pg-nend')?.checked,
        !!byId('pg-send')?.checked
      );
    }
    if (m === 'i') {
      const plen = +((byId('pg-pinlen') as HTMLInputElement | null)?.value || 6);
      return genPin(
        plen,
        !!byId('pg-prep')?.checked,
        !!byId('pg-pseq')?.checked
      );
    }
    const pool = getPool();
    const noSeq = !!byId('pg-seq')?.checked;
    const L = +((byId('pg-len') as HTMLInputElement | null)?.value || 16);
    if (!pool) return '';
    return genFromPool(L, pool, noSeq) || '';
  }

  function setSegs(score: number) {
    const n = segs.length;
    const f = n ? Math.max(0, Math.min(n, Math.ceil((score / 100) * n))) : 0;
    segs.forEach((el, i) => {
      const on = i < f;
      el.classList.toggle('on', on);
    });
  }

  function show(s: string) {
    out.textContent = s;
    const m = getMode();
    if (m === 'a') {
      const t = strengthAndCrack(s, UPP + LOW, 'a', { up: true, lo: true, num: true, sym: true });
      strLabel.textContent = 'Strength: ' + t.label;
      strCrack.textContent = t.crack;
      setSegs(t.score);
      return;
    }
    if (m === 'i') {
      const t = strengthAndCrack(s, '012', 'i', { up: false, lo: false, num: true, sym: false });
      strLabel.textContent = 'Strength: ' + t.label;
      strCrack.textContent = t.crack;
      setSegs(t.score);
      return;
    }
    const p = getPool();
    if (!p) {
      strLabel.textContent = 'Select character types or a custom set';
      strCrack.textContent = '';
      setSegs(0);
      return;
    }
    const t = strengthAndCrack(s, p, 'p', hasTypes());
    strLabel.textContent = 'Strength: ' + t.label;
    strCrack.textContent = t.crack;
    setSegs(t.score);
  }

  function setTips() {
    if (!tipsEl) return;
    const o = secureInt(TIPS.length);
    const lines = [0, 1, 2].map((i) => {
      const t = TIPS[(o + i) % TIPS.length]!;
      return `<p class="pg-tip-line">💡 ${t}</p>`;
    });
    tipsEl.innerHTML = lines.join('');
  }

  function updateSliderLabels() {
    const a = byId('pg-len') as HTMLInputElement | null;
    const b = byId('pg-len-val');
    if (a && b) b.textContent = a.value;
    const c = byId('pg-wc') as HTMLInputElement | null;
    const d = byId('pg-wc-val');
    if (c && d) d.textContent = c.value;
    const e = byId('pg-pinlen') as HTMLInputElement | null;
    const f = byId('pg-pinlen-val');
    if (e && f) f.textContent = e.value;
  }

  function go() {
    updateSliderLabels();
    setTips();
    const s = one();
    show(s);
  }

  function setModePanels() {
    const m = getMode();
    const pp = byId('pg-panel-p');
    const pa = byId('pg-panel-a');
    const pi = byId('pg-panel-i');
    if (pp) pp.hidden = m !== 'p';
    if (pa) pa.hidden = m !== 'a';
    if (pi) pi.hidden = m !== 'i';
  }

  function updateRegenState() {
    const btn = byId('pg-regen');
    if (!btn) return;
    if (getMode() === 'p' && !getPool()) (btn as HTMLButtonElement).disabled = true;
    else (btn as HTMLButtonElement).disabled = false;
  }

  async function copyText(text: string, btn: HTMLButtonElement | null) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const old = btn.textContent;
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = old;
          btn.setAttribute('aria-pressed', 'false');
        }, 2000);
      }
    } catch {
      /* no-op */
    }
  }

  byId('pg-regen')?.addEventListener('click', () => {
    go();
  });
  byId('pg-copy')?.addEventListener('click', () => {
    if (out.textContent) void copyText(out.textContent, byId('pg-copy') as HTMLButtonElement);
  });
  byId('pg-bulk')?.addEventListener('click', () => {
    if (!bulkEl) return;
    setTips();
    bulkEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const s = one();
      const row = document.createElement('div');
      row.className = 'pg-bulk-row';
      const pre = document.createElement('code');
      pre.className = 'pg-bulk-code';
      pre.textContent = s;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg-bulk-copy';
      b.textContent = 'Copy';
      b.addEventListener('click', () => void copyText(s, b));
      row.appendChild(pre);
      row.appendChild(b);
      bulkEl.appendChild(row);
    }
  });

  [
    'pg-len',
    'pg-wc',
    'pg-pinlen',
    'pg-up',
    'pg-lo',
    'pg-num',
    'pg-sym',
    'pg-sim',
    'pg-amb',
    'pg-seq',
    'pg-custom',
    'pg-sep',
    'pg-cap',
    'pg-nend',
    'pg-send',
    'pg-prep',
    'pg-pseq',
  ].forEach((id) => {
    byId(id)?.addEventListener('input', () => {
      go();
      updateRegenState();
    });
  });
  byId('pg-mode-p')?.addEventListener('change', () => {
    setModePanels();
    go();
    updateRegenState();
  });
  byId('pg-mode-a')?.addEventListener('change', () => {
    setModePanels();
    go();
    updateRegenState();
  });
  byId('pg-mode-i')?.addEventListener('change', () => {
    setModePanels();
    go();
    updateRegenState();
  });

  setModePanels();
  go();
  updateRegenState();
}
