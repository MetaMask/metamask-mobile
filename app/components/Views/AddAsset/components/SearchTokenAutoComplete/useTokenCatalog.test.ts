import { act, renderHook, waitFor } from '@testing-library/react-native';
import { handleFetch } from '@metamask/controller-utils';
import { CatalogAsset, useTokenCatalog } from './useTokenCatalog';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

const mockHandleFetch = jest.mocked(handleFetch);

const TRON_CHAIN_ID = 'tron:728126428';

const asset = (symbol: string): CatalogAsset => ({
  assetId: `${TRON_CHAIN_ID}/trc20:${symbol}`,
  symbol,
  name: symbol,
  decimals: 6,
});

const page = (
  data: CatalogAsset[],
  hasNextPage = false,
  endCursor: string | null = null,
) => ({ data, pageInfo: { hasNextPage, endCursor } });

const requestedUrls = () =>
  mockHandleFetch.mock.calls.map(([url]) => String(url));

describe('useTokenCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the first catalog page for the chain', async () => {
    mockHandleFetch.mockResolvedValueOnce(page([asset('A1')]));

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    expect(requestedUrls()[0]).toBe(
      `https://tokens.api.cx.metamask.io/v3/chains/${TRON_CHAIN_ID}/assets?first=25`,
    );
    expect(requestedUrls()[0]).not.toContain('occurrenceFloor');
    expect(requestedUrls()[0]).not.toContain('includeMarketData');
    expect(result.current.assets).toEqual([asset('A1')]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('appends the next page using the cursor and deduplicates assets', async () => {
    mockHandleFetch
      .mockResolvedValueOnce(page([asset('A1')], true, 'catalog-cursor'))
      .mockResolvedValueOnce(page([asset('A1'), asset('A2')]));

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(decodeURIComponent(requestedUrls()[1])).toContain(
      'after=catalog-cursor',
    );
    expect(result.current.assets).toEqual([asset('A1'), asset('A2')]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('runs a single request when loadMore is called repeatedly', async () => {
    let resolveNextPage: (value: ReturnType<typeof page>) => void = () => {
      // Assigned below before use.
    };

    mockHandleFetch
      .mockResolvedValueOnce(page([asset('A1')], true, 'catalog-cursor'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextPage = resolve;
          }),
      );

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      const first = result.current.loadMore();
      const second = result.current.loadMore();

      expect(mockHandleFetch).toHaveBeenCalledTimes(2);

      resolveNextPage(page([asset('A2')]));
      await Promise.all([first, second]);
    });

    expect(mockHandleFetch).toHaveBeenCalledTimes(2);
    expect(result.current.assets).toEqual([asset('A1'), asset('A2')]);
  });

  it('ignores responses for a chain that is no longer selected', async () => {
    let resolvePreviousChain: (value: ReturnType<typeof page>) => void = () => {
      // Assigned below before use.
    };

    mockHandleFetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePreviousChain = resolve;
          }),
      )
      .mockResolvedValueOnce(page([asset('B1')]));

    const { result, rerender } = renderHook(
      ({ chainId }: { chainId?: string }) => useTokenCatalog(chainId),
      { initialProps: { chainId: 'tron:111' } },
    );

    rerender({ chainId: 'tron:222' });
    expect(result.current.assets).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      resolvePreviousChain(page([asset('OLD')]));
    });

    expect(result.current.assets).toEqual([asset('B1')]);
  });

  it('does not let a stale page clear the current chain pagination guard', async () => {
    const pending: Record<string, (value: ReturnType<typeof page>) => void> =
      {};
    const deferredPage = (key: string) =>
      new Promise((resolve) => {
        pending[key] = resolve;
      });

    mockHandleFetch
      .mockResolvedValueOnce(page([asset('A1')], true, 'cursor-a'))
      .mockImplementationOnce(() => deferredPage('a-more'))
      .mockResolvedValueOnce(page([asset('B1')], true, 'cursor-b'))
      .mockImplementationOnce(() => deferredPage('b-more'));

    const { result, rerender } = renderHook(
      ({ chainId }: { chainId?: string }) => useTokenCatalog(chainId),
      { initialProps: { chainId: 'tron:111' } },
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    let previousLoad: Promise<void> | undefined;
    act(() => {
      previousLoad = result.current.loadMore();
    });

    rerender({ chainId: 'tron:222' });
    await waitFor(() => expect(result.current.assets).toEqual([asset('B1')]));

    let currentLoad: Promise<void> | undefined;
    act(() => {
      currentLoad = result.current.loadMore();
    });
    expect(result.current.isLoadingMore).toBe(true);

    await act(async () => {
      pending['a-more'](page([asset('A2')], true, 'cursor-a2'));
      await previousLoad;
    });

    expect(result.current.isLoadingMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockHandleFetch).toHaveBeenCalledTimes(4);

    await act(async () => {
      pending['b-more'](page([asset('B2')]));
      await currentLoad;
    });

    expect(result.current.assets).toEqual([asset('B1'), asset('B2')]);
  });

  it('does not request pages while disabled', async () => {
    const { result } = renderHook(() =>
      useTokenCatalog(TRON_CHAIN_ID, { enabled: false }),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockHandleFetch).not.toHaveBeenCalled();
    expect(result.current.assets).toEqual([]);
  });

  it('reports initial request errors and keeps assets empty', async () => {
    mockHandleFetch.mockRejectedValueOnce(new Error('400'));

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(new Error('400'));
    expect(result.current.assets).toEqual([]);
  });

  it('keeps loaded assets after a pagination error and retries the same page', async () => {
    mockHandleFetch
      .mockResolvedValueOnce(page([asset('A1')], true, 'catalog-cursor'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(page([asset('A2')]));

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.assets).toEqual([asset('A1')]);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(decodeURIComponent(requestedUrls()[2])).toContain(
      'after=catalog-cursor',
    );
    expect(result.current.assets).toEqual([asset('A1'), asset('A2')]);
  });

  it('reports an error when the catalog payload shape is unexpected', async () => {
    mockHandleFetch.mockResolvedValueOnce({ assets: [] } as never);

    const { result } = renderHook(() => useTokenCatalog(TRON_CHAIN_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(
      new Error('Invalid token catalog response'),
    );
    expect(result.current.assets).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });
});
