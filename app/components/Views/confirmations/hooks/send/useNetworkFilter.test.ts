import { renderHook, act } from '@testing-library/react-native';
import { useNetworkFilter, NETWORK_FILTER_ALL } from './useNetworkFilter';
import { AssetType } from '../../types/token';
import { NetworkInfo } from './useNetworks';

describe('useNetworkFilter', () => {
  const mockNetworks: NetworkInfo[] = [
    {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      image: { uri: 'ethereum.png' },
    },
    {
      chainId: '0x89',
      name: 'Polygon',
      image: { uri: 'polygon.png' },
    },
    {
      chainId: 'solana:mainnet',
      name: 'Solana',
      image: { uri: 'solana.png' },
    },
  ];

  const mockTokens: AssetType[] = [
    {
      chainId: '0x1',
      address: '0x123',
      symbol: 'ETH',
      name: 'Ethereum',
    } as AssetType,
    {
      chainId: '0x1',
      address: '0x456',
      symbol: 'USDC',
      name: 'USD Coin',
    } as AssetType,
    {
      chainId: '0x89',
      address: '0x789',
      symbol: 'MATIC',
      name: 'Polygon',
    } as AssetType,
  ];

  it('returns expected object structure', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    expect(result.current).toHaveProperty('selectedNetworkFilter');
    expect(result.current).toHaveProperty('setSelectedNetworkFilter');
    expect(result.current).toHaveProperty('filteredTokensByNetwork');
    expect(result.current).toHaveProperty('networksWithTokens');
  });

  it('initializes with "all" filter selected', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    expect(result.current.selectedNetworkFilter).toBe(NETWORK_FILTER_ALL);
  });

  it('returns all tokens when filter is set to "all"', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    expect(result.current.filteredTokensByNetwork).toEqual(mockTokens);
    expect(result.current.filteredTokensByNetwork).toHaveLength(3);
  });

  it('filters tokens by selected network', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    act(() => {
      result.current.setSelectedNetworkFilter('0x1');
    });

    expect(result.current.selectedNetworkFilter).toBe('0x1');
    expect(result.current.filteredTokensByNetwork).toHaveLength(2);
    expect(
      result.current.filteredTokensByNetwork.every(
        (token) => token.chainId === '0x1',
      ),
    ).toBe(true);
  });

  it('returns only networks that have tokens', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    expect(result.current.networksWithTokens).toHaveLength(2);
    expect(result.current.networksWithTokens.map((n) => n.chainId)).toEqual([
      '0x1',
      '0x89',
    ]);
  });

  it('updates filter when setSelectedNetworkFilter is called', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    act(() => {
      result.current.setSelectedNetworkFilter('0x89');
    });

    expect(result.current.selectedNetworkFilter).toBe('0x89');
    expect(result.current.filteredTokensByNetwork).toHaveLength(1);
    expect(result.current.filteredTokensByNetwork[0].chainId).toBe('0x89');
  });

  it('handles empty tokens array', () => {
    const { result } = renderHook(() => useNetworkFilter([], mockNetworks));

    expect(result.current.filteredTokensByNetwork).toEqual([]);
    expect(result.current.networksWithTokens).toEqual([]);
  });

  it('handles empty networks array', () => {
    const { result } = renderHook(() => useNetworkFilter(mockTokens, []));

    expect(result.current.filteredTokensByNetwork).toEqual(mockTokens);
    expect(result.current.networksWithTokens).toEqual([]);
  });

  it('returns empty array when filtering by non-existent network', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    act(() => {
      result.current.setSelectedNetworkFilter('0x999');
    });

    expect(result.current.filteredTokensByNetwork).toEqual([]);
  });

  it('recomputes filtered tokens when switching back to "all"', () => {
    const { result } = renderHook(() =>
      useNetworkFilter(mockTokens, mockNetworks),
    );

    // Filter to specific network
    act(() => {
      result.current.setSelectedNetworkFilter('0x1');
    });

    expect(result.current.filteredTokensByNetwork).toHaveLength(2);

    // Switch back to all
    act(() => {
      result.current.setSelectedNetworkFilter(NETWORK_FILTER_ALL);
    });

    expect(result.current.filteredTokensByNetwork).toEqual(mockTokens);
    expect(result.current.filteredTokensByNetwork).toHaveLength(3);
  });
});
