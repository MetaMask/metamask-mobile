import type { SupportedCurrency } from '@metamask/core-backend';

/**
 * Quote currencies accepted by Accounts API v6 `vsCurrency`.
 * Mirrors `SupportedCurrency` in `@metamask/core-backend` 12.3.0.
 * `V6VsCurrency` is a string superset; anything outside this set is requested
 * as USD and converted with CurrencyRateController.
 */
const SUPPORTED_VS_CURRENCIES: readonly SupportedCurrency[] = [
  'btc',
  'eth',
  'ltc',
  'bch',
  'bnb',
  'eos',
  'xrp',
  'xlm',
  'link',
  'dot',
  'yfi',
  'usd',
  'aed',
  'ars',
  'aud',
  'bdt',
  'bhd',
  'bmd',
  'brl',
  'cad',
  'chf',
  'clp',
  'cny',
  'czk',
  'dkk',
  'eur',
  'gbp',
  'gel',
  'hkd',
  'huf',
  'idr',
  'ils',
  'inr',
  'jpy',
  'krw',
  'kwd',
  'lkr',
  'mmk',
  'mxn',
  'myr',
  'ngn',
  'nok',
  'nzd',
  'php',
  'pkr',
  'pln',
  'rub',
  'sar',
  'sek',
  'sgd',
  'thb',
  'try',
  'twd',
  'uah',
  'vef',
  'vnd',
  'zar',
];

const SUPPORTED_VS_CURRENCY_SET = new Set<string>(SUPPORTED_VS_CURRENCIES);

export const isSupportedVsCurrency = (
  currency: string,
): currency is SupportedCurrency =>
  SUPPORTED_VS_CURRENCY_SET.has(currency.toLowerCase());

export interface OwnedTokenQuoteCurrency {
  vsCurrency: string;
  needsUsdConversion: boolean;
}

export const resolveOwnedTokenQuoteCurrency = (
  selectedCurrency: string | undefined,
): OwnedTokenQuoteCurrency => {
  const normalized = (selectedCurrency ?? 'usd').toLowerCase();
  if (isSupportedVsCurrency(normalized)) {
    return { vsCurrency: normalized, needsUsdConversion: false };
  }
  return { vsCurrency: 'usd', needsUsdConversion: true };
};
