export interface FormatOptions {
  indent: number | 'tab';
  sortKeys: boolean;
  lenient: boolean; // accept trailing commas / single quotes / unquoted keys
}

export interface FormatResult {
  ok: true;
  output: string;
  parsed: any;
  byteCount: number;
  charCount: number;
}

export interface FormatError {
  ok: false;
  error: {
    message: string; // the raw browser error
    friendly: string; // human-readable explanation
    line: number | null; // 1-indexed
    column: number | null; // 1-indexed
    excerpt: string | null; // 3 lines of context with the error line marked
  };
}

export type FormatOutcome = FormatResult | FormatError;

// ─── Lenient JSON parsing (allow trailing commas, comments) ──────────────────
function preprocessLenient(input: string): string {
  // Remove single-line comments (// ...) and multi-line comments (/* ... */)
  // Carefully: ignore comment-like sequences inside strings
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  while (i < input.length) {
    const c = input[i];
    if (escape) {
      result += c;
      escape = false;
      i++;
      continue;
    }
    if (inString) {
      if (c === '\\') {
        result += c;
        escape = true;
        i++;
        continue;
      }
      if (c === stringChar) {
        inString = false;
      }
      result += c;
      i++;
      continue;
    }
    // Not in string
    if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
      // Convert single-quote string start to double-quote for JSON.parse compatibility
      if (c === "'") {
        result += '"';
      } else {
        result += c;
      }
      i++;
      continue;
    }
    // Single-line comment
    if (c === '/' && input[i + 1] === '/') {
      while (i < input.length && input[i] !== '\n') i++;
      continue;
    }
    // Multi-line comment
    if (c === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    result += c;
    i++;
  }
  // Convert closing single-quote strings to double-quote (paired with the opening conversion above)
  // The conversion above only changes the OPENING quote; we need to also convert the closing one.
  // Easier: do a second pass that handles full single-quoted string replacement using a regex
  // that's safe because we already stripped comments.
  result = result.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, inner) => {
    // Escape any unescaped double-quotes inside, unescape any escaped single quotes
    const cleaned = inner.replace(/\\'/g, "'").replace(/"/g, '\\"');
    return `"${cleaned}"`;
  });
  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');
  return result;
}

// ─── Browser-error normalization ─────────────────────────────────────────────
// JSON.parse throws different messages in Chrome/Safari/Firefox/Node.
// Extract a 1-indexed line and column from the input string at the position the parser failed.
function extractErrorPosition(
  input: string,
  errorMessage: string
): { line: number | null; column: number | null; position: number | null } {
  // Try to find a "position N" / "at position N" / "in JSON at position N" indicator
  const posMatch = errorMessage.match(/position\s+(\d+)/i);
  if (posMatch) {
    const position = parseInt(posMatch[1], 10);
    return { ...positionToLineColumn(input, position), position };
  }
  // Firefox: "JSON.parse: ... at line X column Y of the JSON data"
  const lineColMatch = errorMessage.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    const line = parseInt(lineColMatch[1], 10);
    const column = parseInt(lineColMatch[2], 10);
    return { line, column, position: null };
  }
  return { line: null, column: null, position: null };
}

function positionToLineColumn(input: string, position: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < Math.min(position, input.length); i++) {
    if (input[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

// ─── Friendly error messages ────────────────────────────────────────────────
function buildFriendlyMessage(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes('unexpected token') && m.includes("'")) {
    return 'Found a character the JSON parser did not expect. Most often this is a trailing comma, a missing comma, an unquoted key, or a single quote where double quotes are required.';
  }
  if (m.includes('unexpected end')) {
    return 'The JSON ended unexpectedly. You may be missing a closing } or ] bracket, or a closing " on a string.';
  }
  if (m.includes('unexpected non-whitespace character')) {
    return 'Extra characters appear after the JSON value. JSON allows only one root value — check that there is no extra text after the final } or ].';
  }
  if (m.includes('expected property name')) {
    return 'A property name was expected here. JSON requires keys to be wrapped in double quotes (for example, "name" not name).';
  }
  if (m.includes('bad control character') || m.includes('control character')) {
    return 'A control character (newline, tab, etc.) appears inside a string without being escaped. Use \\n for newline, \\t for tab, etc.';
  }
  if (m.includes('expected') && m.includes('after')) {
    return 'A required separator (comma or colon) is missing. Check that every property has a colon between key and value, and every property except the last in an object/array is followed by a comma.';
  }
  return 'Check the JSON syntax around the indicated position. Common causes: missing comma, extra comma, unquoted key, or single quotes instead of double quotes.';
}

function buildExcerpt(input: string, line: number | null): string | null {
  if (!line) return null;
  const lines = input.split('\n');
  const startLine = Math.max(1, line - 1);
  const endLine = Math.min(lines.length, line + 1);
  const out: string[] = [];
  for (let l = startLine; l <= endLine; l++) {
    const marker = l === line ? '› ' : '  ';
    out.push(`${marker}${String(l).padStart(4, ' ')} | ${lines[l - 1] || ''}`);
  }
  return out.join('\n');
}

// ─── Indent string ──────────────────────────────────────────────────────────
function indentValue(opt: number | 'tab'): string | number {
  if (opt === 'tab') return '\t';
  return opt;
}

// ─── Sort keys recursively ──────────────────────────────────────────────────
function sortObjectKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function format(input: string, options: FormatOptions): FormatOutcome {
  if (!input.trim()) {
    return {
      ok: false,
      error: {
        message: 'Input is empty',
        friendly: 'Paste or type some JSON in the input area to format it.',
        line: null,
        column: null,
        excerpt: null,
      },
    };
  }

  const source = options.lenient ? preprocessLenient(input) : input;

  let parsed: any;
  try {
    parsed = JSON.parse(source);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const { line, column } = extractErrorPosition(input, msg);
    return {
      ok: false,
      error: {
        message: msg,
        friendly: buildFriendlyMessage(msg),
        line,
        column,
        excerpt: buildExcerpt(input, line),
      },
    };
  }

  const final = options.sortKeys ? sortObjectKeys(parsed) : parsed;
  const output = JSON.stringify(final, null, indentValue(options.indent));

  return {
    ok: true,
    output,
    parsed: final,
    byteCount: new TextEncoder().encode(output).length,
    charCount: output.length,
  };
}

export function minify(input: string, lenient: boolean): FormatOutcome {
  const result = format(input, { indent: 2, sortKeys: false, lenient });
  if (!result.ok) return result;
  const minified = JSON.stringify(result.parsed);
  return {
    ok: true,
    output: minified,
    parsed: result.parsed,
    byteCount: new TextEncoder().encode(minified).length,
    charCount: minified.length,
  };
}

export function validate(input: string, lenient: boolean): FormatOutcome {
  return format(input, { indent: 2, sortKeys: false, lenient });
}
