import { MockEventsObject } from '../../framework';

const TRENDING_TOKENS_RESPONSE = [
  {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    price: '1.00',
    aggregatedUsdVolume: 1000000,
    marketCap: 1000000000,
    priceChangePct: {
      h24: '0.01',
    },
  },
];

export const TRENDING_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: /\/v3\/tokens\/trending.*/,
      responseCode: 200,
      response: TRENDING_TOKENS_RESPONSE,
      priority: 1000,
    },
    {
      urlEndpoint: /\/exchange.*/, // Hyperliquid
      responseCode: 200,
      response: [],
      priority: 1000,
    },
    {
      urlEndpoint: /\/tokens\/search.*/,
      responseCode: 200,
      response: [], // Empty search results by default
      priority: 1000,
    },
  ],
};
