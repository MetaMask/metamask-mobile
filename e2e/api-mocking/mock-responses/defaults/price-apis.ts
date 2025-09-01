import { MockEventsObject } from '../../../framework';

/**
 * Mock data for cryptocurrency price API endpoints used in E2E testing.
 * Returns stable price data to ensure consistent balance displays.
 * Uses round numbers to make test assertions predictable.
 */
export const PRICE_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/min-api\.cryptocompare\.com\/data\/pricemulti\?.*$/,
      responseCode: 200,
      response: {
        BTC: { USD: 120000 },
        ETH: { USD: 5000 },
        SOL: { USD: 200 },
        MATIC: { USD: 1 },
        AVAX: { USD: 25 },
        BNB: { USD: 300 },
        USD: { USD: 1 },
      },
    },
    {
      urlEndpoint:
        /^https:\/\/price\.api\.cx\.metamask\.io\/v2\/chains\/\d+\/spot-prices\?.*$/,
      responseCode: 200,
      response: {
        '0x0000000000000000000000000000000000000000': {
          id: 'ethereum',
          price: 1.0,
          marketCap: 120000000,
          allTimeHigh: 1.1,
          allTimeLow: 0.1,
          totalVolume: 9000000,
          high1d: 1.05,
          low1d: 0.95,
          circulatingSupply: 120000000,
          dilutedMarketCap: 120000000,
          marketCapPercentChange1d: 0,
          priceChange1d: 0,
          pricePercentChange1h: 0,
          pricePercentChange1d: 0,
          pricePercentChange7d: 0,
          pricePercentChange14d: 0,
          pricePercentChange30d: 0,
          pricePercentChange200d: 0,
          pricePercentChange1y: 0,
        },
      },
    },
  ],
};
