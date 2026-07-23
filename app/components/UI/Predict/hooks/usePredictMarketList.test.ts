import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictMarketList } from './usePredictMarketList';
import { createChildPage, createPage } from '../testUtils/marketList';

const mockListMarkets = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      listMarkets: (...args: unknown[]) => mockListMarkets(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

// The ranking/filtering of getVisiblePredictMarkets is covered by its own unit
// tests; here we make it an identity so we can assert the hook's flatten +
// cross-page dedupe behaviour deterministically.
jest.mock('../utils/marketStaleness', () => ({
  getVisiblePredictMarkets: (markets: unknown) => markets,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper };
};

describe('usePredictMarketList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMarkets.mockResolvedValue(createPage([]));
  });

  it('fetches markets on mount and exposes them', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockResolvedValueOnce(createPage(['a', 'b']));

    const { result } = renderHook(
      () => usePredictMarketList({ order: 'volume24hr' }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets.map((m) => m.id)).toEqual(['a', 'b']);
    expect(result.current.error).toBeNull();
    expect(result.current.hasNextPage).toBe(false);
    expect(mockListMarkets).toHaveBeenCalledWith({
      order: 'volume24hr',
      afterCursor: null,
    });
  });

  it('returns an empty list and no next page for an empty response', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockResolvedValueOnce(createPage([]));

    const { result } = renderHook(() => usePredictMarketList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('does not fetch when disabled', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePredictMarketList({}, { enabled: false }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListMarkets).not.toHaveBeenCalled();
    expect(result.current.markets).toEqual([]);
    // A disabled query must not report loading, otherwise a feature-gated
    // section would show a permanent skeleton (React Query v4 footgun).
    expect(result.current.isLoading).toBe(false);
  });

  it('paginates with the cursor and accumulates pages', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage(['a', 'b'], 'cursor-1'))
      .mockResolvedValueOnce(createPage(['c', 'd'], null));

    const { result } = renderHook(() => usePredictMarketList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockListMarkets).toHaveBeenLastCalledWith({
      afterCursor: 'cursor-1',
    });
    await waitFor(() => {
      expect(result.current.markets.map((m) => m.id)).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('does not auto-fetch the next page when the current page has no visible markets', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockResolvedValueOnce(
      createChildPage(['child-a'], 'cursor-1'),
    );

    const { result } = renderHook(() => usePredictMarketList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.markets).toEqual([]);
    expect(mockListMarkets).toHaveBeenCalledTimes(1);
  });

  it('dedupes markets by id across pages, keeping the first occurrence', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage(['a', 'b'], 'cursor-1'))
      .mockResolvedValueOnce(createPage(['b', 'c'], null));

    const { result } = renderHook(() => usePredictMarketList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.markets.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    });
  });

  it('exposes the error and recovers on refetch', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockRejectedValueOnce(new Error('Boom'));

    const { result } = renderHook(() => usePredictMarketList(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe('Boom');

    mockListMarkets.mockResolvedValueOnce(createPage(['a']));
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    expect(result.current.markets.map((m) => m.id)).toEqual(['a']);
  });
});
