# DoItSwift — Build Prompt: QR Code Generator

Paste this entire document into Cursor as your instruction. Keep it as the working spec until the tool ships.

---

## 0. Goal & non-negotiables

Build a **privacy-first, 100% client-side QR Code Generator** at `/generator/qr-code/` that is best-in-class on three axes at once: rich design customization (colors, gradients, shapes, logo), broad content-type coverage (12 types including India-specific UPI), and unlimited bulk CSV → ZIP generation. All without a backend and all client-side — a combination no free tool currently offers in one place.

**Positioning:** "The only QR generator that doesn't need your data to work."

**Hard constraints — do not violate:**

1. **No server uploads.** Every QR code, every CSV row, every Wi-Fi password, every vCard must be processed entirely in the user's browser. No fetch() calls that send user input anywhere.
2. **Static QR codes only.** We do not build dynamic codes, analytics, or short-link redirects. Own this in copy as a feature.
3. **No signup, no ads, no watermarks, no tracking pixels beyond the existing Google Analytics in `MainLayout.astro`** (don't add more).
4. **Trailing slash always.** Every internal href ends with `/`. The build pipeline (`scripts/seo-audit.mjs`) will fail if this is violated.
5. **Use existing design-system classes** from `public/styles/global.css`. Do not invent new width containers or hero classes.

---

## 1. Read these files BEFORE writing any code

Cursor should `view` or read each of these before starting. They contain the patterns we're matching.

| File | Why |
|---|---|
| `src/layouts/MainLayout.astro` | Global layout, prop signature, how to pass canonical/ogImage, where `<slot name="head" />` goes |
| `src/pages/image/heic-to-jpg.astro` | Gold-standard content depth + three inline schemas + educational sections + comparison table |
| `src/pages/calculator/mortgage.astro` | The `faqsForSchema: { question; answerPlain }[]` typed-array pattern we'll reuse |
| `src/pages/generator/password-generator.astro` | Closest sibling: same folder, same `container--tool` usage, same generator-category framing |
| `src/pages/text/case-converter.astro` | Tab-pill UI pattern (we'll reuse for the 12 content-type tabs) |
| `src/lib/password-generator-ui.ts` | TypeScript UI-logic module pattern we'll follow for `src/lib/qr-generator-ui.ts` |
| `src/lib/calculatorJsonLd.ts` | `calculatorCanonical(Astro.site, Astro.url.pathname)` — use this for the canonical URL |
| `public/styles/global.css` | Confirms available classes: `.tool-hero`, `.tool-section`, `.tool-faq`, `.tool-related`, `.tool-editorial`, `.container--tool` (820px), `.subtitle` (620px) |
| `scripts/seo-audit.mjs` | Know what will fail the build (trailing slash, canonical, og:url consistency) |

---

## 2. Files to create / modify

### Create

1. **`src/pages/generator/qr-code.astro`** — main page (~1500–1800 lines expected, matching `heic-to-jpg.astro` depth)
2. **`src/lib/qr-generator-ui.ts`** — TypeScript module with all UI wiring, payload builders for the 12 types, CSV→ZIP logic (~500–700 lines). Exported as an IIFE initialiser like `initQrGeneratorUI()`. The page imports it with `import { initQrGeneratorUI } from '../../lib/qr-generator-ui'` and calls it in an inline script tag.
3. **`public/qr-code-template.csv`** — downloadable CSV template for bulk mode. Single file, static.

### Modify

4. **`src/pages/generator/index.astro`** — add a card/link for the new QR tool. Follow whatever pattern is already in that file; match the existing password-generator card.
5. **`src/pages/index.astro`** — if the homepage lists individual tools by category, add the QR generator to the Generators section. Otherwise leave alone. Check first; do not invent a new section.

### Do NOT modify

- `package.json` — all libraries load via CDN to match the project's existing pattern (see `heic-to-jpg.astro` lines 143–144).
- `src/layouts/MainLayout.astro` — the footer generator-category column does not currently exist and we are not adding one.
- `public/styles/global.css` — reuse existing classes. All QR-specific CSS goes in a `<style>` block at the bottom of `qr-code.astro`, scoped by selectors like `.qr-tool`, `.qr-preview`, `.qr-type-tabs`, etc.

---

## 3. Libraries (CDN, no npm install)

Load all three in the `<head>` slot using `is:inline` exactly like `heic-to-jpg.astro` does for heic2any + jszip.

```astro
<script slot="head" src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.9.2/lib/qr-code-styling.js" is:inline></script>
<script slot="head" src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js" is:inline></script>
<script slot="head" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" is:inline></script>
```

- `qr-code-styling` exposes `window.QRCodeStyling` (a class). Use for all QR rendering — this is the most widely used open-source styled-QR library in production.
- `Papa` (global) — CSV parsing.
- `JSZip` (global) — already a pattern in the project.

---

## 4. Page frontmatter — exact values to use

```ts
---
import MainLayout from '../../layouts/MainLayout.astro';
import { calculatorCanonical } from '../../lib/calculatorJsonLd';

const canonical = calculatorCanonical(Astro.site, Astro.url.pathname);

const pageTitle = 'Free QR Code Generator — URL, WiFi, vCard, UPI & More (Private & Unlimited) | DoItSwift';
const pageDescription = 'Free QR code generator with logo, gradients, and custom shapes. Bulk-generate from CSV. 12 types: URL, WiFi, vCard, UPI, WhatsApp, email, SMS, and more. 100% browser-based — nothing uploaded. No signup, no watermarks, unlimited.';
const pageKeywords = 'qr code generator, qr generator, free qr code generator, qr code maker, qr code generator with logo, qr code generator free, custom qr code, qr code generator no signup, wifi qr code generator, vcard qr code, upi qr code generator, whatsapp qr code, qr code generator online, bulk qr code generator, qr code generator csv, qr code generator india, qr code png svg, static qr code, qr code maker free, privacy qr code generator, qr code generator offline, qr code generator no watermark, qr code generator unlimited';
---
```

Then three schema blocks (SoftwareApplication, FAQPage from `faqsForSchema` array, BreadcrumbList). Structure them exactly like `mortgage.astro` lines 8–110.

---

## 5. Schema blocks — full templates

### 5a. SoftwareApplication

```ts
const softwareAppLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DoItSwift QR Code Generator',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web Browser',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description:
    'Free browser-based QR code generator with logo, gradients, and custom dot/eye shapes. Generates 12 content types including URL, WiFi, vCard, UPI, and WhatsApp. Batch-generate from CSV. 100% client-side — no uploads, no signup, no watermarks.',
  url: canonical,
  featureList: [
    '12 content types: URL, Text, Email, Phone, SMS, WiFi, vCard, WhatsApp, UPI payment, Geo location, Calendar event, App Store link',
    'Logo embedding with transparency',
    'Custom dot shapes (rounded, dots, classy, square)',
    'Custom eye frame and eye ball shapes',
    'Linear and radial color gradients',
    'Error correction levels L / M / Q / H',
    'Export as PNG (512/1024/2048 px), SVG, or JPEG',
    'Bulk generation from CSV with ZIP download',
    'Works offline after first page load',
    '100% browser-based processing — no uploads',
    'No signup, no watermarks, no usage limits',
  ],
  browserRequirements: 'Requires JavaScript. Supports Chrome, Firefox, Safari, Edge.',
};
```

### 5b. FAQPage — use the typed-array pattern

Define `faqsForSchema: { question: string; answerPlain: string }[]` with the 14 FAQ items from §9 of this prompt, then:

```ts
const faqPageLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqsForSchema.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answerPlain },
  })),
};
```

In the rendered HTML, the FAQ block must render the same questions and answers (not a separate set) so on-page content matches schema.

### 5c. BreadcrumbList

```ts
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', Astro.site).href },
    { '@type': 'ListItem', position: 2, name: 'Generators', item: new URL('/generator/', Astro.site).href },
    { '@type': 'ListItem', position: 3, name: 'QR Code Generator', item: canonical },
  ],
};
```

Emit all three with `<script type="application/ld+json" set:html={JSON.stringify(schema)} />` inside `<MainLayout>`.

---

## 6. Page structure — section-by-section

### 6a. Breadcrumb nav
```astro
<nav class="breadcrumb container container--tool" aria-label="Breadcrumb">
  <a href="/">Home</a> › <a href="/generator/">Generators</a> › <span>QR Code Generator</span>
</nav>
```

### 6b. Hero (`section.hero.tool-hero`)

```astro
<section class="hero tool-hero">
  <div class="container">
    <div class="badge">🔒 100% Private — Nothing Leaves Your Browser</div>
    <h1>QR Code Generator — Create, Customize & Batch Generate QR Codes Privately</h1>
    <p class="subtitle">
      Generate static QR codes for URLs, WiFi networks, vCards, UPI payments, WhatsApp chats, and 8 more types — with custom colors, gradients, shapes, and your logo. Bulk-generate hundreds of codes from a CSV spreadsheet and download them as a ZIP. Every QR is rendered in your browser using the open-source qr-code-styling library. Your content, Wi-Fi passwords, and contact details never leave your device. No signup, no watermarks, no usage caps, no expiring codes.
    </p>
    <p class="subtitle-secondary">
      Most "free" QR generators either upload your data to their servers, bury usable features behind a 14-day trial that silently expires your printed codes, or cap your downloads. This tool does none of that. Static QR codes generated here work forever because they encode your data directly — no redirect through our domain, no dependency on our servers staying online.
    </p>
    <div class="trust">
      <span><span class="check">✓</span> 100% browser-based</span>
      <span><span class="check">✓</span> Works offline</span>
      <span><span class="check">✓</span> Unlimited & free</span>
      <span><span class="check">✓</span> No signup, no watermarks</span>
    </div>
    <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
      Uses qr-code-styling (MIT licensed) for rendering. Error correction per ISO/IEC 18004. Last updated: April 2026.
    </p>
  </div>
</section>
```

### 6c. Mode tabs (Single | Bulk)

Two mutually exclusive panels toggled by two tab buttons at the top of the tool section. Tab pattern matches `case-converter.astro`'s `.cc-tabs` pattern, but with only two tabs. Use ARIA `role="tablist"` / `role="tab"` / `role="tabpanel"` properly.

```astro
<section class="qr-tool tool-section" aria-labelledby="qr-tool-heading">
  <div class="container container--tool">
    <h2 id="qr-tool-heading" class="sr-only">QR Code Generator Tool</h2>

    <div class="qr-mode-tabs" role="tablist" aria-label="Generation mode">
      <button type="button" class="qr-mode-tab qr-mode-tab--active" role="tab" id="qrModeSingle" data-mode="single" aria-selected="true" aria-controls="qrPanelSingle">
        Single QR Code
      </button>
      <button type="button" class="qr-mode-tab" role="tab" id="qrModeBulk" data-mode="bulk" aria-selected="false" aria-controls="qrPanelBulk" tabindex="-1">
        Bulk from CSV
      </button>
    </div>

    <!-- Panel: Single -->
    <div class="qr-panel" id="qrPanelSingle" role="tabpanel" aria-labelledby="qrModeSingle">...</div>

    <!-- Panel: Bulk -->
    <div class="qr-panel" id="qrPanelBulk" role="tabpanel" aria-labelledby="qrModeBulk" hidden>...</div>
  </div>
</section>
```

### 6d. Single mode panel

Layout: two-column on desktop (inputs left ~60%, preview right ~40%), stacked on mobile. Use CSS Grid in the page-scoped `<style>` block.

**Inside the Single panel:**

1. **Type selector** — horizontal scrollable tab row with 12 tabs. Icons + labels. Pattern: copy `.cc-tabs` from case-converter and rename to `.qr-type-tabs`. Tabs: URL, Text, Email, Phone, SMS, WiFi, vCard, WhatsApp, UPI, Location, Event, App Store.

2. **Input form** — single `<div id="qrInputArea">`. Its contents are swapped by JS based on the active type tab (one `<fieldset>` per type, only the active one shown). Each fieldset has an `id` like `qrForm-url`, `qrForm-wifi`, etc.

3. **Live preview** — a `<div id="qrPreview">` that `qr-code-styling` renders into. Below it: current content size in bytes, current QR version (1–40), and a status chip: "Live preview" / "Content too long — reduce text" / etc.

4. **Design accordion** — four collapsible sections:
   - **Colors & Gradients:** foreground color picker, background color picker, "Use gradient" toggle → when on: gradient type (linear/radial), two color stops, angle slider
   - **Shapes:** dot type (`square` / `rounded` / `dots` / `classy` / `classy-rounded` / `extra-rounded`), eye frame shape (`square` / `extra-rounded` / `dot`), eye ball shape (`square` / `dot`). Radio groups with visual previews.
   - **Logo:** file input (accepts PNG/JPG/SVG, max 2MB), logo size slider (0.2–0.5 of QR width, default 0.35), "Hide dots behind logo" toggle (default on), "Rounded logo" toggle (applies CSS `border-radius: 50%` via SVG mask)
   - **Advanced:** error correction level select (L 7% / M 15% / Q 25% / H 30%, default M), margin slider (0–4 modules, default 1), size preview (px).

5. **Export row** (sticky at bottom of the panel on mobile if feasible):
   - Buttons: "PNG 512", "PNG 1024", "PNG 2048", "SVG", "JPEG"
   - Filename: `doitswift-qr-<type>-<timestamp>.<ext>`
   - All exports use `qrCode.download()` from the qr-code-styling API

### 6e. Bulk mode panel

**Inside the Bulk panel:**

1. **Intro text (2 sentences):** explains how bulk mode works + privacy.
2. **Template download** — button that triggers download of `/qr-code-template.csv`. Template must have the header row and 3 example rows.
3. **CSV upload** — drag-drop zone + file input. Accepts `.csv` only.
4. **Parsed preview** — after upload, show a table of the first 5 rows with a generated QR thumbnail next to each row. Validates each row and shows inline error ("Row 3: missing URL"). Show total row count.
5. **Apply same design?** — the design panel from Single mode is shared; bulk uses whatever the user has set. Show a one-line reminder: "All codes will use the design you set in Single mode."
6. **"Generate ZIP" button** — disabled until a valid CSV is loaded. Generates all codes (loop with a progress bar: "Generating 47/100…"), packages into a ZIP using JSZip. Filename convention: if the CSV has a `filename` column, use it (sanitised); otherwise `qr-<row-index>.png`. Default output format in bulk is PNG at 1024px. Offer a small dropdown: "Output format: PNG 512 / PNG 1024 / PNG 2048 / SVG".
7. **Safety note below the button:** "Very large batches (>500 codes) may take a minute and use significant memory. The tab must stay open."

**CSV template format — EXACT columns:**

```csv
type,content,filename
url,https://example.com/,example-website
text,Hello world,hello-text
wifi,"WIFI:T:WPA;S:Guest;P:mypassword;H:false;;",guest-wifi
```

- Column 1 `type`: required. One of the 12 type codes (lowercase).
- Column 2 `content`: required. For simple types (url/text/phone/email/sms) this is the value directly. For complex types (wifi/vcard/whatsapp/upi/geo/event), this is the **pre-built payload string** (see §7 for exact formats). This keeps the CSV flat and usable.
- Column 3 `filename`: optional. If present, used as output filename (sanitised: alphanumeric + dash + underscore only, max 64 chars). If blank, auto-generated as `qr-<row>.png`.

Document this in the CSV template header and in the bulk mode intro text.

### 6f. Educational article (`article.qr-edu` inside `.container--tool`)

~1800 words total across 7 sections. Use `<h2>` per section, `<h3>` for subsections. Match the voice and density of `heic-to-jpg.astro` lines 230–560 (the "Educational content (SEO)" block).

Sections (with suggested word counts):

1. **How QR codes work (and why "static" matters)** — ~250 words. Explain modules, versions (1–40), error correction, data capacity. Explain what "static" means vs dynamic, and why dynamic codes require a backend you have to trust forever.
2. **The 12 QR code types, explained** — ~400 words. One paragraph per type with a real-world use case. URL, Text, Email, Phone, SMS, WiFi (cafes, Airbnbs), vCard (business cards), WhatsApp (customer support, India/Brazil), UPI (India payments), Geo (directions), Event (invites), App Store link.
3. **Why browser-based generation matters** — ~250 words. Reference publicly reported risks: the US FTC 2023 + 2025 consumer alerts about QR code scams ("quishing") and the FBI IC3 warnings about malicious QR packaging, both of which are public government advisories. Describe the general industry pattern in neutral terms: some free dynamic-QR services encode a short redirect URL through their own domain rather than the user's actual URL, which means printed codes can stop working, change destination, or be rerouted if the service changes policy or shuts down. Do not name specific companies. Then explain the contrast: browser-based static generation means the QR encodes your data directly, not a redirect through a third-party domain that can expire, change destination, or be seized.
4. **Design tips: logo size, contrast, error correction** — ~200 words. The error correction rule: higher ECC (Q/H) lets you cover up to 25–30% of the code with a logo without breaking scannability. Logo should be under 30% of the QR width. Contrast: foreground must be darker than background; avoid color inversion. Light logo backgrounds scan better than dark.
5. **Printing tips** — ~200 words. Minimum print size: 2×2 cm (0.8×0.8 in) for URL, 3×3 cm for vCard. Print at ≥300 DPI. Test scan at the intended size before mass-printing. Quiet zone (margin) ≥4 modules. Avoid lamination or glossy finish that creates glare.
6. **How this approach compares to typical free QR generators** — capability matrix (see §8 below). Precede with a neutral-tone paragraph framing: "Free QR generators fall into a few broad categories — server-based generators, freemium dynamic-QR platforms, and browser-based tools like this one. Each involves different trade-offs around privacy, longevity, and cost. The comparison below focuses on the trade-offs themselves, not on any specific product."
7. **Static-only, on purpose** — ~200 words. The "limitation" as a feature framing. Clear statement: if you need dynamic URL editing or scan analytics, you need a paid tool with a backend, and you should go use one — that's a different product. What we do: static codes that encode your exact data and work forever.

End the article with an **editorial footer block** using the existing `.tool-editorial` class from `global.css`:

```astro
<div class="tool-editorial">
  <p>
    <strong>Reviewed by DoItSwift Editorial.</strong> This tool uses the open-source <code>qr-code-styling</code> library (MIT license) for all rendering. All generation happens in your browser; no QR content is transmitted to DoItSwift or any third party. Information on QR code security risks references public warnings from the <a href="https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information" rel="noopener" target="_blank">US Federal Trade Commission</a> and the <a href="https://www.ic3.gov/" rel="noopener" target="_blank">FBI Internet Crime Complaint Center</a>.
  </p>
  <p class="tool-editorial-meta">Last reviewed: April 2026 · Static QR codes — no data stored, no analytics, no dependencies after download.</p>
</div>
```

### 6g. FAQ (`section.tool-faq`)

14 items. See §9 for content.

### 6h. Related tools & guides (`section.tool-related`)

```astro
<section class="tool-related">
  <div class="container">
    <h2 class="section-title">Related Tools</h2>
    <ul>
      <li><a href="/generator/password-generator/">Password Generator</a> — strong random passwords in your browser</li>
      <li><a href="/image/favicon-generator/">Favicon Generator</a> — site icons from an image</li>
      <li><a href="/image/image-compressor/">Image Compressor</a> — shrink the logo you want to embed</li>
      <li><a href="/image/svg-to-png/">SVG to PNG</a> — convert a logo SVG to PNG before embedding</li>
    </ul>
  </div>
</section>
```

(Guides section can link to future blog posts — add if matching files exist; skip links to non-existent posts.)

---

## 7. The 12 content types — exact input fields and payload formats

Each entry below specifies: (a) the form fields and HTML input types, (b) the exact string to pass to `qr-code-styling`'s `data` option. Implement each as a pure function in `src/lib/qr-generator-ui.ts` named `buildPayload_<type>(fields)`.

### 1. URL
- Field: `url` (type=url, required, placeholder="https://example.com")
- Validation: must start with `http://` or `https://`. Auto-prepend `https://` if the user types `example.com`.
- Payload: the URL as-is.

### 2. Plain text
- Field: `text` (textarea, required, max 2000 chars)
- Payload: the text as-is. Warn visually when >500 chars (QR version bloats rapidly).

### 3. Email
- Fields: `to` (type=email, required), `subject` (optional), `body` (textarea, optional)
- Payload: `mailto:<to>?subject=<urlencoded>&body=<urlencoded>` — omit query params if empty.

### 4. Phone
- Field: `phone` (type=tel, required). Show a helper: "Include country code, e.g. +911234567890".
- Payload: `tel:<phone>` — strip spaces/dashes, keep leading `+` and digits.

### 5. SMS
- Fields: `phone` (type=tel, required), `message` (textarea, optional)
- Payload: `SMSTO:<phone>:<message>` — omit trailing `:` if no message.

### 6. WiFi
- Fields:
  - `ssid` (text, required)
  - `encryption` (select: WPA/WPA2/WPA3, WEP, None — default WPA)
  - `password` (text with show/hide toggle, required unless encryption=None)
  - `hidden` (checkbox: "Network is hidden (doesn't broadcast SSID)")
- Payload: `WIFI:T:<WPA|WEP|nopass>;S:<ssid>;P:<password>;H:<true|false>;;`
- Escape `;`, `,`, `"`, `\` in SSID and password per the WiFi QR spec (prefix with `\`).

### 7. vCard
- Fields (v3.0 format):
  - `firstName`, `lastName` (required)
  - `organization`, `title` (optional)
  - `phoneWork`, `phoneMobile` (optional)
  - `email` (optional)
  - `website` (optional, URL)
  - `address` (optional, single line)
- Payload: vCard 3.0 string:
  ```
  BEGIN:VCARD
  VERSION:3.0
  N:<lastName>;<firstName>;;;
  FN:<firstName> <lastName>
  ORG:<organization>
  TITLE:<title>
  TEL;TYPE=WORK,VOICE:<phoneWork>
  TEL;TYPE=CELL,VOICE:<phoneMobile>
  EMAIL:<email>
  URL:<website>
  ADR;TYPE=WORK:;;<address>;;;;
  END:VCARD
  ```
  Omit any line whose field is blank. Line endings: `\r\n` (required by vCard spec).

### 8. WhatsApp
- Fields: `phone` (type=tel, required, international format), `message` (textarea, optional)
- Payload: `https://wa.me/<phone-digits-only>?text=<urlencoded-message>` — omit `?text=` if no message.

### 9. UPI payment (India)
- Fields:
  - `upiId` (text, required, pattern `^[\w.\-]+@[\w.\-]+$`, placeholder "yourname@bank")
  - `payeeName` (text, required)
  - `amount` (number, optional, step=0.01, min=0)
  - `note` (text, optional, max 50 chars)
  - `currency` (readonly display "INR" — UPI spec)
- Payload: `upi://pay?pa=<upiId>&pn=<urlencoded payeeName>&cu=INR` + optional `&am=<amount>` + `&tn=<urlencoded note>`
- Include a short inline note: "UPI QR codes only work inside India via UPI-enabled apps (GPay, PhonePe, Paytm, BHIM, bank apps)."

### 10. Geo location
- Fields: `latitude` (number, step=any, required, range -90 to 90), `longitude` (number, step=any, required, range -180 to 180). Optional: `query` (text, opens in maps app with label)
- Payload (simple, best compatibility): `geo:<lat>,<lng>` — if a query string is provided, use `geo:<lat>,<lng>?q=<urlencoded>`.

### 11. Calendar event (vEvent)
- Fields: `title` (required), `location` (optional), `startDate` + `startTime` (required, datetime-local), `endDate` + `endTime` (required), `description` (textarea, optional)
- Payload: vEvent block
  ```
  BEGIN:VEVENT
  SUMMARY:<title>
  LOCATION:<location>
  DTSTART:<yyyymmddThhmmssZ>
  DTEND:<yyyymmddThhmmssZ>
  DESCRIPTION:<description>
  END:VEVENT
  ```
  Times in UTC. Omit blank fields. Line endings `\r\n`.

### 12. App Store link
- Fields: `platform` (radio: iOS / Android / Both), `iosUrl` (url, conditional), `androidUrl` (url, conditional)
- If `platform = iOS` or `Android`: payload is the chosen URL directly.
- If `platform = Both`: payload is a landing page URL the user supplies (`landingUrl` field) that does UA detection on their site. Do NOT build a hosted redirect on DoItSwift.
- Include a helper line explaining the "Both" option honestly.

---

## 8. Capability comparison — category-based (no named competitors)

Render as a simple HTML table inside the education article, section 6. Wrap in `<div class="qr-table-wrap">` for mobile horizontal scroll. Use the exact columns and rows below — describing categories of tools, not specific products.

| Capability | Browser-based generators (like this tool) | Server-based free generators | Freemium dynamic-QR services |
|---|---|---|---|
| Where generation happens | In your browser | On the provider's servers | On the provider's servers |
| Works offline after first load | Yes | No | No |
| Your data touches a third party | No | Yes, during generation | Yes, continuously (scan traffic redirects through the provider) |
| Codes expire after a trial period | No — static codes are permanent | Usually no | Often yes (14-day trials are common) |
| Signup required for full features | No | Usually no | Yes |
| Bulk CSV import with full design customization | Yes (here) | Rarely on free tiers | Usually paid |
| Dynamic URL editing and scan analytics | No — static only, by design | Usually no | Yes (paid) |
| Logo embedding on the free tier | Yes | Varies | Varies |
| Shape and gradient customization | Yes | Varies | Yes |
| SVG / print-quality vector export | Yes | Varies | Usually paid |
| On-page ads | None | Often | Often |
| Tracking and analytics on the tool page | Minimal (page analytics only) | Varies | Varies |

Precede the table with the neutral paragraph from §6f step 6.

Below the table, one sentence: "This comparison describes common trade-offs across broad categories of free QR tools. Policies, pricing, and feature sets change; try any tool yourself before committing to production print runs."

**Important:** Do not replace the category names with vendor names, in code comments, alt text, or anywhere else. This comparison intentionally names no competitors.

---

## 9. FAQ — all 14 items (questions + plain-text answers for schema)

Each item goes into `faqsForSchema: { question; answerPlain }[]`. The on-page FAQ renders the same content. Tone: direct, technical, no fluff.

1. **Q:** Are my QR codes really generated in my browser?
   **A:** Yes. The qr-code-styling JavaScript library runs in your browser and produces the QR image locally. No content is sent to DoItSwift for generation. You can verify this by opening DevTools → Network, generating a code, and observing that no request carries your input. You can also disconnect from the internet after the page loads and the tool still works — which is impossible for server-based generators.

2. **Q:** Will the QR codes I download expire?
   **A:** No. These are static QR codes — the data you enter is encoded directly into the black-and-white pattern. There is no redirect through our servers, no short-link layer, and no expiration date. If you encode https://example.com, the QR will always resolve to exactly that URL, forever, regardless of whether DoItSwift exists in 10 years.

3. **Q:** Why can't I make a dynamic QR code here?
   **A:** Dynamic QR codes work by encoding a short redirect URL through a service's server. To edit the destination later, the service has to keep its redirect server running, and your printed codes depend on that service staying online and honoring the link forever. We don't run a backend, so we can't offer dynamic codes. If you need editable URLs or scan analytics, you'll need a paid tool that runs its own servers — that's a different product category. We do static codes only, on purpose, because static codes don't depend on us (or anyone else) staying online.

4. **Q:** Are there usage limits, watermarks, or signup requirements?
   **A:** None. Generate as many QR codes as your browser can handle in a session. There are no download caps, no "powered by" watermarks, no trial periods, and no account to create. The tool is free to use commercially — the underlying qr-code-styling library is MIT licensed.

5. **Q:** How does bulk generation work?
   **A:** Upload a CSV with one row per QR code. We parse the CSV in your browser using Papa Parse, render each QR with qr-code-styling, and zip the results with JSZip. The ZIP downloads directly from your browser. No row of your CSV is uploaded anywhere. Very large batches (>500 codes) may take a minute and use significant memory — keep the tab open until it finishes.

6. **Q:** What CSV format does bulk mode expect?
   **A:** Three columns: type, content, filename. Type is one of the 12 supported types (url, text, email, phone, sms, wifi, vcard, whatsapp, upi, geo, event, app). Content is the value to encode — for simple types it's the text or URL; for complex types like vCard or WiFi, supply the fully-formed payload string. Filename is optional. Download the template above to see working examples.

7. **Q:** What size and resolution should I export for printing?
   **A:** For print, choose SVG (vector, scales to any size without quality loss) or PNG 1024/2048 for raster workflows. Minimum print size is about 2 × 2 cm for URL codes and 3 × 3 cm for data-heavy codes like vCards. Print at 300 DPI or higher. Always scan a test print at the intended size before mass-producing.

8. **Q:** Why does my QR code have different pattern density as I type?
   **A:** QR codes have 40 "versions" (sizes) and more data requires a higher version with more modules. As you add characters, the code automatically moves to a larger version to fit the data, which looks denser. Lower your error correction level or shorten the content to keep density lower. The version number is shown under the preview.

9. **Q:** Can I add a logo? Will it still scan?
   **A:** Yes, upload a PNG, JPG, or SVG up to 2 MB. The tool masks the center of the QR so the logo sits cleanly. Scannability is preserved by the QR standard's error correction — up to 30% of the code can be obscured at error correction level H and still decode. Keep the logo below 30% of the QR's width and use level Q or H if you add a logo.

10. **Q:** Are WiFi, vCard, and UPI QR codes safe to share privately?
    **A:** A WiFi or vCard QR code contains the credentials or contact details directly — anyone who scans it gets what's inside. That's how the format works. The privacy guarantee here is that DoItSwift never sees those credentials because generation is local; but once you print or publish the QR, anyone who scans it has the content. Treat printed WiFi or vCard QR codes the same as a printed password or business card.

11. **Q:** Do UPI QR codes from this tool work with GPay, PhonePe, and Paytm?
    **A:** Yes, if the UPI ID you entered is valid. The tool generates the standard NPCI UPI URL format (upi://pay?pa=...&pn=...&am=...&cu=INR) which all major Indian UPI apps support. Test-scan before printing for merchant use. UPI QR codes only work inside India via UPI-registered apps.

12. **Q:** Which error correction level should I choose?
    **A:** L (7%) makes the smallest code and is fine if the code will be displayed clean on a screen. M (15%) is a sensible default for most print. Q (25%) and H (30%) produce denser codes but tolerate damage, dirt, or a logo overlay. Choose H if you're embedding a logo or printing in outdoor/high-wear conditions.

13. **Q:** Can I use this tool offline?
    **A:** Yes. After the page loads once, your browser caches the scripts. Disconnect from the internet and the tool keeps working — generation, preview, export, and bulk ZIP all happen locally. A first visit on a new device requires a connection to load the page.

14. **Q:** Is this tool free for commercial use?
    **A:** Yes. Codes generated here are free to use for any purpose, including commercial projects. There is no attribution requirement. The underlying qr-code-styling library is MIT licensed.

---

## 10. `src/lib/qr-generator-ui.ts` — structure and public API

Export a single initialiser. Do not polute the global namespace.

```ts
export function initQrGeneratorUI(opts?: { root?: HTMLElement }): void;
```

### Internal modules (all inside this one file unless noted)

1. **Types**
   ```ts
   type QRType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'whatsapp' | 'upi' | 'geo' | 'event' | 'app';
   interface DesignConfig { /* colors, gradient, shapes, logo, ECC, margin */ }
   interface QRInput { type: QRType; fields: Record<string, string>; }
   ```

2. **Payload builders** — one per type, named `buildPayload_url(fields)`, etc. All return a `string`. Write these as pure functions with no DOM access so they're unit-testable.

3. **Escape helpers** — `escapeWifi(str)`, `escapeVCard(str)`, `urlEncodeComponent(str)` (just wraps built-in but documents intent). Include unit-test-style comments above each showing expected input/output.

4. **State** — a single module-level `state` object holding current type, current fields, current design, current mode (single/bulk). No Redux, no framework. Update via a `setState(partial)` helper that also triggers `renderPreview()`.

5. **QR renderer** — a wrapper around `window.QRCodeStyling`:
   ```ts
   function buildQrInstance(payload: string, design: DesignConfig): QRCodeStyling;
   ```
   Handles logo embedding (reads the uploaded file as a data URL, passes it as `image`). Applies gradient options when enabled.

6. **Preview renderer** — `renderPreview()`: debounced 150ms, builds a QR instance and appends to `#qrPreview` (clearing previous). Updates version number + size-in-bytes label.

7. **Exports** — `exportAs(format: 'png' | 'svg' | 'jpeg', sizePx?: number)`: calls `qrInstance.download({ name, extension })`. For PNG sizes, rebuild the instance at the requested pixel size just before download (qr-code-styling's `width`/`height` options).

8. **Mode tabs** — click handlers that toggle `[hidden]` on the two panels and update `aria-selected` / `tabindex`.

9. **Type tabs** — horizontal scrollable row. Click → `setState({ type })` → swap visible fieldset → `renderPreview()`.

10. **Bulk pipeline**:
    - `parseCsv(file: File): Promise<BulkRow[]>` using Papa Parse.
    - `validateRows(rows: BulkRow[]): { valid: BulkRow[]; errors: RowError[] }`.
    - `renderBulkPreview(rows)`: show first 5 with mini QRs (use smaller `width`/`height` like 80px).
    - `generateBulkZip(rows, design, format, onProgress)`: async loop, builds each QR via `qrCode.getRawData(format)`, adds to JSZip, resolves with a Blob the page hands to a download anchor.
    - `sanitizeFilename(name: string): string` — allow `[A-Za-z0-9_-]`, truncate to 64 chars, fallback to `qr-<index>`.

11. **Keyboard shortcuts (optional, low priority):**
    - `Ctrl/Cmd+Enter` inside a content field → download PNG 1024.

12. **Accessibility:**
    - All form controls have `<label>` associations.
    - Tab order: mode tabs → type tabs → active form → design panel → export buttons.
    - The live preview has `aria-live="polite"` on a sibling status element, not on the QR itself.
    - Error messages link via `aria-describedby`.

### Coding style

- TypeScript strict mode assumed (project default).
- Use `const` over `let` where possible.
- Prefer small pure functions over class hierarchies.
- Comment non-obvious QR spec details (e.g., WiFi escape rules, vCard line endings) with a short note and link to the spec in the JSDoc.

---

## 11. Page-scoped CSS (in a `<style>` block at the bottom of `qr-code.astro`)

Scope all selectors under `.qr-tool` or specific IDs. Do **not** use global selectors. Reuse existing design tokens (`var(--blue)`, `var(--border)`, `var(--text-muted)`, `var(--radius)`, `var(--radius-sm)`, etc.) from `global.css`.

Key selectors you'll need:

- `.qr-mode-tabs`, `.qr-mode-tab`, `.qr-mode-tab--active` (mimic `.cc-tabs` style from case-converter but 2 items, centered)
- `.qr-type-tabs` — horizontally scrollable on mobile (`overflow-x: auto`), pill-shaped buttons
- `.qr-layout` — CSS grid, 2 columns on desktop (≥900px), 1 column below
- `.qr-preview-box` — aspect-ratio 1/1, white/dark-aware background, bordered
- `.qr-design-accordion` — `<details>`/`<summary>` pairs for each design section
- `.qr-export-row` — flex row of export buttons, wraps on mobile
- `.qr-bulk-dropzone` — mimic `.dropzone` from heic-to-jpg (don't literally reuse, but visually match)
- `.qr-bulk-preview-table` — simple borderless table with thumbnails
- `.qr-table-wrap` — `overflow-x: auto` wrapper for the comparison table
- `.qr-status` — small status chip under the preview ("Version 3 · 47 bytes" etc.)

Include a full dark-mode pass using `[data-theme='dark']` selectors (the project toggles this attribute on `<html>`).

---

## 12. QA checklist — do all of these before declaring done

- [ ] `npm run build` succeeds.
- [ ] `npm run verify:sitemap` succeeds (sitemap includes `/generator/qr-code/`).
- [ ] `npm run audit:seo` succeeds (trailing-slash and canonical checks pass).
- [ ] Page renders at `/generator/qr-code/` with no console errors.
- [ ] All 12 type tabs show correct input forms.
- [ ] Each of the 12 types produces a scannable QR — test-scan each with a phone. (Critical.)
- [ ] Logo upload works; logo displays in preview and in downloaded PNG/SVG.
- [ ] Color and gradient changes update the preview live.
- [ ] All 3 shape selectors (dots/eye-frame/eye-ball) render correctly.
- [ ] PNG 512 / PNG 1024 / PNG 2048 / SVG / JPEG exports all download with correct filename.
- [ ] Bulk mode: template downloads; CSV upload parses; preview shows; ZIP downloads; ZIP contents scan correctly.
- [ ] Dark mode works throughout.
- [ ] Mobile layout (test at 375px) has no horizontal scroll, type tabs scroll horizontally cleanly, design panel collapses cleanly.
- [ ] All three JSON-LD blocks are present in built HTML; validate via Google Rich Results Test.
- [ ] On-page FAQ text matches FAQPage schema exactly.
- [ ] Breadcrumb, canonical, and og:url all reference `https://doitswift.com/generator/qr-code/` with trailing slash.
- [ ] The capability comparison table claims are defensible as generalizations about categories of tools; no specific company is named.
- [ ] Offline test: load page, then disable network in DevTools, regenerate a QR, export it. Works.
- [ ] No new outbound network requests to non-CDN domains during QR generation.
- [ ] File list modified/created matches §2 exactly. Nothing else changed.

---

## 13. Explicit don'ts

- **Don't** add npm dependencies. CDN imports only.
- **Don't** introduce a new CSS framework or utility library.
- **Don't** create a `/qr/` hub folder. The tool sits under `/generator/`.
- **Don't** add analytics or tracking scripts beyond what `MainLayout.astro` already emits.
- **Don't** use `innerHTML` with user input anywhere in the UI module.
- **Don't** store any user input in `localStorage` unless it's a UI preference like "last-used type tab" — and even then, never store field values.
- **Don't** use external image URLs in a generated QR's logo (CORS issues); only accept user uploads.
- **Don't** name specific competitor products anywhere on the page, in code comments, alt text, image filenames, schema descriptions, or metadata. The comparison table is deliberately category-based (see §8). This rule applies to the main tool page, the CSV template, and any blog posts or guides that later link to this page.
- **Don't** write React/Vue/Svelte components. This project is Astro with vanilla TS.

---

## 14. Suggested build order

Do it in this order. Each step should leave a shipping-capable page if you stop there.

1. **Skeleton:** frontmatter, all three schemas stubbed, hero, breadcrumb, empty tool-section with an `<h2>Coming soon</h2>`, FAQ section with all 14 items in place, related-tools section, editorial footer. Page builds and indexes.
2. **Type: URL only, single mode, no design panel.** Live preview works. PNG export works. Commit.
3. **Add remaining 11 types** (payload builders + form fieldsets). Test-scan each one.
4. **Design panel:** colors → gradients → shapes → logo → advanced (ECC, margin). Commit after each sub-section.
5. **Full export row:** PNG 512/1024/2048 + SVG + JPEG, proper filenames.
6. **Bulk mode:** CSV template file → upload → parse → preview → ZIP download → progress bar.
7. **Educational content:** drop in all prose from §6f, the comparison table, editorial footer.
8. **Polish pass:** mobile responsive audit, dark mode audit, accessibility audit, run the full §12 checklist.
9. **Deploy to preview, scan every type with a real phone, then promote to production.**

---

## 15. Where you may diverge (decisions Cursor can make)

Only these are your call. Everything else is fixed above.

- **Exact HTML for the design accordion** — use `<details>`/`<summary>` or custom buttons; either is fine. Match the project's existing collapsible style if one exists.
- **Debounce window** for live preview — start at 150 ms; tune 100–250 if performance dictates.
- **Progress UI for bulk** — a simple "Generating N/M…" label or a progress bar; either is fine.
- **Order of the 12 type tabs** — suggested: URL, Text, Email, Phone, SMS, WhatsApp, WiFi, vCard, UPI, Location, Event, App. Reorder if user-testing suggests better flow.
- **Tab-bar icons** — use inline SVG or emoji. If unsure, use small emoji like the project does elsewhere (see the password-generator page for tone).

---

End of prompt. Ship it carefully.
