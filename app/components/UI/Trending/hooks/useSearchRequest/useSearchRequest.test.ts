import { useSearchRequest } from './useSearchRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

describe('useSearchRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns search results when search succeeds', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    const mockResults = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ];
    spySearchTokens.mockResolvedValue({ data: mockResults } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(1);
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    spySearchTokens.mockRestore();
    unmount();
  });

  it('sets error state when search fails', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    const mockError = new Error('Failed to search tokens');
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

    spySearchTokens.mockRestore();
    unmount();
  });

  it('handles stale results when multiple requests are triggered', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    const mockResults1 = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ];
    const mockResults2 = [
      {
        assetId: 'eip155:1/erc20:0x456',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
      },
    ];

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

    spySearchTokens.mockRestore();
    unmount();
  });

  it('skips search when query is empty', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    spySearchTokens.mockResolvedValue({ data: [] } as never);

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

    await act(async () => {
      await result.current.search();
    });

    expect(spySearchTokens).not.toHaveBeenCalled();

    spySearchTokens.mockRestore();
    unmount();
  });

  it('allows manual retry after error using search function', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    const mockError = new Error('Failed to search tokens');
    const mockResults = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ];

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
    expect(result.current.isLoading).toBe(false);

    spySearchTokens.mockRestore();
    unmount();
  });

  it('triggers new search when chainIds values change', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
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

    chainIds = ['eip155:1', 'eip155:137'];
    rerender(undefined);

    await waitFor(() => {
      expect(spySearchTokens).toHaveBeenCalledTimes(2);
    });

    spySearchTokens.mockRestore();
    unmount();
  });
});
