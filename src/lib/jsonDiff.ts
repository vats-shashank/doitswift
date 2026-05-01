// Structural JSON diff — produces typed change entries with JSON pointer paths.
// Array elements are compared index-by-index (positional diff).
// For semantically reordered arrays, this may report changes that look like reorderings;
// document this limitation in UI hints.

export type DiffChangeKind = 'added' | 'removed' | 'changed' | 'type-changed';

export interface DiffEntry {
  kind: DiffChangeKind;
  path: string; // JSON pointer: /users/0/email
  pathSegments: (string | number)[];
  oldValue?: any;
  newValue?: any;
  oldType?: string;
  newType?: string;
}

export interface DiffResult {
  entries: DiffEntry[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    typeChanged: number;
    total: number;
  };
}

function jsonType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function pointerSegment(seg: string | number): string {
  // RFC 6901 escaping
  if (typeof seg === 'number') return String(seg);
  return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

function buildPath(segments: (string | number)[]): string {
  if (segments.length === 0) return '';
  return '/' + segments.map(pointerSegment).join('/');
}

function diffRecurse(oldVal: any, newVal: any, segments: (string | number)[], entries: DiffEntry[]) {
  const oldT = jsonType(oldVal);
  const newT = jsonType(newVal);

  // Type changed (and not a primitive value swap that's trivially handled below)
  if (oldT !== newT) {
    entries.push({
      kind: 'type-changed',
      path: buildPath(segments),
      pathSegments: [...segments],
      oldValue: oldVal,
      newValue: newVal,
      oldType: oldT,
      newType: newT,
    });
    return;
  }

  // Same type — compare structurally
  if (oldT === 'object') {
    const oldKeys = new Set(Object.keys(oldVal));
    const newKeys = new Set(Object.keys(newVal));

    // Removed keys (in old, not in new)
    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        entries.push({
          kind: 'removed',
          path: buildPath([...segments, key]),
          pathSegments: [...segments, key],
          oldValue: oldVal[key],
        });
      }
    }

    // Added keys (in new, not in old)
    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        entries.push({
          kind: 'added',
          path: buildPath([...segments, key]),
          pathSegments: [...segments, key],
          newValue: newVal[key],
        });
      }
    }

    // Common keys — recurse
    for (const key of oldKeys) {
      if (newKeys.has(key)) {
        diffRecurse(oldVal[key], newVal[key], [...segments, key], entries);
      }
    }
    return;
  }

  if (oldT === 'array') {
    const maxLen = Math.max(oldVal.length, newVal.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= oldVal.length) {
        entries.push({
          kind: 'added',
          path: buildPath([...segments, i]),
          pathSegments: [...segments, i],
          newValue: newVal[i],
        });
      } else if (i >= newVal.length) {
        entries.push({
          kind: 'removed',
          path: buildPath([...segments, i]),
          pathSegments: [...segments, i],
          oldValue: oldVal[i],
        });
      } else {
        diffRecurse(oldVal[i], newVal[i], [...segments, i], entries);
      }
    }
    return;
  }

  // Primitives
  if (!isEqualPrimitive(oldVal, newVal)) {
    entries.push({
      kind: 'changed',
      path: buildPath(segments),
      pathSegments: [...segments],
      oldValue: oldVal,
      newValue: newVal,
    });
  }
}

function isEqualPrimitive(a: any, b: any): boolean {
  // null === null; NaN handled below
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  return false;
}

export function diffJson(oldVal: any, newVal: any): DiffResult {
  const entries: DiffEntry[] = [];
  diffRecurse(oldVal, newVal, [], entries);
  let added = 0,
    removed = 0,
    changed = 0,
    typeChanged = 0;
  for (const e of entries) {
    if (e.kind === 'added') added++;
    else if (e.kind === 'removed') removed++;
    else if (e.kind === 'changed') changed++;
    else if (e.kind === 'type-changed') typeChanged++;
  }
  return {
    entries,
    summary: { added, removed, changed, typeChanged, total: entries.length },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Side-by-side rendering — produces HTML for both panes with inline highlighting
// Each change is wrapped in a span with data-diff-path so clicking can scroll to it.
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RenderContext {
  changeMap: Map<string, DiffChangeKind>; // path → change kind for that exact path
  side: 'left' | 'right';
}

function buildChangeMap(entries: DiffEntry[]): Map<string, DiffChangeKind> {
  const map = new Map<string, DiffChangeKind>();
  for (const e of entries) {
    map.set(e.path, e.kind);
  }
  return map;
}

function renderValue(value: any, ctx: RenderContext, segments: (string | number)[], indent: number): string {
  const path = buildPath(segments);
  const change = ctx.changeMap.get(path);

  // For 'removed' on right side or 'added' on left side, render placeholder
  if (change === 'removed' && ctx.side === 'right') {
    return wrapDiffMissing(' '.repeat(indent * 2) + '∅', path, 'removed');
  }
  if (change === 'added' && ctx.side === 'left') {
    return wrapDiffMissing(' '.repeat(indent * 2) + '∅', path, 'added');
  }

  const contentHtml = renderValueInner(value, ctx, segments, indent);
  if (change) return wrapDiffSpan(contentHtml, path, change);
  return contentHtml;
}

function renderValueInner(value: any, ctx: RenderContext, segments: (string | number)[], indent: number): string {
  if (value === null) return '<span class="jh-null">null</span>';
  if (typeof value === 'boolean') return `<span class="jh-bool">${value}</span>`;
  if (typeof value === 'number') return `<span class="jh-number">${value}</span>`;
  if (typeof value === 'string') return `<span class="jh-string">"${escapeHtml(value)}"</span>`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '<span class="jh-punct">[]</span>';
    const childIndent = indent + 1;
    const pad = '  '.repeat(childIndent);
    const lines: string[] = ['<span class="jh-punct">[</span>'];
    for (let i = 0; i < value.length; i++) {
      const itemSegs = [...segments, i];
      const itemPath = buildPath(itemSegs);
      const itemChange = ctx.changeMap.get(itemPath);

      // Skip rendering items that are 'added' on left or 'removed' on right (they show as ∅)
      if (itemChange === 'added' && ctx.side === 'left') {
        lines.push(`${pad}${wrapDiffMissing('∅', itemPath, 'added')}${i < value.length - 1 ? '<span class="jh-punct">,</span>' : ''}`);
        continue;
      }
      if (itemChange === 'removed' && ctx.side === 'right') {
        lines.push(`${pad}${wrapDiffMissing('∅', itemPath, 'removed')}${i < value.length - 1 ? '<span class="jh-punct">,</span>' : ''}`);
        continue;
      }

      const inner = renderValueInner(value[i], ctx, itemSegs, childIndent);
      const wrapped = itemChange ? wrapDiffSpan(inner, itemPath, itemChange) : inner;
      const comma = i < value.length - 1 ? '<span class="jh-punct">,</span>' : '';
      lines.push(`${pad}${wrapped}${comma}`);
    }
    lines.push(`${'  '.repeat(indent)}<span class="jh-punct">]</span>`);
    return lines.join('\n');
  }

  // Object
  const keys = Object.keys(value);
  if (keys.length === 0) return '<span class="jh-punct">{}</span>';
  const childIndent = indent + 1;
  const pad = '  '.repeat(childIndent);
  const lines: string[] = ['<span class="jh-punct">{</span>'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const childSegs = [...segments, key];
    const childPath = buildPath(childSegs);
    const childChange = ctx.changeMap.get(childPath);

    const keyHtml = `<span class="jh-key">"${escapeHtml(key)}"</span><span class="jh-punct">: </span>`;
    const inner = renderValueInner(value[key], ctx, childSegs, childIndent);
    const wrappedInner = childChange ? wrapDiffSpan(inner, childPath, childChange) : inner;
    const comma = i < keys.length - 1 ? '<span class="jh-punct">,</span>' : '';

    // For key-level adds/removes, wrap the entire line so the key is highlighted too
    if (childChange === 'added' || childChange === 'removed') {
      lines.push(`${pad}${wrapDiffSpan(keyHtml + inner, childPath, childChange)}${comma}`);
    } else {
      lines.push(`${pad}${keyHtml}${wrappedInner}${comma}`);
    }
  }
  lines.push(`${'  '.repeat(indent)}<span class="jh-punct">}</span>`);
  return lines.join('\n');
}

function wrapDiffSpan(content: string, path: string, kind: DiffChangeKind): string {
  return `<span class="jdf-${kind}" data-diff-path="${escapeHtml(path)}">${content}</span>`;
}

function wrapDiffMissing(content: string, path: string, kind: DiffChangeKind): string {
  return `<span class="jdf-missing jdf-${kind}-missing" data-diff-path="${escapeHtml(path)}">${content}</span>`;
}

export function renderDiffSideBySide(
  oldVal: any,
  newVal: any,
  result: DiffResult
): { leftHtml: string; rightHtml: string } {
  const changeMap = buildChangeMap(result.entries);
  const leftHtml = renderValue(oldVal, { changeMap, side: 'left' }, [], 0);
  const rightHtml = renderValue(newVal, { changeMap, side: 'right' }, [], 0);
  return { leftHtml, rightHtml };
}
