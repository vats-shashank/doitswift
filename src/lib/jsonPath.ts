// JSONPath query parser and evaluator
// Supports a safe subset of JSONPath syntax (Goessner-style).
//
// Supported syntax:
//   $              root
//   .key           child by name
//   ['key']        bracket child (allows special chars)
//   ['a','b']      multiple bracket children
//   [0]            array index (negative allowed: [-1])
//   [1:5], [::2]   array slice
//   [*]            wildcard (all array items / all object values)
//   .*             same as [*] for objects
//   ..             recursive descent
//   [?(@.x > 5)]   filter expression
//
// Filter operators: == != < <= > >= && ||
// Filter operands: numbers, strings (quoted), true/false/null, @.path expressions
//
// NOT supported (raises a parse error):
//   script expressions [(...)]
//   functions length() / count() / etc.
//   union of paths beyond bracket-list (path1, path2)

export interface PathMatch {
  value: any;
  path: string; // JSON pointer style: /users/0/email
  pathSegments: (string | number)[];
}

export interface QueryResult {
  ok: true;
  matches: PathMatch[];
}

export interface QueryError {
  ok: false;
  message: string;
  position?: number;
}

export type QueryOutcome = QueryResult | QueryError;

// ─────────────────────────────────────────────────────────────────────────────
// Tokenizer
// ─────────────────────────────────────────────────────────────────────────────

type Token =
  | { type: 'root' }
  | { type: 'dot' }
  | { type: 'recursive' }
  | { type: 'name'; value: string }
  | { type: 'wildcard' }
  | { type: 'lbracket' }
  | { type: 'rbracket' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'colon' }
  | { type: 'comma' }
  | { type: 'question' }
  | { type: 'at' }
  | { type: 'op'; value: string };

class Tokenizer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === ' ' || c === '\t' || c === '\n') {
        this.pos++;
        continue;
      }
      if (c === '$') {
        tokens.push({ type: 'root' });
        this.pos++;
        continue;
      }
      if (c === '.') {
        if (this.input[this.pos + 1] === '.') {
          tokens.push({ type: 'recursive' });
          this.pos += 2;
        } else {
          tokens.push({ type: 'dot' });
          this.pos++;
        }
        continue;
      }
      if (c === '*') {
        tokens.push({ type: 'wildcard' });
        this.pos++;
        continue;
      }
      if (c === '[') {
        tokens.push({ type: 'lbracket' });
        this.pos++;
        continue;
      }
      if (c === ']') {
        tokens.push({ type: 'rbracket' });
        this.pos++;
        continue;
      }
      if (c === '(') {
        tokens.push({ type: 'lparen' });
        this.pos++;
        continue;
      }
      if (c === ')') {
        tokens.push({ type: 'rparen' });
        this.pos++;
        continue;
      }
      if (c === ':') {
        tokens.push({ type: 'colon' });
        this.pos++;
        continue;
      }
      if (c === ',') {
        tokens.push({ type: 'comma' });
        this.pos++;
        continue;
      }
      if (c === '?') {
        tokens.push({ type: 'question' });
        this.pos++;
        continue;
      }
      if (c === '@') {
        tokens.push({ type: 'at' });
        this.pos++;
        continue;
      }
      if (c === "'" || c === '"') {
        tokens.push(this.readString(c));
        continue;
      }
      if (c === '-' || (c >= '0' && c <= '9')) {
        tokens.push(this.readNumber());
        continue;
      }
      if (this.isOpStart(c)) {
        tokens.push(this.readOp());
        continue;
      }
      if (this.isNameStart(c)) {
        tokens.push(this.readName());
        continue;
      }
      throw new Error(`Unexpected character '${c}' at position ${this.pos}`);
    }
    return tokens;
  }

  private readString(quote: string): Token {
    this.pos++; // skip opening quote
    let value = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\') {
        this.pos++;
        const esc = this.input[this.pos];
        if (esc === 'n') value += '\n';
        else if (esc === 't') value += '\t';
        else if (esc === '\\') value += '\\';
        else if (esc === quote) value += quote;
        else value += esc;
        this.pos++;
      } else {
        value += this.input[this.pos++];
      }
    }
    if (this.pos >= this.input.length) throw new Error(`Unterminated string at position ${this.pos}`);
    this.pos++; // skip closing quote
    return { type: 'string', value };
  }

  private readNumber(): Token {
    let str = '';
    if (this.input[this.pos] === '-') {
      str += '-';
      this.pos++;
    }
    while (this.pos < this.input.length && this.input[this.pos] >= '0' && this.input[this.pos] <= '9') {
      str += this.input[this.pos++];
    }
    if (this.input[this.pos] === '.') {
      str += '.';
      this.pos++;
      while (this.pos < this.input.length && this.input[this.pos] >= '0' && this.input[this.pos] <= '9') {
        str += this.input[this.pos++];
      }
    }
    return { type: 'number', value: parseFloat(str) };
  }

  private isOpStart(c: string): boolean {
    return c === '=' || c === '!' || c === '<' || c === '>' || c === '&' || c === '|';
  }

  private readOp(): Token {
    let op = this.input[this.pos++];
    if (op === '=' && this.input[this.pos] === '=') {
      op = '==';
      this.pos++;
    } else if (op === '!' && this.input[this.pos] === '=') {
      op = '!=';
      this.pos++;
    } else if (op === '<' && this.input[this.pos] === '=') {
      op = '<=';
      this.pos++;
    } else if (op === '>' && this.input[this.pos] === '=') {
      op = '>=';
      this.pos++;
    } else if (op === '&' && this.input[this.pos] === '&') {
      op = '&&';
      this.pos++;
    } else if (op === '|' && this.input[this.pos] === '|') {
      op = '||';
      this.pos++;
    }
    return { type: 'op', value: op };
  }

  private isNameStart(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isNameChar(c: string): boolean {
    return this.isNameStart(c) || (c >= '0' && c <= '9');
  }

  private readName(): Token {
    let value = '';
    while (this.pos < this.input.length && this.isNameChar(this.input[this.pos])) {
      value += this.input[this.pos++];
    }
    return { type: 'name', value };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AST
// ─────────────────────────────────────────────────────────────────────────────

type Step =
  | { type: 'name'; value: string }
  | { type: 'wildcard' }
  | { type: 'index'; value: number }
  | { type: 'slice'; start: number | null; end: number | null; step: number }
  | { type: 'names'; values: string[] }
  | { type: 'indices'; values: number[] }
  | { type: 'recursive' }
  | { type: 'filter'; expr: FilterExpr };

type FilterExpr =
  | { type: 'comparison'; op: string; left: FilterOperand; right: FilterOperand }
  | { type: 'logical'; op: '&&' | '||'; left: FilterExpr; right: FilterExpr }
  | { type: 'existence'; path: string[] };

type FilterOperand =
  | { kind: 'literal'; value: any }
  | { kind: 'path'; segments: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Step[] {
    const steps: Step[] = [];
    if (this.tokens.length === 0) throw new Error('Empty query');
    if (this.tokens[0].type !== 'root') throw new Error('Query must start with $');
    this.pos++;
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.type === 'dot') {
        this.pos++;
        const next = this.tokens[this.pos];
        if (next.type === 'wildcard') {
          steps.push({ type: 'wildcard' });
          this.pos++;
        } else if (next.type === 'name') {
          steps.push({ type: 'name', value: next.value });
          this.pos++;
        } else {
          throw new Error(`Expected name or * after '.' at token ${this.pos}`);
        }
      } else if (t.type === 'recursive') {
        this.pos++;
        steps.push({ type: 'recursive' });
        // After .. we need a step indicating WHAT we're descending toward
        const next = this.tokens[this.pos];
        if (!next) throw new Error('Expected expression after ..');
        if (next.type === 'wildcard') {
          steps.push({ type: 'wildcard' });
          this.pos++;
        } else if (next.type === 'name') {
          steps.push({ type: 'name', value: next.value });
          this.pos++;
        } else if (next.type === 'lbracket') {
          steps.push(this.parseBracket());
        } else throw new Error(`Unexpected token after ..`);
      } else if (t.type === 'lbracket') {
        steps.push(this.parseBracket());
      } else {
        throw new Error(`Unexpected token: ${JSON.stringify(t)} at position ${this.pos}`);
      }
    }
    return steps;
  }

  private parseBracket(): Step {
    if (this.tokens[this.pos].type !== 'lbracket') throw new Error('Expected [');
    this.pos++; // skip [
    const t = this.tokens[this.pos];
    let result: Step;

    if (t.type === 'wildcard') {
      this.pos++;
      result = { type: 'wildcard' };
    } else if (t.type === 'string') {
      // Could be ['key'] or ['k1','k2']
      const names: string[] = [t.value];
      this.pos++;
      while (this.tokens[this.pos]?.type === 'comma') {
        this.pos++;
        const nt = this.tokens[this.pos];
        if (nt?.type !== 'string') throw new Error('Expected string in name list');
        names.push(nt.value);
        this.pos++;
      }
      result = names.length === 1 ? { type: 'name', value: names[0] } : { type: 'names', values: names };
    } else if (t.type === 'number') {
      // Could be index, slice, or comma-separated indices
      const next = this.tokens[this.pos + 1];
      if (next?.type === 'colon') {
        // Slice starting with number
        result = this.parseSlice(t.value);
      } else if (next?.type === 'comma') {
        const indices: number[] = [t.value];
        this.pos++;
        while (this.tokens[this.pos]?.type === 'comma') {
          this.pos++;
          const nt = this.tokens[this.pos];
          if (nt?.type !== 'number') throw new Error('Expected number in index list');
          indices.push(nt.value);
          this.pos++;
        }
        result = { type: 'indices', values: indices };
      } else {
        result = { type: 'index', value: t.value };
        this.pos++;
      }
    } else if (t.type === 'colon') {
      result = this.parseSlice(null);
    } else if (t.type === 'question') {
      this.pos++;
      if (this.tokens[this.pos]?.type !== 'lparen') throw new Error('Expected ( after ?');
      this.pos++;
      const expr = this.parseFilterExpr();
      if (this.tokens[this.pos]?.type !== 'rparen') throw new Error('Expected ) to close filter');
      this.pos++;
      result = { type: 'filter', expr };
    } else {
      throw new Error(`Unexpected token in bracket: ${JSON.stringify(t)}`);
    }

    if (this.tokens[this.pos]?.type !== 'rbracket') throw new Error('Expected ]');
    this.pos++;
    return result;
  }

  private parseSlice(start: number | null): Step {
    let end: number | null = null;
    let step = 1;
    // start could be passed in, or pos is on : already
    if (start !== null) {
      this.pos++; // skip start number
    }
    if (this.tokens[this.pos]?.type !== 'colon') throw new Error('Expected :');
    this.pos++; // skip first :
    // Parse end
    if (this.tokens[this.pos]?.type === 'number') {
      end = (this.tokens[this.pos] as Extract<Token, { type: 'number' }>).value;
      this.pos++;
    }
    // Optional :step
    if (this.tokens[this.pos]?.type === 'colon') {
      this.pos++;
      if (this.tokens[this.pos]?.type === 'number') {
        step = (this.tokens[this.pos] as Extract<Token, { type: 'number' }>).value;
        this.pos++;
      }
    }
    return { type: 'slice', start, end, step };
  }

  // Filter expression: handles comparison, logical &&/||
  // Precedence: && > || (left-associative)
  private parseFilterExpr(): FilterExpr {
    let left = this.parseAndExpr();
    while (this.tokens[this.pos]?.type === 'op' && (this.tokens[this.pos] as any).value === '||') {
      this.pos++;
      const right = this.parseAndExpr();
      left = { type: 'logical', op: '||', left, right };
    }
    return left;
  }

  private parseAndExpr(): FilterExpr {
    let left = this.parseComparison();
    while (this.tokens[this.pos]?.type === 'op' && (this.tokens[this.pos] as any).value === '&&') {
      this.pos++;
      const right = this.parseComparison();
      left = { type: 'logical', op: '&&', left, right };
    }
    return left;
  }

  private parseComparison(): FilterExpr {
    const left = this.parseOperand();
    const t = this.tokens[this.pos];
    if (t?.type === 'op' && ['==', '!=', '<', '<=', '>', '>='].includes((t as any).value)) {
      this.pos++;
      const right = this.parseOperand();
      return { type: 'comparison', op: (t as any).value, left, right };
    }
    // Existence test: just @.foo (no operator)
    if (left.kind === 'path') {
      return { type: 'existence', path: left.segments };
    }
    throw new Error('Expected comparison operator');
  }

  private parseOperand(): FilterOperand {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('Unexpected end of filter');

    if (t.type === 'string') {
      this.pos++;
      return { kind: 'literal', value: t.value };
    }
    if (t.type === 'number') {
      this.pos++;
      return { kind: 'literal', value: t.value };
    }
    if (t.type === 'name') {
      // true / false / null
      if (t.value === 'true') {
        this.pos++;
        return { kind: 'literal', value: true };
      }
      if (t.value === 'false') {
        this.pos++;
        return { kind: 'literal', value: false };
      }
      if (t.value === 'null') {
        this.pos++;
        return { kind: 'literal', value: null };
      }
      throw new Error(`Unknown identifier: ${t.value}`);
    }
    if (t.type === 'at') {
      this.pos++;
      const segments: string[] = [];
      while (this.tokens[this.pos]?.type === 'dot' || this.tokens[this.pos]?.type === 'lbracket') {
        if (this.tokens[this.pos].type === 'dot') {
          this.pos++;
          const nt = this.tokens[this.pos];
          if (nt?.type !== 'name') throw new Error('Expected name after .');
          segments.push(nt.value);
          this.pos++;
        } else {
          // bracket
          this.pos++;
          const bt = this.tokens[this.pos];
          if (bt?.type === 'string') {
            segments.push(bt.value);
            this.pos++;
          } else if (bt?.type === 'number') {
            segments.push(String(bt.value));
            this.pos++;
          } else throw new Error('Expected name or number in bracket');
          if (this.tokens[this.pos]?.type !== 'rbracket') throw new Error('Expected ]');
          this.pos++;
        }
      }
      return { kind: 'path', segments };
    }
    throw new Error(`Unexpected operand: ${JSON.stringify(t)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluator
// ─────────────────────────────────────────────────────────────────────────────

function getAtPath(value: any, segments: string[]): any {
  let cursor = value;
  for (const seg of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = cursor[seg];
  }
  return cursor;
}

function evaluateFilter(expr: FilterExpr, currentItem: any): boolean {
  if (expr.type === 'logical') {
    const l = evaluateFilter(expr.left, currentItem);
    if (expr.op === '&&') return l && evaluateFilter(expr.right, currentItem);
    return l || evaluateFilter(expr.right, currentItem);
  }
  if (expr.type === 'existence') {
    return getAtPath(currentItem, expr.path) !== undefined;
  }
  // comparison
  const leftVal = expr.left.kind === 'literal' ? expr.left.value : getAtPath(currentItem, expr.left.segments);
  const rightVal = expr.right.kind === 'literal' ? expr.right.value : getAtPath(currentItem, expr.right.segments);
  switch (expr.op) {
    case '==':
      return leftVal === rightVal;
    case '!=':
      return leftVal !== rightVal;
    case '<':
      return leftVal < rightVal;
    case '<=':
      return leftVal <= rightVal;
    case '>':
      return leftVal > rightVal;
    case '>=':
      return leftVal >= rightVal;
  }
  return false;
}

interface EvalState {
  matches: PathMatch[];
}

function buildPathString(segments: (string | number)[]): string {
  if (segments.length === 0) return '';
  return (
    '/' +
    segments
      .map((s) => {
        if (typeof s === 'number') return String(s);
        return s.replace(/~/g, '~0').replace(/\//g, '~1');
      })
      .join('/')
  );
}

function applyStep(value: any, segments: (string | number)[], step: Step, remaining: Step[], state: EvalState) {
  // If step is recursive descent, we need to walk the entire subtree
  if (step.type === 'recursive') {
    // Apply remaining[0] to value AND to all descendants
    if (remaining.length === 0) {
      // Bare .. — match every node
      collectAll(value, segments, state);
      return;
    }
    const nextStep = remaining[0];
    const restAfterNext = remaining.slice(1);
    walkRecursive(value, segments, nextStep, restAfterNext, state);
    return;
  }

  if (step.type === 'name') {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && step.value in value) {
      const newSegs = [...segments, step.value];
      if (remaining.length === 0) {
        state.matches.push({ value: value[step.value], path: buildPathString(newSegs), pathSegments: newSegs });
      } else {
        applyStep(value[step.value], newSegs, remaining[0], remaining.slice(1), state);
      }
    }
    return;
  }

  if (step.type === 'names') {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const name of step.values) {
        if (name in value) {
          const newSegs = [...segments, name];
          if (remaining.length === 0) {
            state.matches.push({ value: value[name], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[name], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      }
    }
    return;
  }

  if (step.type === 'index') {
    if (Array.isArray(value)) {
      const idx = step.value < 0 ? value.length + step.value : step.value;
      if (idx >= 0 && idx < value.length) {
        const newSegs = [...segments, idx];
        if (remaining.length === 0) {
          state.matches.push({ value: value[idx], path: buildPathString(newSegs), pathSegments: newSegs });
        } else {
          applyStep(value[idx], newSegs, remaining[0], remaining.slice(1), state);
        }
      }
    }
    return;
  }

  if (step.type === 'indices') {
    if (Array.isArray(value)) {
      for (const i of step.values) {
        const idx = i < 0 ? value.length + i : i;
        if (idx >= 0 && idx < value.length) {
          const newSegs = [...segments, idx];
          if (remaining.length === 0) {
            state.matches.push({ value: value[idx], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[idx], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      }
    }
    return;
  }

  if (step.type === 'slice') {
    if (Array.isArray(value)) {
      const len = value.length;
      const start =
        step.start === null ? 0 : step.start < 0 ? Math.max(0, len + step.start) : Math.min(step.start, len);
      const end = step.end === null ? len : step.end < 0 ? Math.max(0, len + step.end) : Math.min(step.end, len);
      const stepSize = step.step || 1;
      if (stepSize > 0) {
        for (let i = start; i < end; i += stepSize) {
          const newSegs = [...segments, i];
          if (remaining.length === 0) {
            state.matches.push({ value: value[i], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[i], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      } else if (stepSize < 0) {
        for (let i = end - 1; i >= start; i += stepSize) {
          const newSegs = [...segments, i];
          if (remaining.length === 0) {
            state.matches.push({ value: value[i], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[i], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      }
    }
    return;
  }

  if (step.type === 'wildcard') {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const newSegs = [...segments, i];
        if (remaining.length === 0) {
          state.matches.push({ value: value[i], path: buildPathString(newSegs), pathSegments: newSegs });
        } else {
          applyStep(value[i], newSegs, remaining[0], remaining.slice(1), state);
        }
      }
    } else if (value !== null && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        const newSegs = [...segments, key];
        if (remaining.length === 0) {
          state.matches.push({ value: value[key], path: buildPathString(newSegs), pathSegments: newSegs });
        } else {
          applyStep(value[key], newSegs, remaining[0], remaining.slice(1), state);
        }
      }
    }
    return;
  }

  if (step.type === 'filter') {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (evaluateFilter(step.expr, value[i])) {
          const newSegs = [...segments, i];
          if (remaining.length === 0) {
            state.matches.push({ value: value[i], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[i], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      }
    } else if (value !== null && typeof value === 'object') {
      // Filter on object's values
      for (const key of Object.keys(value)) {
        if (evaluateFilter(step.expr, value[key])) {
          const newSegs = [...segments, key];
          if (remaining.length === 0) {
            state.matches.push({ value: value[key], path: buildPathString(newSegs), pathSegments: newSegs });
          } else {
            applyStep(value[key], newSegs, remaining[0], remaining.slice(1), state);
          }
        }
      }
    }
    return;
  }
}

function walkRecursive(value: any, segments: (string | number)[], step: Step, remaining: Step[], state: EvalState) {
  // Try applying step at this level
  applyStep(value, segments, step, remaining, state);
  // And recurse into children
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkRecursive(value[i], [...segments, i], step, remaining, state);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      walkRecursive(value[key], [...segments, key], step, remaining, state);
    }
  }
}

function collectAll(value: any, segments: (string | number)[], state: EvalState) {
  state.matches.push({ value, path: buildPathString(segments), pathSegments: segments });
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) collectAll(value[i], [...segments, i], state);
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) collectAll(value[key], [...segments, key], state);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function executeQuery(json: any, query: string): QueryOutcome {
  if (!query || !query.trim()) {
    return { ok: false, message: 'Query is empty' };
  }
  let steps: Step[];
  try {
    const tokens = new Tokenizer(query).tokenize();
    steps = new Parser(tokens).parse();
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Parse error' };
  }

  const state: EvalState = { matches: [] };
  if (steps.length === 0) {
    state.matches.push({ value: json, path: '', pathSegments: [] });
  } else {
    applyStep(json, [], steps[0], steps.slice(1), state);
  }
  return { ok: true, matches: state.matches };
}
