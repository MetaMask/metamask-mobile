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
      urlEndpoint:
        /https:\/\/portfolio\.api\.cx\.metamask\.io\/explore\/sites.*/,
      responseCode: 200,
      response: {
        dapps: [
          {
            id: '1',
            name: 'Uniswap',
            website: 'https://uniswap.org',
            logoSrc: 'https://uniswap.org/favicon.ico',
            featured: true,
            categories: ['DeFi'],
            networks: ['1'],
          },
        ],
      },
      priority: 1000,
    },
    {
      urlEndpoint: /https:\/\/gamma-api\.polymarket\.com\/events\/pagination.*/,
      responseCode: 200,
      response: {
        data: [
          {
            id: '1',
            title: 'Will Bitcoin hit $100k?',
            slug: 'bitcoin-100k',
            icon: 'https://polymarket.com/icon.png',
            description: 'Bitcoin price prediction',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
            markets: [
              {
                conditionId: '123',
                question: 'Will Bitcoin hit $100k?',
                status: 'open',
                outcomes: '["Yes", "No"]',
                outcomePrices: '["0.6", "0.4"]',
                clobTokenIds: '["1", "2"]',
                volumeNum: 1000000,
                liquidity: 500000,
                orderPriceMinTickSize: 0.01,
                active: true,
                closed: false,
                sportsMarketType: 'moneyline',
                groupItemTitle: 'Bitcoin',
              },
            ],
            tags: [{ label: 'Crypto', slug: 'crypto' }],
            volume: 1000000,
            liquidity: 500000,
          },
        ],
      },
      priority: 1000,
    },
    {
      urlEndpoint: /\/exchange.*/, // Hyperliquid
      responseCode: 200,
      response: [
        {
          universe: [
            { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
            { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
          ],
        },
        [
          {
            funding: '0.0001',
            openInterest: '1000',
            prevDayPx: '49000',
            dayNtlVlm: '1000000',
            markPx: '50000',
            midPx: '50000',
            oraclePx: '50000',
          },
          {
            funding: '0.0001',
            openInterest: '500',
            prevDayPx: '2900',
            dayNtlVlm: '500000',
            markPx: '3000',
            midPx: '3000',
            oraclePx: '3000',
          },
        ],
      ],
      priority: 1000,
    },
    {
      urlEndpoint: /\/tokens\/search.*/,
      responseCode: 200,
      response: [], // Empty search results by default
      priority: 1000,
    },
    {
      urlEndpoint: /https:\/\/dapp-scanning\.api\.cx\.metamask\.io\/v2\/scan.*/,
      responseCode: 200,
      response: {
        recommendedAction: 'NONE',
      },
      priority: 1000,
    },
  ],
  POST: [
    {
      urlEndpoint: /\/exchange.*/, // Hyperliquid
      responseCode: 200,
      response: [
        {
          universe: [
            { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
            { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
          ],
        },
        [
          {
            funding: '0.0001',
            openInterest: '1000',
            prevDayPx: '49000',
            dayNtlVlm: '1000000',
            markPx: '50000',
            midPx: '50000',
            oraclePx: '50000',
          },
          {
            funding: '0.0001',
            openInterest: '500',
            prevDayPx: '2900',
            dayNtlVlm: '500000',
            markPx: '3000',
            midPx: '3000',
            oraclePx: '3000',
          },
        ],
      ],
      priority: 1000,
    },
  ],
};
