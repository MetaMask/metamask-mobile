/**
 * Watchlist API mock for component view tests.
 * Intercepts GET https://token.api.cx.metamask.io/assets?...
 * and AuthenticatedUserStorageService watchlist storage actions.
 *
 * Call setupTrendingApiFetchMock before setupWatchlistTokenApiMock when search
 * tests also need trending/search endpoints (trending setup clears nock first).
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock, { type Scope } from 'nock';
import {
  EMPTY_BLOB,
  type WatchlistBlob,
} from '../../../app/components/UI/Assets/watchlist/storage';
import { TOKEN_API_BASE_URL } from '../../../app/components/UI/Assets/watchlist/utils/getTokens';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';
import {
  mockRwaTokensData,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
  type MockTrendingToken,
} from './trending';
import Engine from '../../../app/core/Engine';

const GET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:getAssetsWatchlist' as const;
const SET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:setAssetsWatchlist' as const;
const CLIENT_TYPE = 'mobile' as const;

export const mockWatchlistAssetIds = [
  'eip155:1/slip44:60',
  'eip155:1/erc20:0x1f9840a85d8aBE325823995344D8762464388D4',
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
] as const;

export const mockWatchlistTokensResponse = [
  {
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    marketData: {
      price: '2500.00',
      pricePercentChange1d: '2.50',
      marketCap: 300_000_000_000,
      totalVolume: 10_000_000_000,
    },
  },
  {
    assetId: 'eip155:1/erc20:0x1f9840a85d8aBE325823995344D8762464388D4',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    marketData: {
      price: '8.50',
      pricePercentChange1d: '-3.25',
      marketCap: 5_000_000_000,
      totalVolume: 200_000_000,
    },
  },
  {
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    marketData: {
      price: '1.00',
      pricePercentChange1d: '0.01',
      marketCap: 30_000_000_000,
      totalVolume: 5_000_000_000,
    },
  },
];

export const defaultWatchlistBlob: WatchlistBlob = {
  assets: [...mockWatchlistAssetIds],
  version: 1,
};

export interface WatchlistStoragePutScope {
  isDone: () => boolean;
}

let storageSpy: jest.SpyInstance | undefined;
let inMemoryBlob: WatchlistBlob = EMPTY_BLOB;
let storagePutCount = 0;

const filterWatchlistResponse = (
  assetIdsParam: string | string[] | undefined,
  response: typeof mockWatchlistTokensResponse,
) => {
  if (!assetIdsParam) {
    return response;
  }

  const requestedIds = String(assetIdsParam)
    .split(',')
    .map((id) => id.toLowerCase());

  return response.filter((token) =>
    requestedIds.includes(token.assetId.toLowerCase()),
  );
};

/**
 * Registers a persistent nock interceptor for GET /assets on the Token API.
 * Does not clear existing nock interceptors — call setupTrendingApiFetchMock
 * first when combining with trending/search mocks.
 */
export function setupWatchlistTokenApiMock(
  tokens: typeof mockWatchlistTokensResponse = mockWatchlistTokensResponse,
): Scope {
  disableNetConnect();

  return nock(TOKEN_API_BASE_URL)
    .get('/assets')
    .query(true)
    .reply(200, (uri: string) => {
      const url = new URL(uri, TOKEN_API_BASE_URL);
      const assetIds = url.searchParams.get('assetIds') ?? undefined;
      return filterWatchlistResponse(assetIds, tokens);
    })
    .persist();
}

/**
 * Prevents unhandled NetConnectNotAllowedError from ReadOnlyNetworkStore when
 * Token Details navigation leaves async fixture-state fetches in flight.
 */
export function setupReadOnlyNetworkStoreMock(): void {
  const fixtureHosts = ['localhost', 'bs-local.com', '10.0.2.2'];
  const fixturePort = 12345;

  fixtureHosts.forEach((host) => {
    nock(`http://${host}:${fixturePort}`)
      .get('/state.json')
      .reply(200, {})
      .persist();
  });
}

/**
 * Re-registers HTTP mocks for watchlist search tests with specific search results.
 * Clears existing nock interceptors first so only one `/tokens/search` handler is
 * active (avoids stacking on top of setupTrendingApiFetchMock's empty search mock).
 */
export function setupWatchlistSearchApiMock(
  results: MockTrendingToken[],
): void {
  clearAllNockMocks();
  disableNetConnect();
  setupTrendingApiFetchMock(
    mockTrendingTokensData,
    undefined,
    mockRwaTokensData,
    results,
  );
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
}

/**
 * Spies on Engine.controllerMessenger.call for watchlist storage read/write.
 * Maintains an in-memory blob that updates on setAssetsWatchlist calls.
 */
export function setupWatchlistStorageMock(
  initialBlob: WatchlistBlob = defaultWatchlistBlob,
): void {
  inMemoryBlob = initialBlob;
  storagePutCount = 0;

  const originalCall = Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
  );

  clearWatchlistStorageMock();

  storageSpy = jest
    .spyOn(Engine.controllerMessenger, 'call')
    .mockImplementation((...messengerArgs) => {
      const [action, ...rest] = messengerArgs as [string, ...unknown[]];

      if (action === GET_ASSETS_WATCHLIST_ACTION) {
        return Promise.resolve(inMemoryBlob) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      if (action === SET_ASSETS_WATCHLIST_ACTION) {
        const [blob] = rest as [WatchlistBlob];
        inMemoryBlob = blob;
        storagePutCount += 1;
        return Promise.resolve(undefined) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      const passthroughArgs = messengerArgs as Parameters<
        typeof Engine.controllerMessenger.call
      >;
      return Reflect.apply(
        originalCall,
        Engine.controllerMessenger,
        passthroughArgs,
      ) as ReturnType<typeof Engine.controllerMessenger.call>;
    });
}

/**
 * Returns a scope that becomes done after the next setAssetsWatchlist call.
 * Use inside individual tests that mutate the watchlist (unwatch, add, etc.).
 */
export function setupWatchlistStoragePutMock(): WatchlistStoragePutScope {
  const callsBefore = storagePutCount;
  return {
    isDone: () => storagePutCount > callsBefore,
  };
}

export function getWatchlistStorageBlob(): WatchlistBlob {
  return inMemoryBlob;
}

export function clearWatchlistStorageMock(): void {
  if (storageSpy) {
    storageSpy.mockRestore();
    storageSpy = undefined;
  }
}

/**
 * Clears watchlist storage spy and all nock interceptors.
 */
export function clearWatchlistApiMocks(): void {
  clearWatchlistStorageMock();
  jest.clearAllMocks();
  clearAllNockMocks();
}
