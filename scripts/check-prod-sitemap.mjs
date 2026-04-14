/**
 * Fetches production sitemap index over HTTPS. Fails on non-2xx; warns on network error.
 * Does not compare to local dist (deploy may lag).
 */
const SITEMAP_INDEX = 'https://doitswift.com/sitemap-index.xml';

async function main() {
  try {
    const res = await fetch(SITEMAP_INDEX, {
      redirect: 'follow',
      headers: { 'user-agent': 'DoItSwift-deploy-check/1.0' },
    });
    if (!res.ok) {
      console.error(`check-prod-sitemap: HTTP ${res.status} for ${SITEMAP_INDEX}`);
      process.exit(1);
    }
    const text = await res.text();
    if (!text.includes('sitemap') || !text.includes('<loc>')) {
      console.error('check-prod-sitemap: unexpected body (no sitemap loc tags?)');
      process.exit(1);
    }
    console.log(`check-prod-sitemap: OK — ${SITEMAP_INDEX} returned ${res.status}`);
  } catch (e) {
    console.warn('check-prod-sitemap: could not reach production (offline or DNS):', e.message);
    process.exit(0);
  }
}

main();
