import { useSearchRequest } from './useSearchRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';
import { usePopularNetworks } from '../usePopularNetworks/usePopularNetworks';

jest.mock('../usePopularNetworks/usePopularNetworks');

const mockUsePopularNetworks = usePopularNetworks as jest.MockedFunction<
  typeof usePopularNetworks
>;

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
    mockUsePopularNetworks.mockReturnValue([
      {
        id: 'eip155:1',
        name: 'Ethereum Mainnet',
        caipChainId: 'eip155:1' as CaipChainId,
        isSelected: false,
        imageSource: { uri: 'ethereum' },
      },
    ]);
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
});
