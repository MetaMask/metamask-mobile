import { act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import useTokenSearchDiscovery, { MAX_RESULTS } from './useTokenSearch';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryController: {
      searchSwappableTokens: jest.fn(),
    },
  },
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      TokenSearchDiscoveryController: {
        recentSearches: [],
        lastSearchTimestamp: 0,
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          tokenSearchDiscoveryEnabled: true,
        },
      },
    },
  },
};

describe('useTokenSearchDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('updates states correctly when searching tokens', async () => {
    const mockSearchQuery = 'DAI';
    const mockSearchResult = [
      { name: 'DAI', tokenAddress: '0x123', chainId: '0x1' },
    ];

    (
      Engine.context.TokenSearchDiscoveryController
        .searchSwappableTokens as jest.Mock
    ).mockResolvedValueOnce(mockSearchResult);

    const { result } = renderHookWithProvider(() => useTokenSearchDiscovery(), {
      state: mockInitialState,
    });

    // Initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual([]);

    // Call search
    await act(async () => {
      result.current.searchTokens(mockSearchQuery);
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Final state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual(mockSearchResult);
    expect(
      Engine.context.TokenSearchDiscoveryController.searchSwappableTokens,
    ).toHaveBeenCalledWith({ query: mockSearchQuery, limit: MAX_RESULTS });
  });

  it('does not search when less than two characters are queried', async () => {
    const { result } = renderHookWithProvider(() => useTokenSearchDiscovery(), {
      state: mockInitialState,
    });
    await act(async () => {
      result.current.searchTokens('a');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(
      Engine.context.TokenSearchDiscoveryController.searchSwappableTokens,
    ).not.toHaveBeenCalled();
  });

  it('resets the state when reset() is called', async () => {
    const mockSearchResult = [
      { name: 'DAI', tokenAddress: '0x123', chainId: '0x1' },
    ];

    (
      Engine.context.TokenSearchDiscoveryController
        .searchSwappableTokens as jest.Mock
    ).mockResolvedValueOnce(mockSearchResult);

    const { result } = renderHookWithProvider(() => useTokenSearchDiscovery(), {
      state: mockInitialState,
    });

    await act(async () => {
      result.current.searchTokens('doge');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.results).toEqual(mockSearchResult);

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.results).toEqual([]);
  });

  it('returns error and empty results if search failed', async () => {
    const mockError = new Error('Search failed');
    (
      Engine.context.TokenSearchDiscoveryController
        .searchSwappableTokens as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHookWithProvider(() => useTokenSearchDiscovery(), {
      state: mockInitialState,
    });

    await act(async () => {
      result.current.searchTokens('doge');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.results).toEqual([]);
  });
});
