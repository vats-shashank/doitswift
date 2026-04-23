# QR Code Generator — Session Prompts

Short, paste-and-go instructions for each phase of the QR code build. Work through them in order, one per Cursor session. Use your existing `docs/build-prompts/qr-code-generator.md` as the spec; these prompts just tell Cursor which section to execute.

---

## Session 1 — Skeleton & schema

**Goal:** Page exists at `/generator/qr-code/`, indexes cleanly, all schema blocks valid, tool section is a placeholder.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md` in full. Then execute **Section 14, step 1 only** (the skeleton phase). Specifically:
>
> 1. Create `src/pages/generator/qr-code.astro` with:
>    - Frontmatter per §4
>    - All three schema blocks per §5 (SoftwareApplication, FAQPage from `faqsForSchema` array with all 14 FAQ items from §9, BreadcrumbList)
>    - Breadcrumb nav and hero per §6a–§6b
>    - A placeholder tool section with just `<h2>Tool coming in next session</h2>`
>    - Full FAQ section rendering the 14 items from the schema array
>    - Related tools section per §6h
>    - Editorial footer per §6f ending block
>    - A `<style>` block with the page-scoped classes from §11 stubbed out (empty rulesets are fine for now)
>
> 2. Create `public/qr-code-template.csv` with the exact header and 3 example rows from §6e.
>
> 3. Create `src/lib/qr-generator-ui.ts` with just the exported `initQrGeneratorUI()` function signature — body can be an empty function for now. Include all the type definitions from §10 item 1.
>
> 4. Update `src/pages/generator/index.astro` to include a link/card for the QR Code Generator, matching the existing pattern for password-generator.
>
> 5. Run `npm run build` and `npm run audit:seo`. Both must pass. Fix anything that fails.
>
> **Do not start implementing QR generation logic yet.** Stop after the skeleton builds cleanly and show me:
> - The new file tree (which files you created/modified)
> - The output of `npm run build`
> - The output of `npm run audit:seo`

---

## Session 2 — URL-only tool, end-to-end

**Goal:** A working QR generator for one type (URL), with live preview and PNG export. Proves the plumbing works before we scale to 12 types.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md`. Execute **Section 14, step 2**: implement the single-mode tool panel for the URL content type only.
>
> 1. In `src/pages/generator/qr-code.astro`, replace the placeholder tool section with the real single-mode panel structure from §6d, but include only the URL form fieldset. Leave the other 11 type tabs visible but disabled/grayed out with `title="Coming soon"`.
>
> 2. In `src/lib/qr-generator-ui.ts`:
>    - Implement `buildPayload_url(fields)` per §7 item 1 (auto-prepend `https://` if the user typed a bare domain)
>    - Implement `initQrGeneratorUI()`:
>      - Wire the URL input with a 150ms debounced `renderPreview()`
>      - Build a `QRCodeStyling` instance from `window.QRCodeStyling`
>      - Render into `#qrPreview`
>      - Show content size in bytes and QR version under the preview (via the `.qr-status` element)
>    - Implement `exportAs('png', 1024)` — wire the "PNG 1024" export button
>
> 3. No design panel yet. No gradient, no logo, no shape customization. Defaults only: black on white, square dots, ECC level M, margin 1.
>
> 4. Test manually:
>    - Load the page, type `example.com`, confirm preview updates and shows `https://example.com`
>    - Click "PNG 1024", confirm download
>    - Scan the downloaded PNG with a phone — must resolve to `https://example.com`
>    - `npm run build` must pass
>
> Stop when URL-type generation works end-to-end. Show me the screenshot of a generated QR, the file list changed, and confirmation that scanning works.

---

## Session 3 — Remaining 11 content types

**Goal:** All 12 types generate scannable QRs. Still default styling, no design panel yet.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md`. Execute **Section 14, step 3**: add the remaining 11 content types.
>
> For each of Text, Email, Phone, SMS, WiFi, vCard, WhatsApp, UPI, Location, Event, App Store:
>
> 1. Add the form fieldset inside `#qrInputArea` per §7 (exact fields listed per type)
> 2. Add the `buildPayload_<type>(fields)` function in `src/lib/qr-generator-ui.ts` — use the exact payload format from §7
> 3. Wire the type tab click handler so selecting the type shows the right fieldset and calls `renderPreview()`
> 4. Enable the type tab (remove the "Coming soon" state)
>
> **Critical constraints:**
> - WiFi: escape `;`, `,`, `"`, `\` in SSID and password per the WiFi QR spec (prefix with `\`)
> - vCard: use `\r\n` line endings (required by the spec — plain `\n` will break some scanners)
> - vEvent: times in UTC, format `yyyymmddThhmmssZ`
> - UPI: include the INR currency code, URL-encode the payee name and note
> - All URL-encoded fields must be passed through `encodeURIComponent`
>
> After each type is wired, test-scan a generated code with your phone before moving to the next type. **This is the step that catches spec bugs** — do not skip the scan test.
>
> Stop after all 12 are working. Show me:
> - `npm run build` output
> - A screenshot of the type-tab row (all 12 enabled)
> - Confirmation that you scan-tested each type (even one-word: "scanned — works")

---

## Session 4 — Design panel

**Goal:** Full visual customization: colors, gradients, shapes, logo, advanced options.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md`. Execute **Section 14, step 4**: implement the four-section design accordion from §6d item 4.
>
> Do them in this sub-order, committing after each. After each sub-step, I should be able to visually change the QR:
>
> 1. **Colors:** foreground color picker, background color picker. Wire to `dotsOptions.color` and `backgroundOptions.color` in the QRCodeStyling config.
> 2. **Gradients:** "Use gradient" toggle. When on: gradient type (linear/radial), two color stops, angle slider (linear only). Wire to `dotsOptions.gradient`.
> 3. **Shapes:** dot type (6 options), eye frame shape (3 options), eye ball shape (2 options). Radio groups. Wire to `dotsOptions.type`, `cornersSquareOptions.type`, `cornersDotOptions.type`.
> 4. **Logo:** file input (PNG/JPG/SVG, max 2MB). Read as data URL via FileReader. Wire to `image` option. Add logo size slider (0.2–0.5 of QR width) wired to `imageOptions.imageSize`. "Hide dots behind logo" toggle wired to `imageOptions.hideBackgroundDots`.
> 5. **Advanced:** error correction level select (L/M/Q/H, default M) wired to `qrOptions.errorCorrectionLevel`. Margin slider (0–4) wired to `qrOptions.margin`.
>
> All changes must update the live preview within 150ms.
>
> **Constraint:** The file input must read files locally with FileReader. Never upload the logo file to any server. Reject files over 2MB with a visible error message.
>
> Then add the remaining export buttons:
> - PNG 512, PNG 1024, PNG 2048 (three separate buttons, each rebuilds the QRCodeStyling instance at that pixel size before download)
> - SVG
> - JPEG at 1024
> - Filename format: `doitswift-qr-<type>-<timestamp>.<ext>` where `<type>` is the active type code and `<timestamp>` is `YYYYMMDD-HHMMSS`.
>
> Test the full customization end-to-end: change colors, add a gradient, switch shapes, upload a logo, export as SVG, open the SVG in a browser, scan it. Then do the same for PNG 2048.
>
> Stop when the single-mode tool is feature-complete. Show me a screenshot of a fully styled QR with logo, and confirm the SVG scan test.

---

## Session 5 — Bulk CSV mode

**Goal:** Upload a CSV, generate hundreds of QRs, download as ZIP. All client-side.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md`. Execute **Section 14, step 6**: implement the bulk CSV mode per §6e and §10 item 10.
>
> 1. Wire the mode-tab toggle so clicking "Bulk from CSV" swaps panels.
>
> 2. In the bulk panel:
>    - "Download template" button → triggers download of `/qr-code-template.csv`
>    - File input for CSV upload
>    - On upload: call `parseCsv(file)` using `Papa.parse` from PapaParse
>    - Call `validateRows(rows)` — for each row, validate type ∈ valid set, content non-empty, filename matches `[A-Za-z0-9_-]{1,64}` if present
>    - Render a preview table showing the first 5 rows with a small generated QR (80×80px) next to each, plus total count and error list
>    - "Generate ZIP" button, disabled until at least 1 valid row exists
>    - Output format dropdown: PNG 512, PNG 1024 (default), PNG 2048, SVG
>
> 3. On "Generate ZIP":
>    - Show a progress indicator that updates as each row is processed ("Generating 47/100…")
>    - For each valid row:
>      - Build payload string via the `buildPayload_<type>` functions
>      - Create a QRCodeStyling instance with the current design config (colors, shapes, logo etc. from the single-mode panel — they share state per §6e item 5)
>      - Call `qrCode.getRawData(format)` to get the Blob
>      - Add to JSZip with the sanitized filename from `sanitizeFilename(row.filename) || 'qr-' + index`
>    - When done, call `zip.generateAsync({ type: 'blob' })` and trigger a download of `doitswift-qr-batch-<timestamp>.zip`
>
> 4. Safety: if row count > 500, show a warning before starting: "You're about to generate N codes. This may take a minute and use significant memory. Keep this tab open. Continue?"
>
> **Test with:**
> - The template CSV (3 rows) — expect a ZIP with 3 PNGs, each scannable
> - A CSV with 100 URLs — expect progress UI, ZIP with 100 PNGs, spot-check a few
> - A CSV with one malformed row — expect it to be listed as an error and skipped
> - A CSV with a missing type column — expect a clear error message
>
> Stop when bulk generation works end-to-end. Show me a screenshot of the progress UI mid-generation, and confirmation that a downloaded ZIP contains scannable codes.

---

## Session 6 — Educational content + capability comparison + polish

**Goal:** Full article content, comparison table, final polish pass.

**Paste this:**

> Read `docs/build-prompts/qr-code-generator.md`. Execute **Section 14, steps 7 and 8**: the educational article, capability comparison table, and final polish.
>
> 1. Drop in the full educational article per §6f, seven sections with the word counts indicated. Voice should match `src/pages/image/heic-to-jpg.astro` lines 230–560. Write the prose yourself based on my specs — do not copy from existing pages.
>
> 2. Insert the capability comparison table from §8 exactly as written. **Do not name any specific company in the table, in any label, or anywhere else on the page.** The table describes categories of tools, not products. The Don'ts in §13 explicitly forbid naming competitors.
>
> 3. Polish pass — go through the §12 QA checklist item by item. For any failure:
>    - If it's a code issue, fix it
>    - If it's a content issue, fix the content
>    - If it's a design issue, adjust the CSS
>
> 4. Mobile audit: open Chrome DevTools, toggle device to iPhone SE (375px wide). Check that:
>    - Hero doesn't overflow
>    - Type-tab row scrolls horizontally cleanly
>    - Design accordion sections expand and collapse cleanly
>    - Bulk preview table doesn't break layout
>    - FAQ items stack cleanly
>    - No horizontal scroll on the page body itself
>
> 5. Dark mode audit: toggle `data-theme="dark"` on `<html>`. Check every color is legible. Check the QR preview background is distinguishable.
>
> 6. Accessibility audit:
>    - Tab through the page with keyboard only. Focus ring visible everywhere.
>    - Every form control has an associated `<label>`.
>    - Design accordion sections are either `<details>/<summary>` or buttons with proper `aria-expanded`.
>    - Color contrast on text meets WCAG AA.
>
> 7. Run `npm run build` and `npm run audit:seo`. Both must pass.
>
> Stop when the checklist is fully green. Hand me the preview URL and the full §12 checklist with every box ticked.

---

## Session 7 — Production deploy + post-ship QA

**Goal:** Ship to prod with a clean post-deploy verification.

**Paste this:**

> The QR Code Generator is ready for production. Before I merge to main:
>
> 1. Run one final `npm run verify:deploy` — this runs the full build + smoke preview + prod sitemap check. Must pass cleanly.
>
> 2. Confirm the file list modified exactly matches §2 of `docs/build-prompts/qr-code-generator.md`. Nothing else should have changed. If you accidentally touched other files, revert them.
>
> 3. Once merged and deployed to production:
>    - Open `https://doitswift.com/generator/qr-code/` in a fresh incognito window
>    - Open DevTools → Network tab, set filter to "hide data URLs"
>    - Generate a QR code. Confirm zero requests carry QR content.
>    - Disconnect the internet. Reload the page. Generate a QR. Must still work.
>    - Reconnect, test-scan a generated code.
>
> 4. Submit the new URL to Google Search Console for indexing.
>
> 5. Run Google Rich Results Test on the page. All three schemas (SoftwareApplication, FAQPage, BreadcrumbList) must be detected with no errors.
>
> 6. Update the status table in `docs/build-prompts/README.md`: change `qr-code-generator.md` status to "Shipped" with today's date.
>
> Report back with:
> - The production URL
> - Screenshot of the Rich Results Test result (all three schemas)
> - Confirmation of the offline test
> - Confirmation of the no-upload-traffic test

---

## If something goes wrong mid-session

If Cursor starts improvising or diverging from the spec:

1. Stop the session.
2. Check if the spec is actually wrong, or if Cursor just didn't follow it.
3. If the spec is wrong: edit `docs/build-prompts/qr-code-generator.md`, note the change in a Changelog block at the bottom of the file, then restart the session with the updated spec.
4. If Cursor didn't follow it: tell Cursor to revert its changes and re-read the relevant section.

Never let improvisations accumulate silently — they compound into a build that doesn't match any document.

## Tracking progress between sessions

After each session, commit the work to git with a clear message:

```
feat(qr): session 3 — 12 content types wired and scan-tested
```

That way, if you ever need to roll back to the end of a specific session, the history is there. It also makes it obvious which session introduced a bug if one shows up later.

---

Last updated: April 2026
