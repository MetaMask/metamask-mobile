import { DEBOUNCE_WAIT, useTrendingRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

describe('useTrendingRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('returns an object with results, isLoading, error, and fetch function', () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    spyGetTrendingTokens.mockResolvedValue([]);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    expect(result.current).toHaveProperty('results');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('fetch');
    expect(typeof result.current.fetch).toBe('function');
    expect(Array.isArray(result.current.results)).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('returns trending tokens results when fetch succeeds', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
      {
        assetId: 'eip155:1/erc20:0x456',
        symbol: 'TOKEN2',
        name: 'Token 2',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
    ];
    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('sets isLoading to true during fetch', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    let resolvePromise: ((value: unknown[]) => void) | undefined;
    const pendingPromise = new Promise<unknown[]>((resolve) => {
      resolvePromise = resolve;
    });
    spyGetTrendingTokens.mockReturnValue(pendingPromise as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      if (resolvePromise) {
        resolvePromise([]);
      }
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('sets error state when fetch fails', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockError = new Error('Failed to fetch trending tokens');
    spyGetTrendingTokens.mockRejectedValue(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('allows manual retry after error using fetch function', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockError = new Error('Failed to fetch trending tokens');
    const mockResults: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
    ];

    spyGetTrendingTokens.mockRejectedValueOnce(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toEqual(mockError);

    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    await act(async () => {
      result.current.fetch();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('skips fetch when chain ids are empty', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    spyGetTrendingTokens.mockResolvedValue([]);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: [],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.fetch();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).not.toHaveBeenCalled();

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('coalesces multiple rapid calls into a single fetch', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    spyGetTrendingTokens.mockResolvedValue([]);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    spyGetTrendingTokens.mockClear();

    await act(async () => {
      result.current.fetch();
      result.current.fetch();
      result.current.fetch();

      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);
      expect(spyGetTrendingTokens).not.toHaveBeenCalled();

      jest.advanceTimersByTime(DEBOUNCE_WAIT + 200);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });
});
