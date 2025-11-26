import { DEBOUNCE_WAIT, useSearchRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';

describe('useSearchRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spySearchTokens).toHaveBeenCalledTimes(1);
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

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    // Ensure all operations complete before cleanup
    await act(async () => {
      result.current.search.cancel();
      jest.runOnlyPendingTimers();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      // Flush all remaining promises
      for (let i = 0; i < 20; i++) {
        await Promise.resolve();
      }
    });

    spySearchTokens.mockRestore();
    unmount();
  });

  it('coalesces multiple rapid calls into a single search', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    spySearchTokens.mockResolvedValue({ data: [] } as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds: ['eip155:1'],
        query: 'ETH',
        limit: 10,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    spySearchTokens.mockClear();

    await act(async () => {
      result.current.search();
      result.current.search();
      result.current.search();

      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);
      expect(spySearchTokens).not.toHaveBeenCalled();

      jest.advanceTimersByTime(DEBOUNCE_WAIT + 200);
      await Promise.resolve();
    });

    expect(spySearchTokens).toHaveBeenCalledTimes(1);

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

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spySearchTokens).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.search();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spySearchTokens).not.toHaveBeenCalled();

    unmount();
  });

  it('maintains stable search function reference when chainIds array reference changes but values remain the same', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    spySearchTokens.mockResolvedValue({ data: [] } as never);

    let chainIds: CaipChainId[] = ['eip155:1', 'eip155:10'];
    const { result, rerender, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    const firstSearchFunction = result.current.search;

    chainIds = ['eip155:1', 'eip155:10'];
    rerender(undefined);

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.search).toBe(firstSearchFunction);

    unmount();
  });

  it('creates new search function when chainIds values change', async () => {
    const spySearchTokens = jest.spyOn(assetsControllers, 'searchTokens');
    spySearchTokens.mockResolvedValue({ data: [] } as never);

    let chainIds: CaipChainId[] = ['eip155:1', 'eip155:10'];
    const { result, rerender, unmount } = renderHookWithProvider(() =>
      useSearchRequest({
        chainIds,
        query: 'ETH',
        limit: 10,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    const firstSearchFunction = result.current.search;

    chainIds = ['eip155:1', 'eip155:137'];
    rerender(undefined);

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.search).not.toBe(firstSearchFunction);
    unmount();
  });
});
