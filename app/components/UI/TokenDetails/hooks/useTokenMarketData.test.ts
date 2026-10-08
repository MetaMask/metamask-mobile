import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { useTokenMarketData } from './useTokenMarketData';
import { getAssetsPrice } from '../../../../selectors/assets/assets-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

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
 * Routes each selector to a value by identity, so the hook's two Redux reads
 * can be varied independently without standing up a store.
 */
const mockState = ({
  assetsPrice = {},
  currency = 'usd',
}: {
  assetsPrice?: Record<string, unknown>;
  currency?: string;
} = {}) => {
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

describe('useTokenMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached market data without fetching', () => {
    const cached = buildPrice();
    mockState({ assetsPrice: { [ASSET_ID]: cached } });

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));

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

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    expect(result.current.marketData?.marketCap).toBe(12_400_000);
  });

  it('fetches market data for a token that is not tracked', async () => {
    mockState();
    mockHandleFetch.mockResolvedValue({
      [ASSET_ID]: buildPrice({ totalVolume: 48_300_000 }),
    });

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData?.totalVolume).toBe(48_300_000);
  });

  it('requests the selected currency in lower case', async () => {
    mockState({ currency: 'EUR' });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = mockHandleFetch.mock.calls[0][0] as string;
    expect(url).toContain('vsCurrency=eur');
    expect(url).toContain('includeMarketData=true');
  });

  it('resolves to null when the API has no entry for the asset', async () => {
    mockState();
    mockHandleFetch.mockResolvedValue({});

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData).toBeNull();
  });

  it('stops loading and reports no data when the fetch fails', async () => {
    mockState();
    mockHandleFetch.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useTokenMarketData(ASSET_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.marketData).toBeNull();
  });

  it('does not fetch and does not load when there is no asset id', () => {
    mockState();

    const { result } = renderHook(() => useTokenMarketData(null));

    expect(result.current.marketData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockHandleFetch).not.toHaveBeenCalled();
  });

  // The response can land after the screen is gone. Without the mounted guard
  // this would warn about updating an unmounted component.
  it('discards a response that arrives after unmount', async () => {
    mockState();
    let resolveFetch: (value: unknown) => void = () => undefined;
    mockHandleFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderHook(() => useTokenMarketData(ASSET_ID));
    unmount();
    resolveFetch({ [ASSET_ID]: buildPrice() });

    await expect(
      Promise.resolve(mockHandleFetch.mock.results[0].value),
    ).resolves.toBeDefined();
  });

  it('refetches when the selected currency changes', async () => {
    mockState({ currency: 'usd' });
    mockHandleFetch.mockResolvedValue({ [ASSET_ID]: buildPrice() });

    const { result, rerender } = renderHook(() => useTokenMarketData(ASSET_ID));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);

    mockState({ currency: 'gbp' });
    rerender({});

    await waitFor(() => expect(mockHandleFetch).toHaveBeenCalledTimes(2));
    expect(mockHandleFetch.mock.calls[1][0]).toContain('vsCurrency=gbp');
  });
});
