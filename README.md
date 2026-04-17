# DoItSwift — Free Privacy-First Online Tools

**Browser-based image converters, PDF utilities, calculators, and more. No upload for local workflows, no signup, no tracking.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fdoitswift.com&label=doitswift.com)](https://doitswift.com/)

---

## Hero

🌐 **Live site:** [https://doitswift.com/](https://doitswift.com/)

📝 **Blog:** [https://doitswift.com/blog/](https://doitswift.com/blog/)

DoItSwift is a growing collection of **free, privacy-minded tools** for images, PDFs, finance, health, and everyday math. Law enforcement—including the FBI—has repeatedly warned that **malicious or sketchy “file converter” sites can silently steal uploads**, infect devices, or trick users into installing malware. DoItSwift exists to offer a **privacy-first alternative**: file and PDF processing runs **in your browser** whenever possible, so your documents are not sent to our servers for those workflows. There are **no accounts**, and **calculator logic runs locally in JavaScript**—instant results without a backend holding your inputs.

---

## Why DoItSwift exists

Many online converters push **mandatory signups**, **cloud uploads**, or opaque processing—creating **privacy and security risk** (your files on someone else’s infrastructure, unclear retention, ad-heavy or untrusted scripts).

**DoItSwift’s approach:**

- **Client-side processing** for supported image and PDF tools—your files stay on your device.
- **No uploads** to DoItSwift for those workflows; **no accounts** required.
- **No tracking-first product design**—built for people who want utilities without trading away their files.
- **50+ tools in one place**—image and PDF hubs plus [40 calculators](https://doitswift.com/calculator/) for finance, health, math, dates, and daily tasks.

---

## What’s on the site (overview)

| Hub | What you get |
|-----|----------------|
| [**Image tools**](https://doitswift.com/image/) (8) | HEIC/WebP/AVIF conversion, compress, resize, SVG→PNG, favicon ICO, Base64 |
| [**PDF tools**](https://doitswift.com/pdf/) (6) | Merge, split, compress, PDF→JPG, images→PDF, unlock (password) |
| [**Calculators**](https://doitswift.com/calculator/) (40) | Finance (India + global), health, math, dates, tips & discounts, and more |

**Rough total:** **54 tools** across those three hubs, plus articles on the blog.

---

## Features (highlights)

### Image tools

- 🔒 [**HEIC to JPG**](https://doitswift.com/image/heic-to-jpg/) — Convert iPhone photos without uploading
- 📦 [**WebP to JPG**](https://doitswift.com/image/webp-to-jpg/) — Handle Google’s image format locally
- 🗜️ [**Image compressor**](https://doitswift.com/image/image-compressor/) — Reduce file size with a quality control
- 📐 [**Image resizer**](https://doitswift.com/image/image-resizer/) — Resize for social, email, or web
- 🎨 [**SVG to PNG**](https://doitswift.com/image/svg-to-png/) — Rasterize vector graphics with custom dimensions
- ⭐ [**Favicon generator**](https://doitswift.com/image/favicon-generator/) — Build multi-size ICO files for sites
- 📱 [**AVIF to JPG**](https://doitswift.com/image/avif-to-jpg/) — Convert next-gen AVIF when you need wide compatibility
- 🔢 [**Image to Base64**](https://doitswift.com/image/image-to-base64/) — Encode images for HTML or APIs

### PDF tools

- 🖼️ [**PDF to JPG**](https://doitswift.com/pdf/pdf-to-jpg/) — Export pages as JPEG images
- 📑 [**Image to PDF**](https://doitswift.com/pdf/image-to-pdf/) — Combine JPG, PNG, WebP, HEIC, and more
- ➕ [**Merge PDFs**](https://doitswift.com/pdf/merge-pdf/) — Join multiple PDFs in order
- ✂️ [**Split PDF**](https://doitswift.com/pdf/split-pdf/) — Extract pages or ranges
- 🗜️ [**Compress PDF**](https://doitswift.com/pdf/compress-pdf/) — Shrink file size in the browser
- 🔓 [**Unlock PDF**](https://doitswift.com/pdf/unlock-pdf/) — Remove password protection when you have the correct key

### Calculators (samples — [full list](https://doitswift.com/calculator/))

**Finance & tax (including India-focused):** SIP, EMI, home loan + prepay, income tax (new vs old regime), FD, RD, PPF, GST, HRA, retirement, salary (CTC → in-hand), NPS, compound interest, SWP, personal loan, US mortgage, stock average / P&L, lumpsum, buy vs rent (EMI vs rent + invest), markup & margin.

**Health & wellness:** BMI, calories / TDEE, ideal weight, body fat (US Navy), pregnancy due date, water intake, macros, period & ovulation, heart rate zones.

**Math, education & time:** percentage, scientific calculator, GPA, fraction, statistics, age, date difference, time math.

**Everyday:** tip (split bill), discount, unit converter.

---

## Roadmap

Shipped hubs are listed above. **Coming next** (also see [Roadmap on the site](https://doitswift.com/pro/)):

- **Text tools** — word count, JSON formatter, case converter  
- **Generators** — QR code, password, UUID, invoice  
- **Audio / video** — conversion, trim, lightweight edits  
- **AI-assisted tools** — background remove, upscale (where feasible with a clear privacy model)  

---

## Tech stack

| Area | Choices |
|------|---------|
| **Framework** | [Astro](https://astro.build/) — static-first, fast pages |
| **Hosting** | [Cloudflare Pages](https://pages.cloudflare.com/) — global CDN |
| **Languages** | TypeScript, HTML, CSS — minimal server/runtime complexity |
| **Client libraries** | [heic2any](https://github.com/alexcorvi/heic2any) (HEIC), [JSZip](https://stuk.github.io/jszip/) (batch ZIP downloads), [**pdf-lib**](https://pdf-lib.js.org/) & [**PDF.js**](https://mozilla.github.io/pdf.js/) (PDF merge/split/compress/convert), **Canvas API** (image work in the browser) |

**Why this stack:** static generation for speed and SEO, **browser APIs for privacy-sensitive work**, and CDN hosting for performance worldwide.

---

## Local development

**Requirements:** [Node.js](https://nodejs.org/) **≥ 22.12** (see `package.json` `engines`).

```bash
git clone https://github.com/vats-shashank/doitswift.git
cd doitswift
npm install
npm run dev
```

The dev server defaults to **http://localhost:4321** (Astro’s default).

| Command | Purpose |
|--------|---------|
| `npm run dev` | Local development with hot reload |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test:calculators` | Run calculator regression checks |
| `npm run verify:sitemap` | Validate sitemap after build |
| `npm run verify:deploy` | Build + smoke preview + prod sitemap check |

Configure the public site URL in `astro.config.mjs` (`site`) for canonical URLs and the sitemap integration.

---

## License

Released under the MIT License. See [`LICENSE`](LICENSE) in this repository.
