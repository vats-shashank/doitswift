// Convert a parsed JSON value to interactive collapsible tree HTML.
// Uses native <details> and <summary> elements for accessibility and zero-JS expand/collapse.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPrimitive(value: any): string {
  if (value === null) return `<span class="jt-null">null</span>`;
  if (typeof value === 'boolean') return `<span class="jt-bool">${value}</span>`;
  if (typeof value === 'number') return `<span class="jt-number">${value}</span>`;
  if (typeof value === 'string') return `<span class="jt-string">"${escapeHtml(value)}"</span>`;
  return `<span class="jt-unknown">${escapeHtml(String(value))}</span>`;
}

function isPrimitive(value: any): boolean {
  return value === null || typeof value !== 'object';
}

function renderNode(value: any, key: string | number | null, depth: number, isLast: boolean): string {
  const keyHtml = key !== null ? `<span class="jt-key">${typeof key === 'number' ? key : `"${escapeHtml(String(key))}"`}</span><span class="jt-punct">: </span>` : '';
  const trailingComma = isLast ? '' : '<span class="jt-punct">,</span>';

  if (isPrimitive(value)) {
    return `<div class="jt-leaf">${keyHtml}${renderPrimitive(value)}${trailingComma}</div>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<div class="jt-leaf">${keyHtml}<span class="jt-punct">[]</span>${trailingComma}</div>`;
    }
    const childrenHtml = value
      .map((item, idx) => renderNode(item, idx, depth + 1, idx === value.length - 1))
      .join('');
    const summaryText = `<span class="jt-punct">[</span><span class="jt-meta">${value.length} item${value.length === 1 ? '' : 's'}</span><span class="jt-punct">]</span>`;
    const openByDefault = depth < 2; // Auto-expand top 2 levels
    return `
      <details class="jt-node" ${openByDefault ? 'open' : ''}>
        <summary class="jt-summary">${keyHtml}${summaryText}</summary>
        <div class="jt-children">${childrenHtml}</div>
        <div class="jt-close"><span class="jt-punct">]</span>${trailingComma}</div>
      </details>
    `;
  }

  // Object
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return `<div class="jt-leaf">${keyHtml}<span class="jt-punct">{}</span>${trailingComma}</div>`;
  }
  const childrenHtml = keys
    .map((k, idx) => renderNode(value[k], k, depth + 1, idx === keys.length - 1))
    .join('');
  const summaryText = `<span class="jt-punct">{</span><span class="jt-meta">${keys.length} ${keys.length === 1 ? 'property' : 'properties'}</span><span class="jt-punct">}</span>`;
  const openByDefault = depth < 2;
  return `
    <details class="jt-node" ${openByDefault ? 'open' : ''}>
      <summary class="jt-summary">${keyHtml}${summaryText}</summary>
      <div class="jt-children">${childrenHtml}</div>
      <div class="jt-close"><span class="jt-punct">}</span>${trailingComma}</div>
    </details>
  `;
}

export function renderTree(parsed: any): string {
  return `<div class="jt-root">${renderNode(parsed, null, 0, true)}</div>`;
}

// Helper: expand all nodes in a tree container
export function expandAll(container: HTMLElement) {
  container.querySelectorAll<HTMLDetailsElement>('details.jt-node').forEach((d) => {
    d.open = true;
  });
}

// Helper: collapse all nodes in a tree container (except the root level)
export function collapseAll(container: HTMLElement) {
  container.querySelectorAll<HTMLDetailsElement>('details.jt-node').forEach((d, idx) => {
    if (idx === 0) return; // keep root open
    d.open = false;
  });
}
