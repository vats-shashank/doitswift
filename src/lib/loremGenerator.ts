export interface WordList {
  words: string[];
  starter: string | null;
}

export type GenerateMode = 'paragraphs' | 'sentences' | 'words' | 'characters' | 'bytes';

export interface GenerateOptions {
  mode: GenerateMode;
  count: number;
  wordList: WordList;
  startWithStarter?: boolean; // only meaningful when wordList.starter is non-null
}

export interface LanguageMeta {
  id: string;
  label: string; // What appears in the dropdown
  direction: 'ltr' | 'rtl';
  hasStarter: boolean; // Whether the wordlist file includes a starter phrase
}

export const LANGUAGES: LanguageMeta[] = [
  { id: 'english-realfeel', label: 'English (real-feel)', direction: 'ltr', hasStarter: false },
  { id: 'latin', label: 'Latin (classic Lorem Ipsum)', direction: 'ltr', hasStarter: true },
  { id: 'hindi', label: 'Hindi (हिन्दी)', direction: 'ltr', hasStarter: false },
  { id: 'arabic', label: 'Arabic (العربية)', direction: 'rtl', hasStarter: false },
  { id: 'chinese-simplified', label: 'Chinese Simplified (简体中文)', direction: 'ltr', hasStarter: false },
  { id: 'bengali', label: 'Bengali (বাংলা)', direction: 'ltr', hasStarter: false },
  { id: 'spanish', label: 'Spanish (Español)', direction: 'ltr', hasStarter: false },
  { id: 'cyrillic', label: 'Russian (Русский)', direction: 'ltr', hasStarter: false },
];

export function getLanguageMeta(id: string): LanguageMeta | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

// Cache loaded word lists keyed by language id
const wordListCache: Record<string, WordList> = {};

export async function loadWordList(language: string): Promise<WordList> {
  if (wordListCache[language]) return wordListCache[language];
  const res = await fetch(`/data/lorem/${language}.json`);
  if (!res.ok) throw new Error(`Failed to load word list for ${language}`);
  const data = await res.json();
  wordListCache[language] = data;
  return data;
}

function pickRandomWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

function generateSentence(words: string[], minWords = 6, maxWords = 16): string {
  const length = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const sentenceWords: string[] = [];
  for (let i = 0; i < length; i++) {
    sentenceWords.push(pickRandomWord(words));
  }
  // Sprinkle commas in longer sentences
  if (length > 10) {
    const commaPos = 4 + Math.floor(Math.random() * (length - 8));
    sentenceWords[commaPos] = sentenceWords[commaPos] + ',';
  }
  // Capitalize first word
  sentenceWords[0] = sentenceWords[0].charAt(0).toUpperCase() + sentenceWords[0].slice(1);
  return sentenceWords.join(' ') + '.';
}

function generateParagraph(words: string[], minSentences = 3, maxSentences = 7): string {
  const length = minSentences + Math.floor(Math.random() * (maxSentences - minSentences + 1));
  const sentences: string[] = [];
  for (let i = 0; i < length; i++) {
    sentences.push(generateSentence(words));
  }
  return sentences.join(' ');
}

export function generate(opts: GenerateOptions): string {
  const { mode, count, wordList, startWithStarter } = opts;
  const words = wordList.words;
  if (!words || words.length === 0) return '';

  switch (mode) {
    case 'paragraphs': {
      const paragraphs: string[] = [];
      for (let i = 0; i < count; i++) {
        let para = generateParagraph(words);
        if (i === 0 && startWithStarter && wordList.starter) {
          // Replace the start of the first sentence with the starter phrase
          const firstSentenceEnd = para.indexOf('.');
          const firstSentence = para.substring(0, firstSentenceEnd);
          // Append remaining sentence words (3-5) after the starter for natural feel
          const wordsInFirst = firstSentence.split(' ');
          const trailingCount = Math.min(wordsInFirst.length - 1, 3 + Math.floor(Math.random() * 3));
          const trailing = wordsInFirst.slice(-trailingCount).join(' ');
          para = `${wordList.starter}, ${trailing.toLowerCase()}.${para.substring(firstSentenceEnd + 1)}`;
        }
        paragraphs.push(para);
      }
      return paragraphs.join('\n\n');
    }
    case 'sentences': {
      const sentences: string[] = [];
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence(words));
      }
      // First-sentence starter substitution if requested
      if (startWithStarter && wordList.starter && sentences.length > 0) {
        sentences[0] = `${wordList.starter}.`;
      }
      return sentences.join(' ');
    }
    case 'words': {
      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        out.push(pickRandomWord(words));
      }
      out[0] = out[0].charAt(0).toUpperCase() + out[0].slice(1);
      return out.join(' ') + '.';
    }
    case 'characters': {
      // Build sentences until we exceed the target, then trim cleanly at last word boundary
      const targetChars = count;
      let buffer = '';
      while (buffer.length < targetChars + 50) {
        const sentence = generateSentence(words);
        buffer = buffer.length === 0 ? sentence : `${buffer} ${sentence}`;
      }
      if (buffer.length <= targetChars) return buffer;
      // Trim to last full word that fits the budget
      let trimmed = buffer.substring(0, targetChars);
      const lastSpace = trimmed.lastIndexOf(' ');
      if (lastSpace > 0) trimmed = trimmed.substring(0, lastSpace);
      // Ensure clean ending
      trimmed = trimmed.replace(/[,;:]$/, '');
      if (!/[.!?]$/.test(trimmed)) trimmed += '.';
      return trimmed;
    }
    case 'bytes': {
      // Same as characters but counted as UTF-8 byte length (matters for non-Latin scripts)
      const targetBytes = count;
      const encoder = new TextEncoder();
      let buffer = '';
      while (encoder.encode(buffer).length < targetBytes + 100) {
        const sentence = generateSentence(words);
        buffer = buffer.length === 0 ? sentence : `${buffer} ${sentence}`;
      }
      // Trim by UTF-8 byte length
      while (encoder.encode(buffer).length > targetBytes) {
        const lastSpace = buffer.lastIndexOf(' ');
        if (lastSpace <= 0) break;
        buffer = buffer.substring(0, lastSpace);
      }
      if (!/[.!?]$/.test(buffer)) buffer += '.';
      return buffer;
    }
  }
  return '';
}
