/**
 * Display-only currency helpers for calculators (math is currency-agnostic).
 * Maps ISO 4217 codes to BCP 47 locales for Intl.NumberFormat.
 */

export const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
  SGD: 'en-SG',
  AED: 'en-AE',
  SAR: 'ar-SA',
  CNY: 'zh-CN',
  HKD: 'en-HK',
  NZD: 'en-NZ',
  KRW: 'ko-KR',
  THB: 'th-TH',
  MYR: 'ms-MY',
  PHP: 'en-PH',
  IDR: 'id-ID',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  ZAR: 'en-ZA',
  TRY: 'tr-TR',
  PLN: 'pl-PL',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  ILS: 'he-IL',
  PKR: 'en-PK',
  BDT: 'bn-BD',
  LKR: 'si-LK',
  NPR: 'ne-NP',
};

export type CurrencySelectOption = { code: string; label: string };

/** Options shown in calculator currency dropdowns (order matters). */
export const CALCULATOR_CURRENCY_OPTIONS: CurrencySelectOption[] = [
  { code: 'INR', label: '₹ INR — Indian rupee' },
  { code: 'USD', label: '$ USD — US dollar' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'GBP', label: '£ GBP — British pound' },
  { code: 'JPY', label: '¥ JPY — Japanese yen' },
  { code: 'AUD', label: 'A$ AUD — Australian dollar' },
  { code: 'CAD', label: 'C$ CAD — Canadian dollar' },
  { code: 'CHF', label: 'CHF — Swiss franc' },
  { code: 'SGD', label: 'S$ SGD — Singapore dollar' },
  { code: 'AED', label: 'AED — UAE dirham' },
  { code: 'SAR', label: 'SAR — Saudi riyal' },
  { code: 'CNY', label: '¥ CNY — Chinese yuan' },
  { code: 'HKD', label: 'HK$ HKD — Hong Kong dollar' },
  { code: 'NZD', label: 'NZ$ NZD — New Zealand dollar' },
  { code: 'KRW', label: '₩ KRW — South Korean won' },
  { code: 'THB', label: '฿ THB — Thai baht' },
  { code: 'MYR', label: 'RM MYR — Malaysian ringgit' },
  { code: 'PHP', label: '₱ PHP — Philippine peso' },
  { code: 'IDR', label: 'Rp IDR — Indonesian rupiah' },
  { code: 'BRL', label: 'R$ BRL — Brazilian real' },
  { code: 'MXN', label: 'MX$ MXN — Mexican peso' },
  { code: 'ZAR', label: 'R ZAR — South African rand' },
  { code: 'TRY', label: '₺ TRY — Turkish lira' },
  { code: 'PLN', label: 'zł PLN — Polish złoty' },
  { code: 'SEK', label: 'kr SEK — Swedish krona' },
  { code: 'NOK', label: 'kr NOK — Norwegian krone' },
  { code: 'DKK', label: 'kr DKK — Danish krone' },
  { code: 'ILS', label: '₪ ILS — Israeli shekel' },
  { code: 'PKR', label: '₨ PKR — Pakistani rupee' },
  { code: 'BDT', label: '৳ BDT — Bangladeshi taka' },
  { code: 'LKR', label: 'Rs LKR — Sri Lankan rupee' },
  { code: 'NPR', label: 'Rs NPR — Nepalese rupee' },
];

export function localeForCurrency(code: string): string {
  return LOCALE_BY_CURRENCY[code] || 'en-US';
}
