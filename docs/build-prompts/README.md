# DoItSwift — Build Prompts Playbook

This folder holds long-form specs for building DoItSwift tools and pages. Each file is a **single source of truth** for one build — complete enough that Cursor (or a new contributor) can execute it end-to-end without needing chat context.

## Why this folder exists

DoItSwift is built in short sessions (10–15 hrs/week) across multiple Cursor conversations. Chat context is lost between sessions. Verbal decisions are lost too. Without written build specs, every new session re-litigates decisions that were already made — which wastes time and produces inconsistent results.

These prompt files prevent that. They're written once, reviewed, and then every Cursor session reads from the same file. If a decision changes, the file is updated first, then Cursor is told to re-read it.

## How to use a prompt file with Cursor

**Do this:**
```
Read docs/build-prompts/<filename>.md and execute section 14 step 1.
Stop and show me the result before continuing to step 2.
```

Cursor opens the file, reads what's needed, and works from it. The file stays out of chat context until it's read, which preserves Cursor's context window for actual code work.

**Don't do this:**
- Paste the whole prompt into chat. It burns context and has to be re-pasted in every new session.
- Summarize the prompt for Cursor in your own words. The whole point of a written spec is that the exact wording is preserved.
- Let Cursor skip straight from "read the file" to "execute everything at once." Big builds should be done in phases with review points.

## Conventions for writing a new prompt

A good DoItSwift build prompt has these sections, in this order:

1. **Goal & non-negotiables** — one paragraph on what we're building, followed by 3–6 hard constraints (no server uploads, trailing slashes, no signup, etc.).
2. **Files to read first** — a numbered list of existing project files Cursor should `view` before coding. This grounds it in the codebase patterns.
3. **Files to create / modify / leave alone** — explicit list. Be pedantic; Cursor will otherwise touch files you didn't mean.
4. **Libraries** — prefer CDN imports over npm installs (matches the project pattern and avoids dependency bloat).
5. **Frontmatter** — exact page title, description, keywords, canonical pattern.
6. **Schema blocks** — full JSON-LD templates (SoftwareApplication, FAQPage, BreadcrumbList). Use the `faqsForSchema` typed-array pattern from `mortgage.astro`.
7. **Page structure** — section by section, with exact HTML/Astro snippets where ambiguous.
8. **Comparison tables or specialist content** — keep category-based, never name competitors (see rule below).
9. **FAQ list** — all items written out in full. On-page FAQ text must match FAQPage schema exactly.
10. **Supporting TypeScript module** — public API, internal structure, type definitions.
11. **Page-scoped CSS** — which classes to create, dark-mode pass required.
12. **QA checklist** — concrete verification steps, including `npm run build`, `npm run audit:seo`, and real-device testing where relevant.
13. **Explicit don'ts** — guardrails Cursor might otherwise violate (no npm deps, no localStorage of user content, no named competitors, no innerHTML with user input).
14. **Build order** — phased, with each phase leaving a shipping-capable state.
15. **Decisions Cursor may make on its own** — a short list of low-stakes choices (debounce timing, tab ordering, icon style).

## Project-wide rules that apply to every prompt

These are house rules. Don't re-state them in every build spec; just enforce them.

### Content
- **Never name specific competitor products** anywhere on the site — not in tool pages, not in blog posts, not in schema descriptions, not in alt text, not in image filenames. Category-based framing only. If a specific brand's behavior is newsworthy, cite public government sources (FTC, FBI IC3) rather than naming the brand.
- **No personal bylines.** All content is attributed to "DoItSwift Editorial" (organizational attribution). Never claim personal expertise in finance, health, or legal topics.
- **YMYL disclaimers on every tool in finance, tax, health, or legal.** The tool is an estimator; consult a qualified professional before filing, treating, or deciding anything.
- **Last-updated dates are real dates, not placeholders.** Update them when the content is genuinely reviewed.

### Privacy & trust
- **No new tracking.** `MainLayout.astro` has Google Analytics with IP anonymization; that's the ceiling. No pixels, no ad networks, no third-party analytics.
- **No user content in localStorage.** UI preferences like "last-used tab" are fine. Field values, uploads, and anything identifiable are not.
- **No server uploads for tool workflows.** Everything browser-side. This is the brand promise.

### SEO & build hygiene
- **Trailing slash on every internal href.** Astro is configured with `trailingSlash: 'always'`. `scripts/seo-audit.mjs` will fail the build otherwise.
- **`canonical` via the helper** in `src/lib/calculatorJsonLd.ts`: `calculatorCanonical(Astro.site, Astro.url.pathname)`.
- **Three schema blocks per tool page:** `SoftwareApplication`, `FAQPage`, `BreadcrumbList`. Emitted as separate `<script type="application/ld+json">` tags. FAQPage built from a typed `faqsForSchema` array — see `mortgage.astro` lines 8–79.
- **On-page FAQ text must match FAQPage schema exactly.** Same questions, same answers. Don't write two versions.

### Design system
- **Reuse existing CSS classes** from `public/styles/global.css`:
  - `.tool-hero` for hero sections
  - `.container--tool` for 820px content column
  - `.tool-section` for tool UI
  - `.tool-faq` for FAQ section
  - `.tool-related` for related tools
  - `.tool-editorial` for editorial attribution footer
  - `.subtitle` (620px max) for the hero lede
- **Never introduce a new CSS framework.** Page-scoped styles go in a `<style>` block at the bottom of the `.astro` file, scoped by tool-specific selectors like `.qr-tool`, `.cc-tool`, etc.
- **Full dark-mode pass required** using `[data-theme='dark']` selectors.

### Code style
- **Astro 6 + TypeScript only.** No React, Vue, Svelte components.
- **CDN imports over npm installs** for third-party libraries (matches `heic-to-jpg.astro` pattern).
- **No `innerHTML` with user input** anywhere. Use `textContent`, createElement, or Astro's built-in escaping.
- **Small pure functions over class hierarchies.** Payload builders, validators, and formatters should be unit-testable in isolation.

## Status of builds

Keep this table updated as prompts are created and builds land on production.

| Build prompt | Status | Shipped to prod |
|---|---|---|
| `qr-code-generator.md` | Shipped | 2026-04-23 |
| `editorial-infrastructure.md` | Shipped | 2026-04-24 |
| `blog-audit-tier-1.md` | Not written | Not yet |
| `case-converter-seo.md` | Not written | Not yet |
| `word-counter-seo.md` | Not written | Not yet |

## When a build changes after the spec is written

If you realize halfway through a build that the spec needs to change:

1. **Stop the Cursor session.** Don't let it improvise.
2. **Edit the spec file** to reflect the new decision.
3. **Note the change in a Changelog section** at the bottom of that spec file, with the date and reason.
4. **Tell Cursor:** "I've updated `docs/build-prompts/<filename>.md`. Please re-read it and continue from where we left off."

This keeps the spec as the single source of truth. If you just tell Cursor "oh actually, do X instead," that decision evaporates when the session ends.

## When to write a new prompt vs. just do the work

**Write a prompt when:**
- The build touches more than one file
- It requires schema changes
- It has content (FAQ items, comparison tables, educational copy) that took real thought to write
- You'd have to explain it again in the next session

**Skip the prompt when:**
- You're fixing a typo, tweaking a CSS value, or adjusting a single FAQ answer
- The change is self-evident from the git diff

## Attribution and licensing reminder

Any prompt referencing third-party libraries should name the license (usually MIT) in both the spec and the shipped page. Users should know what open-source components are doing the heavy lifting — it's part of the trust story.

---

Last updated: April 2026
