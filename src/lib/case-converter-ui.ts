import {
  capitalizeEachWord,
  sentenceCaseWithProper,
  toAlternatingCase,
  toCamelCase,
  toDotCase,
  toInverseCase,
  toKebabCase,
  toLowerCase,
  toPascalCase,
  toPathCase,
  toScreamingSnakeCase,
  toSnakeCase,
  toTitleCaseWithProper,
  toTrainCase,
  toUpperCase,
} from './case-converter/convert';

/** Tab `data-case` values (15 tools). */
export type TabCase =
  | 'sentence'
  | 'lower'
  | 'upper'
  | 'capitalized'
  | 'title'
  | 'alternating'
  | 'inverse'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'constant'
  | 'kebab'
  | 'train'
  | 'dot'
  | 'path';

const TAB_ORDER: TabCase[] = [
  'sentence',
  'lower',
  'upper',
  'capitalized',
  'title',
  'alternating',
  'inverse',
  'camel',
  'pascal',
  'snake',
  'constant',
  'kebab',
  'train',
  'dot',
  'path',
];

const CASE_LABELS: Record<TabCase, string> = {
  sentence: 'Sentence case',
  lower: 'lower case',
  upper: 'UPPER CASE',
  capitalized: 'Capitalize Each Word',
  title: 'Title Case',
  alternating: 'aLtErNaTiNg cAsE',
  inverse: 'InVeRsE cAsE',
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  constant: 'CONSTANT_CASE',
  kebab: 'kebab-case',
  train: 'Train-Case',
  dot: 'dot.case',
  path: 'path/case',
};

function convertOne(source: string, tab: TabCase, useProper: boolean): string {
  switch (tab) {
    case 'sentence':
      return sentenceCaseWithProper(source, useProper);
    case 'lower':
      return toLowerCase(source);
    case 'upper':
      return toUpperCase(source);
    case 'capitalized':
      return capitalizeEachWord(source);
    case 'title':
      return toTitleCaseWithProper(source, useProper);
    case 'alternating':
      return toAlternatingCase(source);
    case 'inverse':
      return toInverseCase(source);
    case 'camel':
      return toCamelCase(source);
    case 'pascal':
      return toPascalCase(source);
    case 'snake':
      return toSnakeCase(source);
    case 'constant':
      return toScreamingSnakeCase(source);
    case 'kebab':
      return toKebabCase(source);
    case 'train':
      return toTrainCase(source);
    case 'dot':
      return toDotCase(source);
    case 'path':
      return toPathCase(source);
    default:
      return source;
  }
}

let statsDebounce: ReturnType<typeof setTimeout> | null = null;

export function initCaseConverterTabs() {
  const ta = document.getElementById('ccTextarea') as HTMLTextAreaElement | null;
  if (!ta) return;

  const copyBtn = document.getElementById('ccCopyBtn') as HTMLButtonElement | null;
  const downloadBtn = document.getElementById('ccDownloadBtn') as HTMLButtonElement | null;
  const undoBtn = document.getElementById('ccUndoBtn') as HTMLButtonElement | null;
  const clearBtn = document.getElementById('ccClearBtn') as HTMLButtonElement | null;
  const charEl = document.getElementById('ccCharCount');
  const wordEl = document.getElementById('ccWordCount');
  const lineEl = document.getElementById('ccLineCount');
  const currentCaseEl = document.getElementById('ccCurrentCase');
  const sampleHint = document.getElementById('ccSampleHint');
  const loadSampleBtn = document.getElementById('ccLoadSample');
  const properChk = document.getElementById('ccAutoProperNouns') as HTMLInputElement | null;
  const compareChk = document.getElementById('ccCompareAll') as HTMLInputElement | null;
  const compareView = document.getElementById('ccCompareAllView');
  const compareGrid = document.querySelector<HTMLDivElement>('.cc-compare-grid');

  const tabEls = Array.from(document.querySelectorAll<HTMLButtonElement>('.cc-tab[data-case]'));
  const tabByCase = new Map<TabCase, HTMLButtonElement>();
  for (const b of tabEls) {
    const c = b.dataset.case as TabCase;
    if (c) tabByCase.set(c, b);
  }

  /** Text we always convert from when applying a case (unchanged by tab apply). */
  let sourceText = '';
  const undoStack: string[] = [];
  let activeCase: TabCase | null = null;

  function getUseProper() {
    return properChk?.checked !== false;
  }

  function updateStats() {
    const t = ta.value;
    if (charEl) charEl.textContent = String([...t].length);
    if (wordEl) wordEl.textContent = String(t.trim() ? t.trim().split(/\s+/).length : 0);
    if (lineEl) lineEl.textContent = String(t ? t.split(/\n/).length : 0);
    if (currentCaseEl) {
      if (activeCase) {
        currentCaseEl.textContent = CASE_LABELS[activeCase];
      } else {
        currentCaseEl.textContent = '—';
      }
    }
  }

  function runStatsDebounced() {
    if (statsDebounce) clearTimeout(statsDebounce);
    statsDebounce = setTimeout(() => {
      updateStats();
      statsDebounce = null;
    }, 100);
  }

  function setActiveTab(c: TabCase | null) {
    activeCase = c;
    for (const b of tabEls) {
      const id = b.dataset.case as TabCase;
      const on = c !== null && id === c;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (currentCaseEl) {
      currentCaseEl.textContent = c ? CASE_LABELS[c] : '—';
    }
  }

  function syncSourceFromTextarea() {
    sourceText = ta.value;
  }

  function onUserInput() {
    setActiveTab(null);
    syncSourceFromTextarea();
    runStatsDebounced();
    toggleSampleHint();
  }

  function toggleSampleHint() {
    if (!sampleHint) return;
    const empty = !ta.value.trim();
    sampleHint.style.display = empty ? 'block' : 'none';
  }

  function applyTab(c: TabCase) {
    const useProper = getUseProper();
    if (!sourceText.trim()) {
      return;
    }
    undoStack.push(ta.value);
    const out = convertOne(sourceText, c, useProper);
    ta.value = out;
    setActiveTab(c);
    updateStats();
    if (compareChk?.checked) {
      fillCompareGrid();
    }
  }

  function fillCompareGrid() {
    if (!compareGrid) return;
    const useProper = getUseProper();
    const s = sourceText;
    compareGrid.replaceChildren();
    for (const key of TAB_ORDER) {
      const value = s ? convertOne(s, key, useProper) : '';
      const row = document.createElement('div');
      row.className = 'cc-compare-item';
      row.setAttribute('data-case', key);
      const lab = document.createElement('div');
      lab.className = 'cc-compare-label';
      lab.textContent = CASE_LABELS[key];
      const val = document.createElement('div');
      val.className = 'cc-compare-value';
      val.textContent = value;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-compare-copy';
      btn.setAttribute('aria-label', 'Copy ' + CASE_LABELS[key]);
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        void navigator.clipboard.writeText(value);
        const prev = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => {
          btn.textContent = prev;
        }, 2000);
      });
      row.append(lab, val, btn);
      compareGrid.appendChild(row);
    }
  }

  function setCompareVisible(on: boolean) {
    if (!compareView) return;
    if (on) {
      fillCompareGrid();
      compareView.removeAttribute('hidden');
    } else {
      compareView.setAttribute('hidden', '');
    }
  }

  ta.addEventListener('input', onUserInput);
  ta.addEventListener('paste', () => {
    setTimeout(() => {
      onUserInput();
    }, 0);
  });

  for (const b of tabEls) {
    b.addEventListener('click', () => {
      const c = b.dataset.case as TabCase;
      if (c) applyTab(c);
    });
  }

  properChk?.addEventListener('change', () => {
    if (activeCase && (activeCase === 'sentence' || activeCase === 'title') && sourceText) {
      const out = convertOne(sourceText, activeCase, getUseProper());
      ta.value = out;
    }
    if (compareChk?.checked) {
      fillCompareGrid();
    }
  });

  compareChk?.addEventListener('change', () => {
    setCompareVisible(compareChk.checked);
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      copyBtn.classList.add('active');
      const icon = copyBtn.querySelector('.cc-icon');
      const label = copyBtn.querySelector('.cc-btn-label');
      if (icon) icon.textContent = '✓';
      if (label) label.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.classList.remove('active');
        if (icon) icon.textContent = '📋';
        if (label) label.textContent = 'Copy';
      }, 2000);
    } catch {
      /* ignore */
    }
  });

  downloadBtn?.addEventListener('click', () => {
    const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-converter-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function doUndo() {
    if (undoStack.length === 0) return;
    ta.value = undoStack.pop() ?? '';
    syncSourceFromTextarea();
    setActiveTab(null);
    updateStats();
    toggleSampleHint();
    if (compareChk?.checked) {
      fillCompareGrid();
    }
  }

  undoBtn?.addEventListener('click', doUndo);

  clearBtn?.addEventListener('click', () => {
    ta.value = '';
    sourceText = '';
    undoStack.length = 0;
    setActiveTab(null);
    updateStats();
    toggleSampleHint();
    if (compareChk?.checked) {
      fillCompareGrid();
    }
  });

  loadSampleBtn?.addEventListener('click', () => {
    ta.value =
      'The Quick Brown Fox Jumps Over The Lazy Dog. The CEO of Apple announced new iPhone features at NASA headquarters in New York.';
    syncSourceFromTextarea();
    setActiveTab(null);
    onUserInput();
  });

  ta.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === 'z' || e.key === 'Z') {
      if (e.shiftKey) return;
      if (undoStack.length > 0) {
        e.preventDefault();
        doUndo();
      }
      return;
    }
    if (e.shiftKey) return;
    const n = e.key;
    if (n >= '1' && n <= '5') {
      e.preventDefault();
      const map: TabCase[] = ['sentence', 'lower', 'upper', 'capitalized', 'title'];
      applyTab(map[Number(n) - 1]!);
    }
  });

  syncSourceFromTextarea();
  setActiveTab(null);
  updateStats();
  toggleSampleHint();
  if (compareChk?.checked) {
    setCompareVisible(true);
  }
}
