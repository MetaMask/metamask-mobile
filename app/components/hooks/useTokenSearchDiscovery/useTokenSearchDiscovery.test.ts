import { act, renderHook } from '@testing-library/react-hooks';
import Engine from '../../../core/Engine';
import useTokenSearchDiscovery from './useTokenSearchDiscovery';
import { TokenSearchParams } from '@metamask/token-search-discovery-controller';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryController: {
      searchTokens: jest.fn(),
    },
  },
}));

describe('useTokenSearchDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('updates states correctly when searching tokens', async () => {
    const mockSearchParams: TokenSearchParams = {
      chains: ['0x1'],
      query: 'DAI',
      limit: '10',
    };
    const mockSearchResult = [{ name: 'DAI', address: '0x123' }];

    (
      Engine.context.TokenSearchDiscoveryController.searchTokens as jest.Mock
    ).mockResolvedValueOnce(mockSearchResult);

    const { result } = renderHook(() => useTokenSearchDiscovery());

    // Initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual([]);

    // Call search
    await act(async () => {
      result.current.searchTokens(mockSearchParams);
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Final state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual(mockSearchResult);
    expect(
      Engine.context.TokenSearchDiscoveryController.searchTokens,
    ).toHaveBeenCalledWith(mockSearchParams);
  });

  it('returns error and empty results if search failed', async () => {
    const mockError = new Error('Search failed');
    (
      Engine.context.TokenSearchDiscoveryController.searchTokens as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useTokenSearchDiscovery());

    await act(async () => {
      result.current.searchTokens({});
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.results).toEqual([]);
  });
});
