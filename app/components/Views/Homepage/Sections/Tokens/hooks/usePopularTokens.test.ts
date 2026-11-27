import { act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { onlineManager } from '@tanstack/react-query';
import { renderHookWithQueryClient } from '../../../../../../util/test/renderHookWithQueryClient';
import { getNetworkTierSnapshot } from '../../../../../../util/deviceCapability';
import { usePopularTokens } from './usePopularTokens';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMoneyHubEnabledFlag } from '../../../../../UI/Money/selectors/featureFlags';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
  getNetworkTierSnapshot: jest.fn(() => 'WIFI'),
}));

jest.mock('../../../../../../util/deviceCapability/latencyStore', () => ({
  getLatencySnapshot: () => null,
  getLatencyThresholds: () => ({ hungMs: 8000 }),
}));

// Mock the selector to avoid deep import chain issues
jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

// Mock musd constants to avoid deep import chain issues
jest.mock('../../../../../UI/Earn/constants/musd', () => ({
  MUSD_TOKEN_ADDRESS: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  isMusdToken: (address?: string) =>
    address?.toLowerCase() === '0xaca92e438df0b2401ff60da7e4337b687a2435da',
}));

jest.mock('../../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHubEnabledFlag: jest.fn(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const originalFetch = global.fetch;
const mockFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const pricesResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

const arrangeSelectors = ({
  isMoneyHubEnabled = false,
  currency = 'usd',
}: { isMoneyHubEnabled?: boolean; currency?: string } = {}) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectCurrentCurrency) {
      return currency;
    }
    if (selector === selectMoneyHubEnabledFlag) {
      return isMoneyHubEnabled;
    }
    return undefined;
  });
};

describe('usePopularTokens', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    jest.clearAllMocks();
    arrangeSelectors();
    jest.mocked(getNetworkTierSnapshot).mockReturnValue('WIFI');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns isInitialLoading true on first fetch', () => {
    mockFetch.mockImplementation(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        }),
    );

    const { result, unmount } = renderHookWithQueryClient(usePopularTokens);

    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.tokens).toEqual([]);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it('fetches prices and returns tokens with price data', async () => {
    const mockPrices = {
      'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': {
        price: 1.0,
        pricePercentChange1d: 0.05,
      },
      'eip155:1/slip44:60': {
        price: 3000.0,
        pricePercentChange1d: 2.5,
      },
    };

    mockFetch.mockResolvedValue(pricesResponse(mockPrices));

    const { result } = renderHookWithQueryClient(usePopularTokens);

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.tokens).toHaveLength(5);
    expect(result.current.tokens[0].name).toBe('MetaMask USD');
    expect(result.current.tokens[0].price).toBe(1.0);
    expect(result.current.tokens[0].priceChange1d).toBe(0.05);
    expect(result.current.tokens[1].name).toBe('Ethereum');
    expect(result.current.tokens[1].price).toBe(3000.0);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));

    const { result } = renderHookWithQueryClient(usePopularTokens);

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.error).toMatchObject({ status: 404 });
    // Still returns tokens without prices
    expect(result.current.tokens).toHaveLength(5);
    expect(result.current.tokens[0].price).toBeUndefined();
    expect(result.current.tokens[0].priceChange1d).toBeUndefined();
  });

  it('sets isRefreshing true on subsequent fetches', async () => {
    let resolveRefetch: () => void = () => undefined;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolveRefetch = () => resolve(pricesResponse({}));
    });

    mockFetch
      .mockResolvedValueOnce(pricesResponse({}))
      .mockReturnValueOnce(pendingPromise);

    const { result } = renderHookWithQueryClient(usePopularTokens);

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    act(() => {
      void result.current.refetch();
    });

    // Check refreshing state while fetch is pending
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });
    expect(result.current.isInitialLoading).toBe(false);

    // Resolve the refetch
    await act(async () => {
      resolveRefetch();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('calls price API with correct parameters', async () => {
    mockFetch.mockResolvedValue(pricesResponse({}));

    renderHookWithQueryClient(usePopularTokens);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain(
      'https://price.api.cx.metamask.io/v3/spot-prices',
    );
    expect(fetchUrl).toContain('includeMarketData=true');
    expect(fetchUrl).toContain('vsCurrency=usd');
    expect(fetchUrl).toContain('assetIds=');
    expect(fetchUrl).toContain(
      'eip155%3A1%2Ferc20%3A0xaca92e438df0b2401ff60da7e4337b687a2435da',
    );
    expect(fetchUrl).toContain('eip155%3A1%2Fslip44%3A60');
  });

  it('refetch function triggers new fetch', async () => {
    mockFetch.mockResolvedValue(pricesResponse({}));

    const { result } = renderHookWithQueryClient(usePopularTokens);

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['WIFI', 4],
    ['SLOW_CELLULAR', 2],
  ] as const)(
    'on %s, makes %i price requests in three minutes',
    async (tier, requests) => {
      jest.useFakeTimers();
      try {
        jest.mocked(getNetworkTierSnapshot).mockReturnValue(tier);
        mockFetch.mockImplementation(async () => pricesResponse({}));
        const { result, unmount } = renderHookWithQueryClient(usePopularTokens);
        await waitFor(() =>
          expect(result.current.isInitialLoading).toBe(false),
        );

        for (let minute = 0; minute < 3; minute += 1) {
          await act(async () => {
            await jest.advanceTimersByTimeAsync(60_000);
          });
        }

        expect(mockFetch).toHaveBeenCalledTimes(requests);
        unmount();

        await act(async () => {
          await jest.advanceTimersByTimeAsync(180_000);
        });
        expect(mockFetch).toHaveBeenCalledTimes(requests);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it('excludes mUSD from tokens when the Money hub is enabled', async () => {
    mockFetch.mockResolvedValue(pricesResponse({}));
    arrangeSelectors({ isMoneyHubEnabled: true });

    const { result } = renderHookWithQueryClient(usePopularTokens);

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.tokens).toHaveLength(4);
    expect(
      result.current.tokens.find((t) => t.symbol === 'mUSD'),
    ).toBeUndefined();
    expect(result.current.tokens[0].name).toBe('Ethereum');
  });

  it('keeps the last prices when a refresh fails', async () => {
    mockFetch
      .mockResolvedValueOnce(
        pricesResponse({ 'eip155:1/slip44:60': { price: 3000 } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const { result } = renderHookWithQueryClient(usePopularTokens);
    await waitFor(() => expect(result.current.tokens[1]?.price).toBe(3000));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.error).toMatchObject({ status: 404 }),
    );
    expect(result.current.tokens[1]?.price).toBe(3000);
  });

  it('finishes manual refresh without making a request while offline', async () => {
    onlineManager.setOnline(false);
    const { result, unmount } = renderHookWithQueryClient(usePopularTokens);
    try {
      await result.current.refetch();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    } finally {
      unmount();
      onlineManager.setOnline(true);
    }
  });

  it('shares an in-flight request with pull-to-refresh', async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { result } = renderHookWithQueryClient(usePopularTokens);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      const refresh = result.current.refetch();
      resolveRequest(pricesResponse({ 'eip155:1/slip44:60': { price: 3000 } }));
      await refresh;
    });

    await waitFor(() => expect(result.current.tokens[1]?.price).toBe(3000));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not show a late USD response as EUR after a fiat currency change', async () => {
    let resolveUsd: (response: Response) => void = () => undefined;
    mockFetch
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUsd = resolve;
        }),
      )
      .mockResolvedValueOnce(
        pricesResponse({ 'eip155:1/slip44:60': { price: 2600 } }),
      );
    const { result, rerender } = renderHookWithQueryClient(usePopularTokens);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    arrangeSelectors({ currency: 'EUR' });
    rerender(undefined);
    await waitFor(() => expect(result.current.tokens[1]?.price).toBe(2600));
    await act(async () => {
      resolveUsd(pricesResponse({ 'eip155:1/slip44:60': { price: 3000 } }));
    });

    expect(mockFetch.mock.calls[1]?.[0]).toContain('vsCurrency=eur');
    expect(result.current.tokens[1]?.price).toBe(2600);
  });
});
