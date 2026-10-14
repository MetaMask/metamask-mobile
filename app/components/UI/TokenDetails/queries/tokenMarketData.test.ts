import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';
import {
  tokenMarketDataKeys,
  tokenMarketDataOptions,
  TOKEN_MARKET_DATA_STALE_TIME_MS,
} from './tokenMarketData';

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

const mockHandleFetch = jest.mocked(handleFetch);

const ASSET_ID = 'eip155:1/erc20:0xabc' as CaipAssetType;

/**
 * Invokes the `queryFn` the way React Query would, without a client. The
 * context argument is unused here, so it is stubbed rather than built.
 */
const runQueryFn = (assetId: CaipAssetType | null, currency?: string) => {
  const { queryFn } = tokenMarketDataOptions(assetId, currency);
  if (!queryFn) {
    throw new Error('queryFn should be defined');
  }
  return queryFn({} as never);
};

describe('tokenMarketDataKeys', () => {
  it('returns the base key for all market data queries', () => {
    expect(tokenMarketDataKeys.all()).toEqual(['tokenDetails', 'marketData']);
  });

  it('keys an entry by asset and currency', () => {
    expect(tokenMarketDataKeys.byAsset(ASSET_ID, 'usd')).toEqual([
      'tokenDetails',
      'marketData',
      ASSET_ID,
      'usd',
    ]);
  });

  // The request lower-cases the currency, so the key has to as well or the
  // same figures get fetched once per spelling.
  it('normalises the currency so one asset has one entry per currency', () => {
    expect(tokenMarketDataKeys.byAsset(ASSET_ID, 'EUR')).toEqual(
      tokenMarketDataKeys.byAsset(ASSET_ID, 'eur'),
    );
  });

  it('stays computable before the asset and currency are known', () => {
    expect(tokenMarketDataKeys.byAsset(null, undefined)).toEqual([
      'tokenDetails',
      'marketData',
      null,
      undefined,
    ]);
  });
});

describe('tokenMarketDataOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the keyed options a prefetch would reuse', () => {
    const options = tokenMarketDataOptions(ASSET_ID, 'usd');

    expect(options.queryKey).toEqual([
      'tokenDetails',
      'marketData',
      ASSET_ID,
      'usd',
    ]);
    expect(options.staleTime).toBe(TOKEN_MARKET_DATA_STALE_TIME_MS);
  });

  it('requests the asset in the selected currency with market data', async () => {
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: { marketCap: 1 } });

    await runQueryFn(ASSET_ID, 'EUR');

    const url = mockHandleFetch.mock.calls[0][0] as string;
    expect(url).toContain('price.api.cx.metamask.io/v3/spot-prices');
    expect(url).toContain(`assetIds=${encodeURIComponent(ASSET_ID)}`);
    expect(url).toContain('includeMarketData=true');
    expect(url).toContain('vsCurrency=eur');
  });

  // The endpoint answers with a map keyed by asset, so a token it knows
  // nothing about comes back as an empty object rather than an error.
  it('unwraps the asset entry from the response', async () => {
    mockHandleFetch.mockResolvedValue({
      [ASSET_ID]: { marketCap: 12_400_000 },
    });

    await expect(runQueryFn(ASSET_ID, 'usd')).resolves.toEqual({
      marketCap: 12_400_000,
    });
  });

  it('resolves to null when the response has no entry for the asset', async () => {
    mockHandleFetch.mockResolvedValue({});

    await expect(runQueryFn(ASSET_ID, 'usd')).resolves.toBeNull();
  });

  // Both are gated by `enabled` at the call site, so these are the belt to
  // that brace: a prefetch ignores `enabled` entirely and would otherwise
  // send a request with a missing parameter.
  it.each([
    ['asset', null, 'usd'],
    ['currency', ASSET_ID, undefined],
  ] as const)(
    'sends no request without the %s',
    async (_missing, assetId, currency) => {
      await expect(runQueryFn(assetId, currency)).resolves.toBeNull();
      expect(mockHandleFetch).not.toHaveBeenCalled();
    },
  );
});
