/** JSON-LD @graph for /generator/lorem-ipsum/ (Session 5). */
export const loremPageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'DoItSwift Lorem Ipsum Generator',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (Web Browser)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description:
        'Privacy-first Lorem Ipsum generator with 10 designer-shaped UI templates and 8-language support including Hindi, Arabic, and Chinese. Browser-based with no signup, no analytics, and no third-party trackers.',
      url: 'https://doitswift.com/generator/lorem-ipsum/',
      featureList: [
        'Standard generation by paragraphs, sentences, words, characters, or bytes',
        '10 UI component templates: Page Hero, Blog Post, FAQ, Product Cards, Navigation, Form Labels, Email Subject, Social Post, Testimonials, Pricing Tier',
        'Visual SVG previews of each template before generation',
        '8 languages and scripts: English real-feel, classic Latin, Hindi, Arabic (RTL), Chinese Simplified, Bengali, Spanish, Russian',
        'Right-to-left rendering for Arabic',
        'Three output formats: plain text, HTML, JSON',
        'Per-item copy buttons for multi-item templates',
        'Length-targeted output stops cleanly at word boundaries',
        'Keyboard shortcuts (Cmd/Ctrl+G to generate, Cmd/Ctrl+C to copy)',
        'Runs entirely in your browser — no signup, no data sent to any server',
        'No analytics or third-party trackers on this tool',
        'Free for personal and commercial use, no usage limits',
      ],
      browserRequirements: 'Requires JavaScript and the Fetch API. Compatible with Chrome, Firefox, Safari, Edge.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Lorem Ipsum and where does it come from?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Lorem Ipsum is placeholder text used by designers and developers to fill layouts before real content is written. The classic Latin version is sourced from a passage in Cicero's De finibus bonorum et malorum (sections 1.10.32-33), written around 45 BCE. Designers have used the scrambled version since the 1500s, and digital designers adopted it widely in the 1980s when desktop publishing emerged. The scrambled words look like real text without distracting readers with meaning, which lets reviewers focus on the visual layout rather than the words.",
          },
        },
        {
          '@type': 'Question',
          name: 'How is the DoItSwift Lorem Ipsum Generator different from other lorem ipsum tools?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Most lorem ipsum tools generate generic paragraphs. The DoItSwift Lorem Ipsum Generator adds three things competitors typically don't: UI component templates that produce text shaped for specific layouts (page heroes, product card grids, FAQ sections, pricing tiers, etc.), 8 language and script options including Hindi, Arabic, Chinese, and Bengali for designers building non-Latin interfaces, and a privacy-first promise of no signup, no analytics, and no third-party trackers. The tool also uses real-feel English by default — placeholder text that looks like English at a glance, which clients sometimes prefer over Latin.",
          },
        },
        {
          '@type': 'Question',
          name: 'What is real-feel English mode?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Real-feel English uses common English words to produce placeholder text that looks like real English at a glance. It is grammatically meaningless but reads more naturally than scrambled Latin. This is useful when previewing layouts to clients or non-technical stakeholders who might not recognize Latin lorem ipsum and assume the page is broken or untranslated. To use the original Latin, switch the language selector to Latin (classic Lorem Ipsum).',
          },
        },
        {
          '@type': 'Question',
          name: 'Which UI component templates are available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ten templates: Page Hero (H1 plus subtitle plus two CTA buttons), Blog Post Structure (H1, byline, four H2 sections with body paragraphs), FAQ Section (count-selectable Q&A pairs), Product Cards (count-selectable cards with title, price, description, CTA), Navigation Menu (short labels), Form Labels & Placeholders (label and placeholder pairs), Email Subject + Preview (length-targeted subject and preview text), Social Media Post (Twitter, Instagram, and LinkedIn variants at appropriate lengths), Testimonial Cards (quote, name, title), and Pricing Tier (tier name, price, feature bullets). Each template generates output in plain text, HTML, or JSON format.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I generate Lorem Ipsum in Hindi, Arabic, or Chinese?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The DoItSwift Lorem Ipsum Generator supports 8 languages and scripts: English (real-feel), classic Latin, Hindi (Devanagari), Arabic (with right-to-left rendering), Chinese Simplified, Bengali, Spanish, and Russian (Cyrillic). For Arabic, the output area automatically switches to right-to-left text direction so designers can evaluate RTL layout behavior. The non-Latin word lists use everyday vocabulary to produce text with realistic character density and line-break behavior in the target script.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I generate exactly N characters or words of placeholder text?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'In Standard mode, choose Characters or Words from the Generate dropdown and enter your target count. The generator builds enough text to exceed the target, then trims cleanly at the last word boundary that fits — no mid-word truncation. For exact byte limits (useful for SMS character limits, database VARCHAR fields, or meta description budgets), use the Bytes mode. Note that for non-Latin scripts (Hindi, Arabic, Chinese, Bengali, Russian), each character is typically 2-3 UTF-8 bytes, so byte counts will produce fewer visible characters than they would in English.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does the tool work on mobile?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The DoItSwift Lorem Ipsum Generator works in any modern mobile browser — Safari on iOS, Chrome on Android, and others. No app installation is required. The interface stacks vertically on narrow screens, the language dropdown stays accessible, and the Generate and Copy buttons are sized for touch. Both standard and UI templates modes work identically on mobile.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does this tool collect or send my data anywhere?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "No. The DoItSwift Lorem Ipsum Generator runs entirely in your browser. The only network requests are to fetch word-list JSON files from the same origin (doitswift.com). No generated text, copy actions, language selections, or template choices are sent to any server. There is no signup, no account, no third-party analytics on this specific tool, and no advertising trackers anywhere on the site. You can verify this in your browser's developer tools Network tab — generating text triggers zero outbound requests.",
          },
        },
        {
          '@type': 'Question',
          name: 'Why are some pricing tier names always English (like Starter, Pro, Premium)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The pricing tier template uses standard tier-naming convention because designers building pricing pages typically want recognizable tier names regardless of the body language. The tier names (Starter, Basic, Pro, Premium, etc.), prices, and currency symbols stay in their conventional English form, while the feature bullets generate in your selected language. This matches how multilingual SaaS pricing pages actually work — the tier naming is often kept in English even when the rest of the site is localized.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use this Lorem Ipsum text in client work or commercial projects?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. The placeholder text generated by this tool is free to use in any personal or commercial project, including client work, mockups, prototypes, published websites, printed materials, and design-system documentation. The classic Latin Lorem Ipsum text traces to a public-domain passage from Cicero. The non-Latin word lists are everyday-vocabulary words with no copyright restrictions. The DoItSwift tool itself imposes no license, attribution requirement, or usage cap.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I copy just one card or one FAQ from a multi-item output?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'When you generate a multi-item template like Product Cards, FAQ Section, Testimonial Cards, or Pricing Tiers, numbered copy buttons appear below the output text in Text view. Click the number for the item you want to copy, and just that single item\'s data is copied to your clipboard as JSON. This is useful when you want to paste a specific testimonial or product card into your design tool without grabbing the entire batch. The per-item buttons appear only in Text view; HTML and JSON views give you the whole structured output.',
          },
        },
        {
          '@type': 'Question',
          name: 'What keyboard shortcuts are available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The DoItSwift Lorem Ipsum Generator supports two keyboard shortcuts: Cmd+G (Mac) or Ctrl+G (Windows/Linux) regenerates fresh text in the current mode and template, and Cmd+C or Ctrl+C copies the current output to your clipboard when no text is selected. Both shortcuts work from anywhere on the page so you can rapidly iterate without clicking buttons.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who maintains this tool and how is the methodology checked?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "DoItSwift's tools and educational content are maintained by DoItSwift Editorial under a published editorial standard. The classic Latin Lorem Ipsum word list is sourced from Cicero's De finibus bonorum et malorum (sections 1.10.32-33), the original passage that became standard placeholder text and is in the public domain. The English real-feel word list is curated from common English vocabulary. Non-Latin word lists use everyday-vocabulary words from the respective languages — they produce text with realistic character density and line-break behavior for layout testing, which is the purpose of placeholder text. You can read the full editorial policy, research methodology, and fact-checking standards at /about/editorial-policy/, /about/how-we-research/, and /about/fact-checking/.",
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doitswift.com/' },
        { '@type': 'ListItem', position: 2, name: 'Generators', item: 'https://doitswift.com/generator/' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Lorem Ipsum Generator',
          item: 'https://doitswift.com/generator/lorem-ipsum/',
        },
      ],
    },
    {
      '@type': 'HowTo',
      name: 'How to Generate Designer-Shaped Lorem Ipsum Placeholder Text',
      description:
        'Generate placeholder text shaped for real UI components, with 8 language options and three output formats.',
      totalTime: 'PT15S',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Choose your mode',
          text: 'Pick Standard for paragraphs/sentences/words/characters/bytes, or UI Templates for pre-shaped placeholders like Page Hero, Product Cards, or FAQ Section.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Select language',
          text: 'Choose from 8 languages and scripts including English real-feel, classic Latin, Hindi, Arabic (RTL), Chinese, Bengali, Spanish, and Russian.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Set count or template',
          text: 'In Standard mode, set how many paragraphs/sentences/words/etc. In UI Templates mode, pick a template and (where applicable) the number of items.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Generate and copy',
          text: 'Click Generate or press Cmd/Ctrl+G. For UI Templates, switch between Text, HTML, or JSON output. Click Copy to copy the result, or click a numbered button to copy a single item from a multi-item template.',
        },
      ],
    },
  ],
};
