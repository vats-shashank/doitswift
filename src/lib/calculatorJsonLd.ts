/**
 * Shared Schema.org JSON-LD for calculator tool pages (WebApplication + optional FAQ + BreadcrumbList).
 */

export interface CalculatorFaqItem {
  question: string;
  answer: string;
}

export interface BuildCalculatorGraphInput {
  site: URL | undefined;
  /** Current path, e.g. `/calculator/emi/` (trailing slash matches site config). */
  pathname: string;
  appName: string;
  breadcrumbName: string;
  webAppDescription: string;
  featureList: string[];
  applicationCategory?: string;
  browserRequirements?: string;
  /** Default INR; use USD for US-centric tools (e.g. mortgage). */
  priceCurrency?: string;
  faqs?: CalculatorFaqItem[];
}

export function calculatorCanonical(site: URL | undefined, pathname: string): string {
  if (!site) return pathname;
  return new URL(pathname, site).toString();
}

export function buildCalculatorJsonLd(input: BuildCalculatorGraphInput) {
  const {
    site,
    pathname,
    appName,
    breadcrumbName,
    webAppDescription,
    featureList,
    applicationCategory = 'UtilitiesApplication',
    browserRequirements,
    priceCurrency = 'INR',
    faqs,
  } = input;

  const canonical = calculatorCanonical(site, pathname);

  const webApp: Record<string, unknown> = {
    '@type': 'WebApplication',
    name: appName,
    url: canonical,
    applicationCategory,
    operatingSystem: 'Web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency },
    description: webAppDescription,
    featureList,
  };
  if (browserRequirements) webApp.browserRequirements = browserRequirements;

  const graph: Record<string, unknown>[] = [webApp];

  if (faqs && faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  if (site) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', site).href },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: new URL('/calculator/', site).href },
        { '@type': 'ListItem', position: 3, name: breadcrumbName, item: canonical },
      ],
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
