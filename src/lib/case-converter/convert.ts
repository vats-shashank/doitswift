import { getSortedProper, MINOR_FOR_TITLE } from './dictionaries';

/** Split input into word-like tokens for developer cases (camel, snake, …). */
export function normalizeToWords(input: string): string[] {
  if (!input.trim()) return [];
  let s = input.trim();
  s = s.replace(/([a-z\d])([A-Z])/g, '$1 $2');
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  const raw = s.split(/[\s_\-./]+/).filter(Boolean);
  return raw.map((w) => w.toLowerCase());
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Apply dictionary longest-first in already lowercased text. */
export function applyProperNouns(lowerText: string): string {
  let out = lowerText;
  for (const [key, val] of getSortedProper()) {
    const re = new RegExp(`(?<!\\w)${escapeReg(key)}(?!\\w)`, 'gi');
    out = out.replace(re, val);
  }
  return out;
}

/** iPhone, iPad, etc. — do not re-capitalize first character. */
function isMixedCaseBrandStart(segment: string): boolean {
  return /^[a-z][A-Z]/.test(segment);
}

function capitalizeFirstWordOfFragment(frag: string) {
  const t = frag.trim();
  if (!t) return frag;
  if (/^[A-Z]{2,}$/.test(t) && t.length > 1) return frag; // all-caps
  if (isMixedCaseBrandStart(t)) return frag;
  const m = /^\s*/.exec(frag);
  const pre = m ? m[0]! : '';
  const i = m ? m[0]!.length : 0;
  if (!frag[i] || !/[a-z]/.test(frag[i]!)) return frag;
  return pre + frag[i]!.toUpperCase() + frag.slice(i + 1);
}

export function sentenceCase(text: string): string {
  return sentenceCaseWithProper(text, true);
}

/** Same as sentence case, optionally applying the proper-noun / acronym list first. */
export function sentenceCaseWithProper(text: string, useProper: boolean): string {
  if (!text.trim()) return text;
  let s = text.toLowerCase();
  if (useProper) s = applyProperNouns(s);
  const parts = s.split(/([.!?]+\s*)/g);
  for (let p = 0; p < parts.length; p += 2) {
    if (parts[p]) {
      parts[p] = capitalizeFirstWordOfFragment(parts[p]!);
    }
  }
  return parts.join('');
}

function titleCaseWord(word: string, index: number, total: number): string {
  const m = word.match(/^([^a-zA-ZÀ-ÿ0-9]*)([A-Za-zÀ-ÿ0-9']+)([^a-zA-ZÀ-ÿ0-9]*)$/);
  if (!m) return word;
  const pre = m[1] || '',
    core = m[2] || '',
    post = m[3] || '';
  if (!core) return word;
  if (/^[A-Z]{2,}$/.test(core) && !/[a-z]/.test(core)) {
    return pre + core + post;
  }
  const low = core.toLowerCase();
  if (index === 0 || index === total - 1) {
    return pre + low.charAt(0).toUpperCase() + low.slice(1) + post;
  }
  if (MINOR_FOR_TITLE.has(low)) {
    return pre + low + post;
  }
  return pre + low.charAt(0).toUpperCase() + low.slice(1) + post;
}

export function toTitleCase(text: string): string {
  if (!text) return '';
  const tokens = text.split(/(\s+)/);
  const n = Math.ceil(tokens.length / 2) || 0;
  let wi = 0;
  return tokens
    .map((p, i) => {
      if (i % 2 === 1) return p;
      const t = titleCaseWord(p, wi, n);
      wi++;
      return t;
    })
    .join('');
}

/** Title case, optionally normalizing and restoring proper nouns before the headline rules. */
export function toTitleCaseWithProper(text: string, useProper: boolean): string {
  if (!text) return '';
  let s = text.toLowerCase();
  if (useProper) s = applyProperNouns(s);
  return toTitleCase(s);
}

export function capitalizeEachWord(text: string): string {
  if (!text) return '';
  return text.split(/(\s+)/).map((p) => {
    if (!p.trim()) return p;
    return p.replace(/[A-Za-zÀ-ÿ]+/g, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
  }).join('');
}

export function toUpperCase(text: string) {
  return text.toUpperCase();
}
export function toLowerCase(text: string) {
  return text.toLowerCase();
}

function joinWords(words: string[], joiner: string, wordStyle: (w: string) => string) {
  if (words.length === 0) return '';
  return words.map(wordStyle).join(joiner);
}

function wordTitle(w: string) {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

export function toCamelCase(text: string) {
  const w = normalizeToWords(text);
  if (!w.length) return '';
  return w[0]! + w.slice(1).map((x) => wordTitle(x)).join('');
}

export function toPascalCase(text: string) {
  const w = normalizeToWords(text);
  return w.map((x) => wordTitle(x)).join('');
}

export function toSnakeCase(text: string) {
  return joinWords(
    normalizeToWords(text),
    '_',
    (x) => x
  );
}

export function toScreamingSnakeCase(text: string) {
  return toSnakeCase(text).toUpperCase();
}

export function toKebabCase(text: string) {
  return joinWords(normalizeToWords(text), '-', (x) => x);
}

export function toTrainCase(text: string) {
  return joinWords(normalizeToWords(text), '-', (x) => wordTitle(x));
}

export function toDotCase(text: string) {
  return joinWords(normalizeToWords(text), '.', (x) => x);
}

export function toPathCase(text: string) {
  return joinWords(normalizeToWords(text), '/', (x) => x);
}

let rngBuf = new Uint8Array(1);
function randomBit() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rngBuf);
    return (rngBuf[0]! & 1) === 1;
  }
  return Math.random() < 0.5;
}

export function toRandomCase(text: string) {
  return [...text]
    .map((c) => {
      if (!/[a-zA-Z]/.test(c)) return c;
      return randomBit() ? c.toUpperCase() : c.toLowerCase();
    })
    .join('');
}

export function toAlternatingCase(text: string) {
  let li = 0;
  return [...text]
    .map((c) => {
      if (!/[a-zA-Z]/.test(c)) return c;
      const u = li % 2 === 0;
      li++;
      return u ? c.toLowerCase() : c.toUpperCase();
    })
    .join('');
}

export function toInverseCase(text: string) {
  return [...text]
    .map((c) => (c === c.toUpperCase() && c !== c.toLowerCase() ? c.toLowerCase() : c.toUpperCase()))
    .join('');
}

export function toReverseText(text: string) {
  return text.split('').reverse().join('');
}

export type CaseKey =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'capWord'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'scream'
  | 'kebab'
  | 'train'
  | 'dot'
  | 'path'
  | 'alt'
  | 'inverse'
  | 'random'
  | 'reverse';

export function convertAll(input: string): Record<CaseKey, string> {
  return {
    upper: toUpperCase(input),
    lower: toLowerCase(input),
    title: toTitleCase(input),
    sentence: sentenceCase(input),
    capWord: capitalizeEachWord(input),
    camel: toCamelCase(input),
    pascal: toPascalCase(input),
    snake: toSnakeCase(input),
    scream: toScreamingSnakeCase(input),
    kebab: toKebabCase(input),
    train: toTrainCase(input),
    dot: toDotCase(input),
    path: toPathCase(input),
    alt: toAlternatingCase(input),
    inverse: toInverseCase(input),
    random: toRandomCase(input),
    reverse: toReverseText(input),
  };
}
