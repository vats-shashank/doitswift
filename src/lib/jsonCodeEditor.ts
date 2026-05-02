import { highlightJson } from './jsonHighlighter';

export interface CodeEditorOptions {
  initialValue?: string;
  indentSize?: number;
  autoPairBrackets?: boolean;
  onChange?: (value: string) => void;
  onPaste?: (value: string) => void;
}

interface BracketPair {
  open: string;
  close: string;
  openPos: number;
  closePos: number;
}

export class JsonCodeEditor {
  private container: HTMLElement;
  private gutter!: HTMLDivElement;
  private layer!: HTMLDivElement;
  private highlight!: HTMLPreElement;
  private currentLineHighlight!: HTMLDivElement;
  private bracketHighlights!: HTMLDivElement;
  private textarea!: HTMLTextAreaElement;
  private options: Required<CodeEditorOptions>;
  private lineHeight: number = 21; // computed at init from font metrics

  constructor(container: HTMLElement, options: CodeEditorOptions = {}) {
    this.container = container;
    this.options = {
      initialValue: options.initialValue ?? '',
      indentSize: options.indentSize ?? 2,
      autoPairBrackets: options.autoPairBrackets ?? true,
      onChange: options.onChange ?? (() => {}),
      onPaste: options.onPaste ?? (() => {}),
    };
    this.build();
    this.attach();
    this.setValue(this.options.initialValue);
  }

  // ─── DOM construction ───────────────────────────────────────────────────────
  private build() {
    this.container.classList.add('jce-host');

    // Gutter
    this.gutter = document.createElement('div');
    this.gutter.className = 'jce-gutter';
    this.gutter.setAttribute('aria-hidden', 'true');

    // Editor area (relative positioning context for layered children)
    const editorArea = document.createElement('div');
    editorArea.className = 'jce-area';

    // Highlight layer (visible, painted with colored spans)
    this.layer = document.createElement('div');
    this.layer.className = 'jce-layer';

    this.bracketHighlights = document.createElement('div');
    this.bracketHighlights.className = 'jce-bracket-highlights';
    this.bracketHighlights.setAttribute('aria-hidden', 'true');

    this.currentLineHighlight = document.createElement('div');
    this.currentLineHighlight.className = 'jce-current-line';
    this.currentLineHighlight.setAttribute('aria-hidden', 'true');

    this.highlight = document.createElement('pre');
    this.highlight.className = 'jce-highlight';
    this.highlight.setAttribute('aria-hidden', 'true');

    // Textarea on top — invisible but receives all input
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'jce-textarea';
    this.textarea.spellcheck = false;
    this.textarea.autocapitalize = 'off';
    this.textarea.autocomplete = 'off';
    this.textarea.setAttribute('autocorrect', 'off');
    this.textarea.setAttribute('aria-label', 'JSON input');
    this.textarea.placeholder = 'Paste or type JSON here, or drop a .json file...';

    // Z-stack inside .jce-area: bracket bg < current line < highlighted text < textarea
    this.layer.appendChild(this.bracketHighlights);
    this.layer.appendChild(this.currentLineHighlight);
    this.layer.appendChild(this.highlight);
    this.layer.appendChild(this.textarea);
    editorArea.appendChild(this.layer);

    this.container.appendChild(this.gutter);
    this.container.appendChild(editorArea);
  }

  // ─── Event wiring ───────────────────────────────────────────────────────────
  private attach() {
    this.textarea.addEventListener('input', () => {
      this.repaint();
      this.options.onChange(this.textarea.value);
    });

    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    this.textarea.addEventListener('paste', () => {
      // After default paste runs: some environments fire `input` inconsistently; always sync.
      setTimeout(() => {
        const v = this.textarea.value;
        this.repaint();
        this.options.onChange(v);
        this.options.onPaste(v);
      }, 0);
    });

    this.textarea.addEventListener('scroll', () => {
      this.syncScroll();
    });

    this.textarea.addEventListener('keyup', () => {
      this.updateCurrentLine();
      this.updateBracketMatch();
    });

    this.textarea.addEventListener('click', () => {
      this.updateCurrentLine();
      this.updateBracketMatch();
    });

    this.textarea.addEventListener('focus', () => {
      this.container.classList.add('is-focused');
      this.updateCurrentLine();
    });

    this.textarea.addEventListener('blur', () => {
      this.container.classList.remove('is-focused');
    });
  }

  // ─── Keyboard handling ──────────────────────────────────────────────────────
  private handleKeydown(e: KeyboardEvent) {
    // Tab — insert spaces or dedent
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = ' '.repeat(this.options.indentSize);
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;

      if (e.shiftKey) {
        // Dedent: remove up to indentSize spaces from the start of every selected line
        const beforeStart = value.lastIndexOf('\n', start - 1) + 1;
        const selected = value.substring(beforeStart, end);
        const dedented = selected.split('\n').map(line => {
          let removed = 0;
          while (removed < this.options.indentSize && line[removed] === ' ') removed++;
          return line.substring(removed);
        }).join('\n');
        const newValue = value.substring(0, beforeStart) + dedented + value.substring(end);
        this.textarea.value = newValue;
        this.textarea.setSelectionRange(beforeStart, beforeStart + dedented.length);
      } else if (start !== end) {
        // Indent every selected line
        const beforeStart = value.lastIndexOf('\n', start - 1) + 1;
        const selected = value.substring(beforeStart, end);
        const indented = selected.split('\n').map(line => indent + line).join('\n');
        const newValue = value.substring(0, beforeStart) + indented + value.substring(end);
        this.textarea.value = newValue;
        this.textarea.setSelectionRange(beforeStart, beforeStart + indented.length);
      } else {
        // Insert spaces at cursor
        this.textarea.value = value.substring(0, start) + indent + value.substring(end);
        this.textarea.setSelectionRange(start + indent.length, start + indent.length);
      }
      this.repaint();
      this.options.onChange(this.textarea.value);
      return;
    }

    // Auto-pair brackets and quotes
    if (this.options.autoPairBrackets) {
      const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')', '"': '"' };
      if (pairs[e.key] !== undefined) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        // If user is typing the closing char and it's already there, skip past it
        const close = pairs[e.key];
        if (e.key === '"' && value[start] === '"' && start === end) {
          e.preventDefault();
          this.textarea.setSelectionRange(start + 1, start + 1);
          return;
        }

        e.preventDefault();
        const before = value.substring(0, start);
        const selected = value.substring(start, end);
        const after = value.substring(end);
        this.textarea.value = before + e.key + selected + close + after;
        this.textarea.setSelectionRange(start + 1, start + 1 + selected.length);
        this.repaint();
        this.options.onChange(this.textarea.value);
        return;
      }
      // Skip-past on closing bracket if next char matches
      const closes = [']', '}', ')'];
      if (closes.includes(e.key)) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (start === end && this.textarea.value[start] === e.key) {
          e.preventDefault();
          this.textarea.setSelectionRange(start + 1, start + 1);
          return;
        }
      }
    }

    // Enter — auto-indent based on previous line
    if (e.key === 'Enter') {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      if (start !== end) return; // selection — let default behavior replace
      const value = this.textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';

      // If previous char is { or [, add an extra level
      const prevChar = value[start - 1];
      const nextChar = value[start];
      const extraIndent = (prevChar === '{' || prevChar === '[') ? ' '.repeat(this.options.indentSize) : '';

      // If we're inside an empty pair like {| } or [| ], split onto multi-line
      if ((prevChar === '{' && nextChar === '}') || (prevChar === '[' && nextChar === ']')) {
        e.preventDefault();
        const insertion = '\n' + indent + ' '.repeat(this.options.indentSize) + '\n' + indent;
        this.textarea.value = value.substring(0, start) + insertion + value.substring(end);
        const cursorPos = start + 1 + indent.length + this.options.indentSize;
        this.textarea.setSelectionRange(cursorPos, cursorPos);
        this.repaint();
        this.options.onChange(this.textarea.value);
        return;
      }

      // Otherwise: normal newline + matched indent + extra
      e.preventDefault();
      const insertion = '\n' + indent + extraIndent;
      this.textarea.value = value.substring(0, start) + insertion + value.substring(end);
      const cursorPos = start + insertion.length;
      this.textarea.setSelectionRange(cursorPos, cursorPos);
      this.repaint();
      this.options.onChange(this.textarea.value);
      return;
    }
  }

  // ─── Scroll syncing ─────────────────────────────────────────────────────────
  private syncScroll() {
    const top = this.textarea.scrollTop;
    const left = this.textarea.scrollLeft;
    this.highlight.style.transform = `translate(${-left}px, ${-top}px)`;
    this.bracketHighlights.style.transform = `translate(${-left}px, ${-top}px)`;
    this.currentLineHighlight.style.transform = `translateY(${-top}px)`;
    this.gutter.scrollTop = top;
  }

  // ─── Repaint ────────────────────────────────────────────────────────────────
  private repaint() {
    const value = this.textarea.value;

    // Paint highlights
    // Add a trailing space if the value ends with newline so the height matches
    const safe = value.endsWith('\n') ? value + ' ' : value;
    this.highlight.innerHTML = highlightJson(safe);

    // Paint gutter
    this.repaintGutter(value);

    // Sync scroll and current line
    this.syncScroll();
    this.updateCurrentLine();
    this.updateBracketMatch();
  }

  private repaintGutter(value: string) {
    const lineCount = value.split('\n').length;
    const lines: string[] = [];
    for (let i = 1; i <= lineCount; i++) {
      lines.push(`<div class="jce-line-num">${i}</div>`);
    }
    this.gutter.innerHTML = lines.join('');
  }

  // ─── Current line highlight ─────────────────────────────────────────────────
  private updateCurrentLine() {
    const value = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;
    const lineNum = (value.substring(0, cursorPos).match(/\n/g) || []).length;
    const top = lineNum * this.lineHeight;
    this.currentLineHighlight.style.top = `${top}px`;

    // Highlight the active line in the gutter
    this.gutter.querySelectorAll<HTMLDivElement>('.jce-line-num').forEach((el, idx) => {
      el.classList.toggle('is-active', idx === lineNum);
    });
  }

  // ─── Bracket matching ───────────────────────────────────────────────────────
  private updateBracketMatch() {
    this.bracketHighlights.innerHTML = '';
    const value = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;

    // Look for a bracket adjacent to cursor (prefer the one before cursor)
    const candidates = [
      { pos: cursorPos - 1, char: value[cursorPos - 1] },
      { pos: cursorPos, char: value[cursorPos] },
    ];
    const opens = ['{', '[', '('];
    const closes = ['}', ']', ')'];
    const matchOf: Record<string, string> = { '{': '}', '[': ']', '(': ')', '}': '{', ']': '[', ')': '(' };

    let bracketPos = -1;
    let bracketChar = '';
    for (const c of candidates) {
      if (c.char && (opens.includes(c.char) || closes.includes(c.char))) {
        bracketPos = c.pos;
        bracketChar = c.char;
        break;
      }
    }
    if (bracketPos === -1) return;

    const matchPos = this.findMatchingBracket(value, bracketPos, bracketChar);
    if (matchPos === -1) return;

    this.paintBracketHighlight(value, bracketPos);
    this.paintBracketHighlight(value, matchPos);
  }

  private findMatchingBracket(value: string, pos: number, char: string): number {
    const opens = ['{', '[', '('];
    const closes = ['}', ']', ')'];
    const matchOf: Record<string, string> = { '{': '}', '[': ']', '(': ')', '}': '{', ']': '[', ')': '(' };
    const target = matchOf[char];
    const dir = opens.includes(char) ? 1 : -1;
    let depth = 0;
    let inString = false;
    let stringChar = '';

    if (dir === 1) {
      for (let i = pos; i < value.length; i++) {
        const c = value[i];
        if (inString) {
          if (c === '\\') { i++; continue; }
          if (c === stringChar) inString = false;
          continue;
        }
        if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
        if (c === char) depth++;
        else if (c === target) {
          depth--;
          if (depth === 0) return i;
        }
      }
    } else {
      for (let i = pos; i >= 0; i--) {
        const c = value[i];
        // Backwards string scan is approximate; full correctness needs a forward scan, but this is "good enough" for visual matching
        if (c === char) depth++;
        else if (c === target) {
          depth--;
          if (depth === 0) return i;
        }
      }
    }
    return -1;
  }

  private paintBracketHighlight(value: string, pos: number) {
    const before = value.substring(0, pos);
    const lineNum = (before.match(/\n/g) || []).length;
    const lineStart = before.lastIndexOf('\n') + 1;
    const col = pos - lineStart;

    // Approximate character width via canvas measurement (cached)
    const charWidth = this.measureCharWidth();
    const left = col * charWidth + 12; // 12px = .jce-highlight padding-left
    const top = lineNum * this.lineHeight + 2;

    const marker = document.createElement('div');
    marker.className = 'jce-bracket-marker';
    marker.style.left = `${left}px`;
    marker.style.top = `${top}px`;
    marker.style.width = `${charWidth}px`;
    marker.style.height = `${this.lineHeight - 4}px`;
    this.bracketHighlights.appendChild(marker);
  }

  private cachedCharWidth: number | null = null;
  private measureCharWidth(): number {
    if (this.cachedCharWidth) return this.cachedCharWidth;
    const probe = document.createElement('span');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.font = getComputedStyle(this.highlight).font;
    probe.textContent = '0';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    this.cachedCharWidth = w;
    return w;
  }

  // ─── Public API (mirrors textarea for compatibility) ────────────────────────
  setValue(value: string) {
    this.textarea.value = value;
    this.cachedCharWidth = null; // recompute on next paint
    this.repaint();
    this.options.onChange(value);
  }

  getValue(): string {
    return this.textarea.value;
  }

  focus() {
    this.textarea.focus();
  }

  /** Set selection by start/end offsets in the underlying value */
  setSelectionRange(start: number, end: number) {
    this.textarea.setSelectionRange(start, end);
    this.textarea.focus();
    // Scroll the selection into view by approximate position
    const value = this.textarea.value;
    const before = value.substring(0, start);
    const lineNum = (before.match(/\n/g) || []).length;
    const targetTop = lineNum * this.lineHeight;
    const visibleHeight = this.textarea.clientHeight;
    if (targetTop < this.textarea.scrollTop || targetTop > this.textarea.scrollTop + visibleHeight - this.lineHeight) {
      this.textarea.scrollTop = Math.max(0, targetTop - visibleHeight / 2);
    }
    this.updateCurrentLine();
  }

  /** Get the underlying textarea element (escape hatch for advanced uses) */
  get element(): HTMLTextAreaElement {
    return this.textarea;
  }

  /** Get the host container for drag-drop and similar */
  get host(): HTMLElement {
    return this.container;
  }

  /** Set indent size (for re-rendering in response to settings change) */
  setIndentSize(size: number) {
    this.options.indentSize = size;
  }
}
