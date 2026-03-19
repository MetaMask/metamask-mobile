import { renderHook, waitFor } from '@testing-library/react-native';
import { useTokenSecurityData } from './useTokenSecurityData';
import {
  fetchTokenAssets,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

jest.mock('@metamask/assets-controllers', () => ({
  fetchTokenAssets: jest.fn(),
}));

const mockFetchTokenAssets = jest.mocked(fetchTokenAssets);

const mockSecurityData: TokenSecurityData = {
  resultType: 'Verified',
  maliciousScore: '0',
  features: [
    {
      featureId: 'liquidity_pools',
      type: 'info',
      description: 'Has liquidity pools',
    },
  ],
  fees: {
    transfer: 0,
    transferFeeMaxAmount: null,
    buy: 0,
    sell: null,
  },
  financialStats: {
    supply: 1000000,
    topHolders: [],
    holdersCount: 100,
    tradeVolume24h: null,
    lockedLiquidityPct: null,
    markets: [],
  },
  metadata: {
    externalLinks: {
      homepage: null,
      twitterPage: null,
      telegramChannelId: null,
    },
  },
  created: '2023-01-01T00:00:00Z',
};

describe('useTokenSecurityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns prefetched data immediately without fetching', () => {
    const assetId = 'eip155:1/erc20:0x1234' as CaipAssetType;

    const { result } = renderHook(() =>
      useTokenSecurityData({
        assetId,
        prefetchedData: mockSecurityData,
      }),
    );

    expect(result.current.securityData).toBe(mockSecurityData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetchTokenAssets).not.toHaveBeenCalled();
  });

  it('fetches security data when assetId is provided', async () => {
    const assetId = 'eip155:1/erc20:0x1234' as CaipAssetType;
    mockFetchTokenAssets.mockResolvedValue([
      {
        assetId,
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        securityData: mockSecurityData,
      },
    ]);

    const { result } = renderHook(() => useTokenSecurityData({ assetId }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchTokenAssets).toHaveBeenCalledWith([assetId], {
      includeTokenSecurityData: true,
    });
    expect(result.current.securityData).toBe(mockSecurityData);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    const assetId = 'eip155:1/erc20:0x1234' as CaipAssetType;
    const mockError = new Error('Fetch failed');
    mockFetchTokenAssets.mockRejectedValue(mockError);

    const { result } = renderHook(() => useTokenSecurityData({ assetId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.securityData).toBeNull();
  });

  it('does not fetch when assetId is null', () => {
    const { result } = renderHook(() =>
      useTokenSecurityData({ assetId: null }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.securityData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockFetchTokenAssets).not.toHaveBeenCalled();
  });

  it('handles empty security data from API', async () => {
    const assetId = 'eip155:1/erc20:0x1234' as CaipAssetType;
    mockFetchTokenAssets.mockResolvedValue([
      {
        assetId,
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() => useTokenSecurityData({ assetId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.securityData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('refetches when assetId changes', async () => {
    const assetId1 = 'eip155:1/erc20:0x1111' as CaipAssetType;
    const assetId2 = 'eip155:1/erc20:0x2222' as CaipAssetType;

    mockFetchTokenAssets.mockResolvedValue([
      {
        assetId: assetId1,
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        securityData: mockSecurityData,
      },
    ]);

    const { result, rerender } = renderHook(
      ({ assetId }) => useTokenSecurityData({ assetId }),
      { initialProps: { assetId: assetId1 } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(1);
    expect(mockFetchTokenAssets).toHaveBeenCalledWith([assetId1], {
      includeTokenSecurityData: true,
    });

    rerender({ assetId: assetId2 });

    await waitFor(() => {
      expect(mockFetchTokenAssets).toHaveBeenCalledTimes(2);
    });

    expect(mockFetchTokenAssets).toHaveBeenCalledWith([assetId2], {
      includeTokenSecurityData: true,
    });
  });

  it('cleans up on unmount', async () => {
    const assetId = 'eip155:1/erc20:0x1234' as CaipAssetType;
    mockFetchTokenAssets.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve([
                {
                  assetId,
                  name: 'Test Token',
                  symbol: 'TEST',
                  decimals: 18,
                  securityData: mockSecurityData,
                },
              ]),
            100,
          );
        }),
    );

    const { unmount } = renderHook(() => useTokenSecurityData({ assetId }));

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it('stops loading when assetId changes to null', async () => {
    const testAssetId = 'eip155:1/erc20:0x1234' as CaipAssetType;
    mockFetchTokenAssets.mockResolvedValue([
      {
        assetId: testAssetId,
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        securityData: mockSecurityData,
      },
    ]);

    const { result, rerender } = renderHook(
      ({ assetId }: { assetId: CaipAssetType | null }) =>
        useTokenSecurityData({ assetId }),
      { initialProps: { assetId: testAssetId as CaipAssetType | null } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.securityData).toBe(mockSecurityData);

    rerender({ assetId: null as CaipAssetType | null });

    expect(result.current.isLoading).toBe(false);
    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(1);
  });
});
