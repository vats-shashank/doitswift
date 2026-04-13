# DoItSwift — Free Privacy-First Online Tools

**Browser-based file converters, compressors, and utilities. No upload, no signup, no tracking.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fdoitswift.com&label=doitswift.com)](https://doitswift.com/)

---

## Hero

🌐 **Live site:** [https://doitswift.com](https://doitswift.com)

📝 **Blog:** [https://doitswift.com/blog](https://doitswift.com/blog)

DoItSwift is a collection of free, privacy-minded tools for images and (soon) other everyday tasks. Law enforcement—including the FBI—has repeatedly warned that **malicious or sketchy “file converter” sites can silently steal uploads**, infect devices, or trick users into installing malware. DoItSwift exists to offer a **privacy-first alternative**: processing runs **in your browser** whenever possible, so your files are not sent to our servers for conversion, there are **no accounts**, and the model is built around **client-side workflows** instead of “upload and trust us.”

---

## Why DoItSwift exists

Many online converters push **mandatory signups**, **cloud uploads**, or opaque processing—creating **privacy and security risk** (your files on someone else’s infrastructure, unclear retention, ad-heavy or untrusted scripts).

**DoItSwift’s approach:**

- **100% client-side processing** for supported image tools—your files stay on your device.
- **No uploads** to DoItSwift for those workflows; **no accounts** required.
- **No tracking-first product design**—built for people who want utilities without trading away their files.

---

## Features

- 🔒 [**HEIC to JPG converter**](https://doitswift.com/image/heic-to-jpg) — Convert iPhone photos without uploading  
- 📦 [**WebP to JPG converter**](https://doitswift.com/image/webp-to-jpg) — Handle Google’s image format locally  
- 🗜️ [**Image compressor**](https://doitswift.com/image/image-compressor) — Reduce file size without visible quality loss  
- 📐 [**Image resizer**](https://doitswift.com/image/image-resizer) — Resize for social media, email, or web  
- 🎨 [**SVG to PNG exporter**](https://doitswift.com/image/svg-to-png) — Convert vector graphics with custom dimensions  
- ⭐ [**Favicon generator**](https://doitswift.com/image/favicon-generator) — Create ICO files for your website  
- 📱 [**AVIF to JPG converter**](https://doitswift.com/image/avif-to-jpg) — Convert next-gen formats  
- 🔢 [**Image to Base64**](https://doitswift.com/image/image-to-base64) — Encode images for code embeds  

---

## Roadmap

Planned directions (see also [Roadmap](https://doitswift.com/pro) on the site):

- **PDF tools** — merge, split, compress, convert  
- **Calculators** — EMI, BMI, mortgage, SIP  
- **Text tools** — word count, JSON formatter, case converter  
- **Generators** — QR code, password, UUID, invoice  
- **AI tools** — background remove, upscale  

---

## Tech stack

| Area | Choices |
|------|---------|
| **Framework** | [Astro](https://astro.build/) — static-first, fast pages |
| **Hosting** | [Cloudflare Pages](https://pages.cloudflare.com/) — global CDN |
| **Languages** | TypeScript, HTML, CSS — minimal server/runtime complexity |
| **Client libraries** | [heic2any](https://github.com/alexcorvi/heic2any) (HEIC decoding), [JSZip](https://stuk.github.io/jszip/) (batch ZIP downloads), **Canvas API** (image processing in the browser) |

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

Configure the public site URL in `astro.config.mjs` (`site`) for canonical URLs and the sitemap integration.

---

## License

Released under the MIT License. See [`LICENSE`](LICENSE) in this repository.
