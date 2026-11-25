import type { PriceExchangeRatesV1Response } from '../../api-response-types';

/**
 * Kept in sync with the live API by `yarn test:e2e:sync-api-mocks` (see
 * `api-mock-catalog.md`). The sync adds and removes fields and keeps the
 * values below, which tests assert on.
 */
export const PRICE_EXCHANGE_RATES_V1 = {
  usd: {
    name: 'US Dollar',
    ticker: 'usd',
    value: 1,
    currencyType: 'fiat',
  },
  eth: {
    name: 'Ether',
    ticker: 'eth',
    value: 0.000233,
    currencyType: 'crypto',
  },
  matic: {
    name: 'Matic',
    ticker: 'matic',
    value: 0.000344,
    currencyType: 'crypto',
  },
  btc: {
    name: 'Bitcoin',
    ticker: 'btc',
    value: 0.000008333,
    currencyType: 'crypto',
  },
  eur: { name: 'Euro', ticker: 'eur', value: 0.85, currencyType: 'fiat' },
  gbp: {
    name: 'British Pound Sterling',
    ticker: 'gbp',
    value: 0.73,
    currencyType: 'fiat',
  },
  jpy: {
    name: 'Japanese Yen',
    ticker: 'jpy',
    value: 110,
    currencyType: 'fiat',
  },
} satisfies PriceExchangeRatesV1Response;
