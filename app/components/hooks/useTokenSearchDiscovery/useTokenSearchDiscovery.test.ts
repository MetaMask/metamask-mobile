import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import useTokenSearchDiscovery from './useTokenSearchDiscovery';

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
  const mockRecentSearches = ['0x123', '0x456'];

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(mockRecentSearches);
  });

  it('should return searchTokens function and recent searches', () => {
    const { result } = renderHook(() => useTokenSearchDiscovery());

    expect(result.current.searchTokens).toBeDefined();
    expect(result.current.recentSearches).toEqual(mockRecentSearches);
  });

  it('should call TokenSearchDiscoveryController.searchTokens with correct params', async () => {
    const mockSearchParams = {
      chainId: '0x1',
      query: 'DAI',
      limit: '10',
    };
    const mockSearchResult = { tokens: [] };

    (
      Engine.context.TokenSearchDiscoveryController.searchTokens as jest.Mock
    ).mockResolvedValueOnce(mockSearchResult);

    const { result } = renderHook(() => useTokenSearchDiscovery());
    const response = await result.current.searchTokens(mockSearchParams);

    expect(
      Engine.context.TokenSearchDiscoveryController.searchTokens,
    ).toHaveBeenCalledWith(mockSearchParams);
    expect(response).toEqual(mockSearchResult);
  });

  it('should handle search errors gracefully', async () => {
    const mockError = new Error('Search failed');
    (
      Engine.context.TokenSearchDiscoveryController.searchTokens as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useTokenSearchDiscovery());

    await expect(result.current.searchTokens({})).rejects.toThrow(
      'Search failed',
    );
  });
});
