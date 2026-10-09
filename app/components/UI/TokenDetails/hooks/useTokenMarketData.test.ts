import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { useTokenMarketData } from './useTokenMarketData';
import { tokenMarketDataKeys } from '../queries/tokenMarketData';
import { getAssetsPrice } from '../../../../selectors/assets/assets-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Stubbed rather than imported for real: loading the selector module pulls in
// AssetsController and its whole controller graph, which needs network
// fixtures this hook has no use for. Only the selectors' identities matter
// here, since `useSelector` is routed by reference below.
jest.mock('../../../../selectors/assets/assets-controller', () => ({
  getAssetsPrice: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockHandleFetch = jest.mocked(handleFetch);
const mockLoggerError = jest.mocked(Logger.error);

const ASSET_ID = 'eip155:1/erc20:0xabc' as CaipAssetType;

const buildPrice = (
  overrides: Partial<FungibleAssetPrice> = {},
): FungibleAssetPrice =>
  ({
    assetPriceType: 'fungible',
    price: 1,
    usdPrice: 1,
    lastUpdated: 0,
    marketCap: 12_400_000,
    ...overrides,
  }) as FungibleAssetPrice;

/**
 * A provider with retries off, so the failure case settles on the first
 * rejection instead of waiting out the app-wide `retry: 2`.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

/**
 * Routes each selector to a value by identity, so the hook's two Redux reads
 * can be varied independently without standing up a store.
 */
const mockState = (
  options: {
    assetsPrice?: Record<string, unknown>;
    currency?: string;
  } = {},
) => {
  const { assetsPrice = {} } = options;
  // Read with `in` rather than a default parameter, which would substitute
  // `usd` for an explicit `undefined` and make the pre-hydration case
  // untestable.
  const currency = 'currency' in options ? options.currency : 'usd';

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === getAssetsPrice) {
      return assetsPrice;
    }
    if (selector === selectCurrentCurrency) {
      return currency;
    }
    return undefined;
  });
};

const renderTokenMarketData = (assetId: CaipAssetType | null = ASSET_ID) => {
  const { Wrapper, queryClient } = createWrapper();
  return {
    queryClient,
    ...renderHook(() => useTokenMarketData(assetId), { wrapper: Wrapper }),
  };
};

describe('useTokenMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached market data without fetching', () => {
    const cached = buildPrice();
    mockState({ assetsPrice: { [ASSET_ID]: cached } });

    const { result } = renderTokenMarketData();

    expect(result.current.marketData).toBe(cached);
    expect(result.current.isLoading).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  // `assetsPrice` holds NFT entries under the same map, and those carry none of
  // the fields the stat bar reads.
  it('ignores a non-fungible price entry and fetches instead', async () => {
    mockState({
      assetsPrice: { [ASSET_ID]: { assetPriceType: 'nft', price: 1 } },
    });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { result } = renderTokenMarketData();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    expect(result.current.marketData?.marketCap).toBe(12_400_000);
  });

  it('fetches market data for a token that is not tracked', async () => {
    mockState();
    mockHandleFetch.mockResolvedValue({
      [ASSET_ID]: buildPrice({ totalVolume: 48_300_000 }),
    });

    const { result } = renderTokenMarketData();

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData?.totalVolume).toBe(48_300_000);
  });

  it('requests the selected currency in lower case', async () => {
    mockState({ currency: 'EUR' });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { result } = renderTokenMarketData();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = mockHandleFetch.mock.calls[0][0] as string;
    expect(url).toContain('vsCurrency=eur');
    expect(url).toContain('includeMarketData=true');
  });

  it('resolves to null when the API has no entry for the asset', async () => {
    mockState();
    mockHandleFetch.mockResolvedValue({});

    const { result } = renderTokenMarketData();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData).toBeNull();
  });

  it('stops loading and reports no data when the fetch fails', async () => {
    mockState();
    mockHandleFetch.mockRejectedValue(new Error('network down'));

    const { result } = renderTokenMarketData();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData).toBeNull();
  });

  // Reported once the query gives up rather than once per attempt, so a
  // failure that the retries recover from never reaches Sentry.
  it('reports a settled failure to the logger', async () => {
    mockState();
    mockHandleFetch.mockRejectedValue(new Error('network down'));

    renderTokenMarketData();

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalledTimes(1));
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'network down' }),
      'useTokenMarketData: spot-prices failed',
    );
  });

  it('does not fetch and does not load when there is no asset id', () => {
    mockState();

    const { result } = renderTokenMarketData(null);

    expect(result.current.marketData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  // The response is denominated in whatever `vsCurrency` asked for, so a
  // request sent before the currency is known would return figures that cannot
  // be labelled. Reachable on a first render, before the controller hydrates.
  it('waits for the selected currency before fetching', () => {
    mockState({ currency: undefined });

    const { result } = renderTokenMarketData();

    expect(result.current.marketData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  // Two consumers of the same asset used to mean two requests, because each
  // hook owned its own fetch. The stat bar and the overview tab can both be
  // mounted for one token, so the sharing is the point of the query cache.
  it('serves concurrent consumers of the same asset from one request', async () => {
    mockState();
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => ({
        first: useTokenMarketData(ASSET_ID),
        second: useTokenMarketData(ASSET_ID),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.first.isLoading).toBe(false));
    expect(result.current.second.marketData?.marketCap).toBe(12_400_000);
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
  });

  // The key shape is what a list screen prefetches against, so it is asserted
  // rather than left as an implementation detail of the hook.
  it('caches the response under the asset and currency key', async () => {
    mockState({ currency: 'GBP' });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { result, queryClient } = renderTokenMarketData();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      queryClient.getQueryData(tokenMarketDataKeys.byAsset(ASSET_ID, 'gbp')),
    ).toEqual(expect.objectContaining({ marketCap: 12_400_000 }));
  });

  it('refetches when the selected currency changes', async () => {
    mockState({ currency: 'usd' });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { Wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      () => useTokenMarketData(ASSET_ID),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);

    mockState({ currency: 'gbp' });
    rerender({});

    await waitFor(() => expect(mockHandleFetch).toHaveBeenCalledTimes(2));
    expect(mockHandleFetch.mock.calls[1][0]).toContain('vsCurrency=gbp');
  });
});
