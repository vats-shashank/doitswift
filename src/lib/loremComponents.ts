import type { WordList } from './loremGenerator';

export type ComponentTemplateId =
  | 'page-hero'
  | 'blog-post-structure'
  | 'faq-section'
  | 'product-cards' // placeholder for Session 3
  | 'navigation-menu' // placeholder for Session 3
  | 'form-labels' // placeholder for Session 3
  | 'email-subject' // placeholder for Session 3
  | 'social-post' // placeholder for Session 3
  | 'testimonial-cards' // placeholder for Session 3
  | 'pricing-tier'; // placeholder for Session 3

export interface ComponentTemplate {
  id: ComponentTemplateId;
  name: string;
  description: string;
  hasCount: boolean; // does this template support a "how many" input?
  countLabel?: string; // e.g., "Number of Q&A pairs"
  defaultCount?: number;
  minCount?: number;
  maxCount?: number;
  enabled: boolean; // false for templates not yet built (Session 3)
}

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'page-hero',
    name: 'Page Hero',
    description: 'H1 headline, subtitle, and two button labels — the standard above-the-fold pattern',
    hasCount: false,
    enabled: true,
  },
  {
    id: 'blog-post-structure',
    name: 'Blog Post Structure',
    description: 'H1 title, meta line, four H2 sections each with a body paragraph',
    hasCount: false,
    enabled: true,
  },
  {
    id: 'faq-section',
    name: 'FAQ Section',
    description: 'Question and answer pairs of plausible length',
    hasCount: true,
    countLabel: 'Number of Q&A pairs',
    defaultCount: 5,
    minCount: 2,
    maxCount: 20,
    enabled: true,
  },
  {
    id: 'product-cards',
    name: 'Product Cards',
    description: 'Card grid with title, price, description, and CTA',
    hasCount: true,
    countLabel: 'Number of cards',
    defaultCount: 6,
    minCount: 2,
    maxCount: 24,
    enabled: true,
  },
  {
    id: 'navigation-menu',
    name: 'Navigation Menu',
    description: 'Short menu item labels, 1-2 words each',
    hasCount: true,
    countLabel: 'Number of items',
    defaultCount: 6,
    minCount: 3,
    maxCount: 12,
    enabled: true,
  },
  {
    id: 'form-labels',
    name: 'Form Labels & Placeholders',
    description: 'Label and placeholder pairs for common form patterns',
    hasCount: true,
    countLabel: 'Number of fields',
    defaultCount: 5,
    minCount: 2,
    maxCount: 15,
    enabled: true,
  },
  {
    id: 'email-subject',
    name: 'Email Subject + Preview',
    description: '30-50 char subject line and 80-120 char preview text',
    hasCount: false,
    enabled: true,
  },
  {
    id: 'social-post',
    name: 'Social Media Post',
    description: 'Twitter / Instagram / LinkedIn length-appropriate post text',
    hasCount: false,
    enabled: true,
  },
  {
    id: 'testimonial-cards',
    name: 'Testimonial Cards',
    description: 'Quote, name, and title for testimonial sections',
    hasCount: true,
    countLabel: 'Number of testimonials',
    defaultCount: 3,
    minCount: 1,
    maxCount: 12,
    enabled: true,
  },
  {
    id: 'pricing-tier',
    name: 'Pricing Tier',
    description: 'Tier name, price, and feature bullets',
    hasCount: true,
    countLabel: 'Number of tiers',
    defaultCount: 3,
    minCount: 1,
    maxCount: 6,
    enabled: true,
  },
];

// ─── Helper utilities ─────────────────────────────────────────────────────────

function pickWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Generate a phrase of exactly N words, capitalized first word, no period.
function phrase(words: string[], wordCount: number): string {
  const out: string[] = [];
  for (let i = 0; i < wordCount; i++) out.push(pickWord(words));
  out[0] = capitalize(out[0]);
  return out.join(' ');
}

// Generate a sentence of N to M words, ending in '.'
function sentence(words: string[], minWords: number, maxWords: number): string {
  const len = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(pickWord(words));
  out[0] = capitalize(out[0]);
  // light comma
  if (len > 10) {
    const cp = 4 + Math.floor(Math.random() * (len - 8));
    out[cp] = out[cp] + ',';
  }
  return out.join(' ') + '.';
}

// Generate a paragraph of M to N sentences
function paragraph(words: string[], minSent: number, maxSent: number): string {
  const len = minSent + Math.floor(Math.random() * (maxSent - minSent + 1));
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(sentence(words, 8, 18));
  return out.join(' ');
}

// Generate a question (capitalized, ending in ?)
function question(words: string[], minWords: number, maxWords: number): string {
  const len = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(pickWord(words));
  out[0] = capitalize(out[0]);
  return out.join(' ') + '?';
}

// ─── Component output structure ───────────────────────────────────────────────

export interface ComponentOutput {
  template: ComponentTemplateId;
  // Structured data — used for JSON output and per-component preview
  data: any;
  // Plain text rendering (for the textarea)
  text: string;
  // HTML rendering (for visual preview and HTML copy)
  html: string;
}

// ─── Template generators ──────────────────────────────────────────────────────

export function generatePageHero(wordList: WordList): ComponentOutput {
  const words = wordList.words;
  const headline = phrase(words, 4 + Math.floor(Math.random() * 4)); // 4-7 words
  const subtitle = sentence(words, 14, 24);
  const ctaPrimary = capitalize(pickWord(words));
  const ctaSecondary = capitalize(pickWord(words)) + ' ' + pickWord(words);

  const data = { headline, subtitle, ctaPrimary, ctaSecondary };
  const text = `# ${headline}\n\n${subtitle}\n\n[${ctaPrimary}] [${ctaSecondary}]`;
  const html =
    `<h1>${headline}</h1>\n` +
    `<p>${subtitle}</p>\n` +
    `<button>${ctaPrimary}</button>\n` +
    `<button>${ctaSecondary}</button>`;

  return { template: 'page-hero', data, text, html };
}

export function generateBlogPostStructure(wordList: WordList): ComponentOutput {
  const words = wordList.words;
  const title = phrase(words, 8 + Math.floor(Math.random() * 6)); // 8-13 words
  const meta = `By ${capitalize(pickWord(words))} ${capitalize(pickWord(words))} · ${capitalize(pickWord(words))} ${pickWord(words)} ${pickWord(words)}`;

  const sections: { heading: string; body: string }[] = [];
  for (let i = 0; i < 4; i++) {
    sections.push({
      heading: phrase(words, 4 + Math.floor(Math.random() * 4)),
      body: paragraph(words, 4, 7),
    });
  }

  const data = { title, meta, sections };

  const text =
    `# ${title}\n\n` +
    `${meta}\n\n` +
    sections.map((s) => `## ${s.heading}\n\n${s.body}`).join('\n\n');

  const html =
    `<h1>${title}</h1>\n` +
    `<p class="meta">${meta}</p>\n` +
    sections.map((s) => `<h2>${s.heading}</h2>\n<p>${s.body}</p>`).join('\n');

  return { template: 'blog-post-structure', data, text, html };
}

export function generateFaqSection(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const items: { question: string; answer: string }[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      question: question(words, 8, 14),
      answer: paragraph(words, 2, 4),
    });
  }

  const data = { items };

  const text = items
    .map((it, i) => `Q${i + 1}: ${it.question}\nA${i + 1}: ${it.answer}`)
    .join('\n\n');

  const html = items
    .map((it) => `<div class="faq-item">\n  <h4>${it.question}</h4>\n  <p>${it.answer}</p>\n</div>`)
    .join('\n');

  return { template: 'faq-section', data, text, html };
}

// ─── Helper for currency placeholder (locale-neutral) ─────────────────────────
function placeholderPrice(): string {
  const amounts = [9, 19, 29, 39, 49, 79, 99, 149, 199, 299, 499, 999];
  const symbols = ['$', '₹', '€', '£'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const amount = amounts[Math.floor(Math.random() * amounts.length)];
  return `${symbol}${amount}`;
}

// ─── Product Cards ───────────────────────────────────────────────────────────
export function generateProductCards(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const cards: { title: string; price: string; description: string; cta: string }[] = [];
  const ctaOptions = ['Buy Now', 'Add to Cart', 'Learn More', 'See Details', 'Order Now', 'Get Started'];
  for (let i = 0; i < count; i++) {
    cards.push({
      title: phrase(words, 2 + Math.floor(Math.random() * 3)), // 2-4 words
      price: placeholderPrice(),
      description: sentence(words, 8, 18).replace(/\.$/, ''),
      cta: ctaOptions[Math.floor(Math.random() * ctaOptions.length)],
    });
  }
  const data = { cards };
  const text = cards
    .map((c, i) => `Card ${i + 1}\n  ${c.title}\n  ${c.price}\n  ${c.description}\n  [${c.cta}]`)
    .join('\n\n');
  const html = cards
    .map(
      (c) =>
        `<div class="product-card">\n  <h3>${c.title}</h3>\n  <p class="price">${c.price}</p>\n  <p class="desc">${c.description}</p>\n  <button>${c.cta}</button>\n</div>`
    )
    .join('\n');
  return { template: 'product-cards', data, text, html };
}

// ─── Navigation Menu ─────────────────────────────────────────────────────────
export function generateNavigationMenu(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const items: { label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const wordCount = Math.random() < 0.7 ? 1 : 2;
    items.push({ label: phrase(words, wordCount) });
  }
  const data = { items };
  const text = items.map((it) => it.label).join(' · ');
  const html =
    `<nav>\n  <ul>\n` +
    items.map((it) => `    <li><a href="#">${it.label}</a></li>`).join('\n') +
    `\n  </ul>\n</nav>`;
  return { template: 'navigation-menu', data, text, html };
}

// ─── Form Labels & Placeholders ──────────────────────────────────────────────
export function generateFormLabels(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const fieldTypes = ['text', 'email', 'tel', 'text', 'text', 'textarea'];
  const fields: { label: string; placeholder: string; type: string }[] = [];
  for (let i = 0; i < count; i++) {
    fields.push({
      label: phrase(words, 1 + Math.floor(Math.random() * 2)), // 1-2 words
      placeholder: phrase(words, 3 + Math.floor(Math.random() * 4)).toLowerCase(), // 3-6 words, lowercase
      type: fieldTypes[Math.floor(Math.random() * fieldTypes.length)],
    });
  }
  const data = { fields };
  const text = fields
    .map((f, i) => `Field ${i + 1}\n  Label: ${f.label}\n  Placeholder: ${f.placeholder}\n  Type: ${f.type}`)
    .join('\n\n');
  const html = fields
    .map((f) =>
      f.type === 'textarea'
        ? `<label>\n  <span>${f.label}</span>\n  <textarea placeholder="${f.placeholder}"></textarea>\n</label>`
        : `<label>\n  <span>${f.label}</span>\n  <input type="${f.type}" placeholder="${f.placeholder}" />\n</label>`
    )
    .join('\n');
  return { template: 'form-labels', data, text, html };
}

// ─── Email Subject + Preview ─────────────────────────────────────────────────
function buildToCharLimit(words: string[], minChars: number, maxChars: number): string {
  // Build text and trim cleanly to fit between minChars and maxChars on a word boundary
  let buf = '';
  while (buf.length < maxChars + 30) {
    const next = pickWord(words);
    buf = buf.length === 0 ? next : `${buf} ${next}`;
    if (buf.length >= minChars && Math.random() < 0.2) break;
  }
  if (buf.length > maxChars) {
    buf = buf.substring(0, maxChars);
    const lastSpace = buf.lastIndexOf(' ');
    if (lastSpace > minChars) buf = buf.substring(0, lastSpace);
  }
  return buf.charAt(0).toUpperCase() + buf.slice(1);
}

export function generateEmailSubject(wordList: WordList): ComponentOutput {
  const words = wordList.words;
  const subject = buildToCharLimit(words, 30, 50);
  const preview = buildToCharLimit(words, 80, 120);
  const data = { subject, preview };
  const text = `Subject: ${subject}\nPreview:  ${preview}`;
  const html = `<div class="email-row">\n  <p class="subject"><strong>${subject}</strong></p>\n  <p class="preview">${preview}</p>\n</div>`;
  return { template: 'email-subject', data, text, html };
}

// ─── Social Media Post ───────────────────────────────────────────────────────
export function generateSocialPost(wordList: WordList): ComponentOutput {
  const words = wordList.words;
  const twitter = buildToCharLimit(words, 200, 270); // under 280 char limit
  const instagram = buildToCharLimit(words, 120, 180); // optimized engagement length
  const linkedin = buildToCharLimit(words, 180, 240); // ~3 short sentences
  const data = { twitter, instagram, linkedin };
  const text = `Twitter (${twitter.length} chars):\n${twitter}\n\nInstagram (${instagram.length} chars):\n${instagram}\n\nLinkedIn (${linkedin.length} chars):\n${linkedin}`;
  const html =
    `<div class="social-post">\n  <div data-platform="twitter">\n    <h4>Twitter (${twitter.length} chars)</h4>\n    <p>${twitter}</p>\n  </div>\n  <div data-platform="instagram">\n    <h4>Instagram (${instagram.length} chars)</h4>\n    <p>${instagram}</p>\n  </div>\n  <div data-platform="linkedin">\n    <h4>LinkedIn (${linkedin.length} chars)</h4>\n    <p>${linkedin}</p>\n  </div>\n</div>`;
  return { template: 'social-post', data, text, html };
}

// ─── Testimonial Cards ───────────────────────────────────────────────────────
export function generateTestimonialCards(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const titles = ['Designer', 'Founder', 'Engineer', 'Marketer', 'Product Manager', 'Director', 'Consultant', 'Developer', 'Writer'];
  const items: { quote: string; name: string; title: string }[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      quote: '"' + sentence(words, 12, 28).replace(/\.$/, '.') + '"',
      name: capitalize(pickWord(words)) + ' ' + capitalize(pickWord(words)),
      title: titles[Math.floor(Math.random() * titles.length)],
    });
  }
  const data = { items };
  const text = items
    .map((it, i) => `Testimonial ${i + 1}\n  ${it.quote}\n  — ${it.name}, ${it.title}`)
    .join('\n\n');
  const html = items
    .map(
      (it) =>
        `<blockquote class="testimonial">\n  <p>${it.quote}</p>\n  <footer>— <strong>${it.name}</strong>, ${it.title}</footer>\n</blockquote>`
    )
    .join('\n');
  return { template: 'testimonial-cards', data, text, html };
}

// ─── Pricing Tier ────────────────────────────────────────────────────────────
export function generatePricingTier(wordList: WordList, count: number): ComponentOutput {
  const words = wordList.words;
  const tierNames = ['Starter', 'Basic', 'Standard', 'Pro', 'Plus', 'Premium', 'Business', 'Enterprise', 'Team', 'Personal'];
  const tiers: { name: string; price: string; period: string; features: string[] }[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name = tierNames[Math.floor(Math.random() * tierNames.length)];
    let attempts = 0;
    while (usedNames.has(name) && attempts < 10) {
      name = tierNames[Math.floor(Math.random() * tierNames.length)];
      attempts++;
    }
    usedNames.add(name);
    const featureCount = 4 + Math.floor(Math.random() * 4); // 4-7 features
    const features: string[] = [];
    for (let f = 0; f < featureCount; f++) {
      features.push(phrase(words, 3 + Math.floor(Math.random() * 4))); // 3-6 words
    }
    tiers.push({
      name,
      price: placeholderPrice(),
      period: '/month',
      features,
    });
  }
  const data = { tiers };
  const text = tiers
    .map(
      (t, i) =>
        `Tier ${i + 1}: ${t.name}\n  ${t.price}${t.period}\n` + t.features.map((f) => `  • ${f}`).join('\n')
    )
    .join('\n\n');
  const html = tiers
    .map(
      (t) =>
        `<div class="pricing-tier">\n  <h3>${t.name}</h3>\n  <p class="price">${t.price}<span>${t.period}</span></p>\n  <ul>\n` +
        t.features.map((f) => `    <li>${f}</li>`).join('\n') +
        `\n  </ul>\n</div>`
    )
    .join('\n');
  return { template: 'pricing-tier', data, text, html };
}

export function generateComponent(
  templateId: ComponentTemplateId,
  wordList: WordList,
  count?: number
): ComponentOutput {
  switch (templateId) {
    case 'page-hero':
      return generatePageHero(wordList);
    case 'blog-post-structure':
      return generateBlogPostStructure(wordList);
    case 'faq-section':
      return generateFaqSection(wordList, count ?? 5);
    case 'product-cards':
      return generateProductCards(wordList, count ?? 6);
    case 'navigation-menu':
      return generateNavigationMenu(wordList, count ?? 6);
    case 'form-labels':
      return generateFormLabels(wordList, count ?? 5);
    case 'email-subject':
      return generateEmailSubject(wordList);
    case 'social-post':
      return generateSocialPost(wordList);
    case 'testimonial-cards':
      return generateTestimonialCards(wordList, count ?? 3);
    case 'pricing-tier':
      return generatePricingTier(wordList, count ?? 3);
    default:
      throw new Error(`Template "${templateId}" not implemented`);
  }
}
