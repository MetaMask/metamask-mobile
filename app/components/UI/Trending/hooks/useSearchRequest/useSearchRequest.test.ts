import { useSearchRequest } from './useSearchRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import-x/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

const createMockSearchResult = (overrides = {}) => ({
  assetId: 'eip155:1/erc20:0x123' as CaipChainId,
  decimals: 18,
  name: 'Ethereum',
  symbol: 'ETH',
  marketCap: 1000000,
  aggregatedUsdVolume: 500000,
  price: '1.00',
  pricePercentChange1d: '5.0',
  ...overrides,
});

describe('useSearchRequest', () => {
  let spySearchTokens: jest.SpyInstance;

  beforeEach(() => {
    spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('returns search results and sets loading to false when search succeeds', async () => {
    const mockResults = [createMockSearchResult()];
    spySearchTokens.mockResolvedValue({ data: mockResults } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.error).toBe(null);

    unmount();
  });

  it('sets error state and clears results when search fails', async () => {
    const mockError = new Error('Network error');
    spySearchTokens.mockRejectedValue(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    unmount();
  });

  it('prevents stale results from overwriting current results', async () => {
    const mockResults1 = [createMockSearchResult({ symbol: 'ETH' })];
    const mockResults2 = [createMockSearchResult({ symbol: 'DAI' })];

    let resolveFirstRequest: ((value: unknown) => void) | undefined;
    const firstRequestPromise = new Promise<unknown>((resolve) => {
      resolveFirstRequest = resolve;
    });

    spySearchTokens
      .mockReturnValueOnce(firstRequestPromise as never)
      .mockResolvedValueOnce({ data: mockResults2 } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      await result.current.search();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults2);
    });

    await act(async () => {
      if (resolveFirstRequest) {
        resolveFirstRequest({ data: mockResults1 });
      }
    });

    expect(result.current.results).toEqual(mockResults2);

    unmount();
  });

  it('skips API call and clears results when query is empty', async () => {
    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: '',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(spySearchTokens).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);

    unmount();
  });

  it('retries search when search function is called manually', async () => {
    const mockError = new Error('Network error');
    const mockResults = [createMockSearchResult()];

    spySearchTokens.mockRejectedValueOnce(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    spySearchTokens.mockResolvedValue({ data: mockResults } as never);

    await act(async () => {
      await result.current.search();
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(result.current.results).toEqual(mockResults);

    unmount();
  });

  it('triggers new search when parameters change', async () => {
    spySearchTokens.mockResolvedValue({ data: [] } as never);

    let chainIds: CaipChainId[] = ['eip155:1'];
    const { rerender, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(1);
    });

    chainIds = ['eip155:137'];
    rerender(undefined);

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(2);
    });

    unmount();
  });

  it('does not trigger new search when chainIds array reference changes but values remain same', async () => {
    spySearchTokens.mockResolvedValue({ data: [] } as never);

    let chainIds: CaipChainId[] = ['eip155:1', 'eip155:10'];
    const { rerender, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(1);
    });

    chainIds = ['eip155:1', 'eip155:10'];
    rerender(undefined);

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it('appends results and updates cursor when loadMore is called with a next page available', async () => {
    const page1Results = [createMockSearchResult({ symbol: 'ETH' })];
    const page2Results = [createMockSearchResult({ symbol: 'BTC' })];

    spySearchTokens
      .mockResolvedValueOnce({
        data: page1Results,
        pageInfo: { hasNextPage: true, endCursor: 'cursor-page-2' },
      } as never)
      .mockResolvedValueOnce({
        data: page2Results,
        pageInfo: { hasNextPage: false, endCursor: undefined },
      } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toEqual(page1Results);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.results).toEqual([...page1Results, ...page2Results]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
    expect(spySearchTokens).toHaveBeenCalledTimes(2);
    expect(spySearchTokens).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'ETH',
      expect.objectContaining({ after: 'cursor-page-2' }),
    );

    unmount();
  });

  it('loadMore is a no-op when hasNextPage is false', async () => {
    const mockResults = [createMockSearchResult()];
    spySearchTokens.mockResolvedValue({
      data: mockResults,
      pageInfo: { hasNextPage: false },
    } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    // searchTokens should only have been called once (for the initial search)
    expect(spySearchTokens).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual(mockResults);

    unmount();
  });

  it('resets cursor and results when query changes after a paginated search', async () => {
    const page1Results = [createMockSearchResult({ symbol: 'ETH' })];
    const newQueryResults = [createMockSearchResult({ symbol: 'DAI' })];

    spySearchTokens
      .mockResolvedValueOnce({
        data: page1Results,
        pageInfo: { hasNextPage: true, endCursor: 'cursor-page-2' },
      } as never)
      .mockResolvedValueOnce({ data: newQueryResults } as never);

    const { result, unmount } = renderHookWithProvider(() => {
      const [query, setQuery] = useState('ETH');
      const searchRequest = useSearchRequest({
        chainIds: ['eip155:1'],
        query,
        limit: 10,
      });
      return { ...searchRequest, setQuery };
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.setQuery('DAI');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toEqual(newQueryResults);
    expect(result.current.hasNextPage).toBe(false);

    unmount();
  });
});
