/**
 * Trending tokens API mock for component view tests.
 * Intercepts:
 * - GET https://token.api.cx.metamask.io/v3/tokens/trending (trending list)
 * - GET https://token.api.cx.metamask.io/tokens/search (token search from useSearchRequest)
 *
 * Search must be mocked when net connect is disabled; otherwise searchTokens can stall
 * until fetch timeout while useTrendingSearch stays loading, and short waitFor timeouts flake.
 *
 * Use in beforeEach/afterEach of TrendingView.view.test.tsx (or any view that
 * loads trending data). See tests/component-view/api-mocking/ and references/navigation-mocking.md for adding other API mocks.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';

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

const TRENDING_ORIGIN = 'https://token.api.cx.metamask.io';
const TRENDING_PATH = '/v3/tokens/trending';
const TOKEN_SEARCH_PATH = '/tokens/search';

/**
 * Sets up the nock mock for the trending tokens API.
 * Intercepts GET requests to the trending URL (any query params) and replies with the given data.
 * Optional customReply(uri) can return different data based on the request URL (e.g. for BNB-only requests).
 * Call in beforeEach: setupTrendingApiFetchMock(...)
 */
export function setupTrendingApiFetchMock(
  responseData: MockTrendingToken[] = mockTrendingTokensData,
  customReply?: (uri: string) => MockTrendingToken[],
): void {
  clearAllNockMocks();
  disableNetConnect();

  const replyBody =
    customReply === undefined
      ? () => responseData
      : (uri: string) => customReply(uri);

  nock(TRENDING_ORIGIN)
    .get(TRENDING_PATH)
    .query(true)
    .reply(200, (uri: string) => replyBody(uri))
    .persist();

  nock(TRENDING_ORIGIN)
    .get(TOKEN_SEARCH_PATH)
    .query(true)
    .reply(200, { count: 0, data: [] })
    .persist();
}

/**
 * Clears nock interceptors and Jest mocks for trending tests.
 * Call in afterEach of your tests.
 */
export function clearTrendingApiMocks(): void {
  jest.clearAllMocks();
  clearAllNockMocks();
}
