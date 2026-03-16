// eslint-disable-next-line import/no-extraneous-dependencies
import nock from 'nock';
export interface MockTrendingToken {
  assetId: string;
  name: string;
  symbol: string;
  decimals?: number;
  price?: string;
  priceChangePct?: {
    m5?: string;
    m15?: string;
    m30?: string;
    h1?: string;
    h6?: string;
    h24?: string;
  };
  aggregatedUsdVolume?: number;
  marketCap?: number;
}

export const mockTrendingTokensData: MockTrendingToken[] = [
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    price: '2000.00',
    priceChangePct: {
      h24: '5.2',
    },
    aggregatedUsdVolume: 15000000000,
    marketCap: 500000000000,
  },
  {
    assetId: 'eip155:1/erc20:0x1234567890123456789012345678901234567890',
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    price: '45000.00',
    priceChangePct: {
      h24: '-2.5',
    },
    aggregatedUsdVolume: 25000000000,
    marketCap: 800000000000,
  },
  {
    assetId: 'eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    name: 'Uniswap',
    symbol: 'UNI',
    decimals: 18,
    price: '8.50',
    priceChangePct: {
      h24: '12.8',
    },
    aggregatedUsdVolume: 500000000,
    marketCap: 5000000000,
  },
];

export const mockBnbChainToken: MockTrendingToken[] = [
  {
    assetId: 'eip155:56/erc20:0xBTC0000000000000000000000000000000000000',
    name: 'Bitcoin BNB',
    symbol: 'BTCB',
    decimals: 18,
    price: '44500.00',
    priceChangePct: {
      h24: '-1.8',
    },
  },
];

/**
 * Setup mock for the trending tokens API using nock.
 * Intercepts GET requests to the trending URL (any query params) and replies with the given data.
 * Optional customReply(uri) can return different data based on the request URL (e.g. for BNB-only requests).
 * Call in beforeEach: setupTrendingApiFetchMock(...) or await setupTrendingApiFetchMock(...)
 */
export function setupTrendingApiFetchMock(
  responseData: MockTrendingToken[] = mockTrendingTokensData,
  customReply?: (uri: string) => MockTrendingToken[],
): void {
  nock.cleanAll();
  nock.disableNetConnect();

  const replyBody =
    customReply !== undefined
      ? (uri: string) => customReply(uri)
      : () => responseData;

  nock('https://token.api.cx.metamask.io')
    .get('/v3/tokens/trending')
    .query(true)
    .reply(200, (uri) => replyBody(uri))
    .persist();
}

/**
 * Clear nock interceptors and Jest mocks.
 * Call this in afterEach of your tests.
 */
export function clearTrendingApiMocks(): void {
  jest.clearAllMocks();
  nock.cleanAll();
}
