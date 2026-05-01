// Lightweight JSON syntax highlighter — converts a JSON string into HTML
// with span tags for keys, strings, numbers, booleans, null, and punctuation.
// No external dependencies. Safe against XSS by escaping HTML entities first.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightJson(input: string): string {
  const escaped = escapeHtml(input);

  // Token regex — order matters
  // 1. Strings (with escape handling)
  // 2. Numbers
  // 3. Booleans
  // 4. null
  // 5. Punctuation
  return escaped.replace(
    /(&quot;(?:\\.|[^\\&]|&(?!quot;))*?&quot;)(\s*:)?|(\b-?\d+\.?\d*(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],])/g,
    (_match, str, colon, num, bool, nullVal, punct) => {
      if (str !== undefined) {
        if (colon) {
          // It's a key (followed by colon)
          return `<span class="jh-key">${str}</span><span class="jh-punct">${colon}</span>`;
        }
        return `<span class="jh-string">${str}</span>`;
      }
      if (num !== undefined) return `<span class="jh-number">${num}</span>`;
      if (bool !== undefined) return `<span class="jh-bool">${bool}</span>`;
      if (nullVal !== undefined) return `<span class="jh-null">${nullVal}</span>`;
      if (punct !== undefined) return `<span class="jh-punct">${punct}</span>`;
      return _match;
    }
  );
}
