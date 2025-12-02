import { renderHook, act } from '@testing-library/react-native';
import { SolScope, BtcScope } from '@metamask/keyring-api';
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
      aggregators: [],
      decimals: 18,
      image: '',
      balance: '0',
      logo: undefined,
      isETH: false,
    } as AssetType,
    {
      chainId: '0x1',
      address: '0x456',
      symbol: 'USDC',
      name: 'USD Coin',
      aggregators: [],
      decimals: 6,
      image: '',
      balance: '0',
      logo: undefined,
      isETH: false,
    } as AssetType,
    {
      chainId: '0x89',
      address: '0x789',
      symbol: 'MATIC',
      name: 'Polygon',
      aggregators: [],
      decimals: 18,
      image: '',
      balance: '0',
      logo: undefined,
      isETH: false,
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

  describe('network sorting by mainnet/testnet groups', () => {
    it('sorts networks with mainnets first, then testnets, each sorted by value', () => {
      // Create networks with mixed mainnets and testnets
      const networksWithTestnets: NetworkInfo[] = [
        {
          chainId: '0x89', // Polygon Mainnet (lower value)
          name: 'Polygon',
          image: { uri: 'polygon.png' },
        },
        {
          chainId: '0xaa36a7', // Sepolia Testnet (high value)
          name: 'Sepolia',
          image: { uri: 'sepolia.png' },
        },
        {
          chainId: '0x1', // Ethereum Mainnet (high value)
          name: 'Ethereum Mainnet',
          image: { uri: 'ethereum.png' },
        },
        {
          chainId: SolScope.Devnet, // Solana Devnet (lower value)
          name: 'Solana Devnet',
          image: { uri: 'solana-devnet.png' },
        },
      ];

      // Create tokens with different fiat values
      // Ethereum Mainnet: $5000 (highest mainnet)
      // Polygon: $1000 (lower mainnet)
      // Sepolia: $2000 (highest testnet)
      // Solana Devnet: $500 (lower testnet)
      const tokensWithValues: AssetType[] = [
        {
          chainId: '0x1',
          address: '0x123',
          symbol: 'ETH',
          name: 'Ethereum',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 5000 },
        } as AssetType,
        {
          chainId: '0x89',
          address: '0x456',
          symbol: 'MATIC',
          name: 'Polygon',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 1000 },
        } as AssetType,
        {
          chainId: '0xaa36a7',
          address: '0x789',
          symbol: 'ETH',
          name: 'Sepolia ETH',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 2000 },
        } as AssetType,
        {
          chainId: SolScope.Devnet,
          address: '0xabc',
          symbol: 'SOL',
          name: 'Solana',
          aggregators: [],
          decimals: 9,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 500 },
        } as AssetType,
      ];

      const { result } = renderHook(() =>
        useNetworkFilter(tokensWithValues, networksWithTestnets),
      );

      const sortedNetworks = result.current.networksWithTokens;

      // Should have 4 networks
      expect(sortedNetworks).toHaveLength(4);

      // Mainnets should come first, sorted by value (descending)
      // Ethereum Mainnet ($5000) should be first
      expect(sortedNetworks[0].chainId).toBe('0x1');
      expect(sortedNetworks[0].name).toBe('Ethereum Mainnet');

      // Polygon ($1000) should be second
      expect(sortedNetworks[1].chainId).toBe('0x89');
      expect(sortedNetworks[1].name).toBe('Polygon');

      // Testnets should come after mainnets, sorted by value (descending)
      // Sepolia ($2000) should be third
      expect(sortedNetworks[2].chainId).toBe('0xaa36a7');
      expect(sortedNetworks[2].name).toBe('Sepolia');

      // Solana Devnet ($500) should be last
      expect(sortedNetworks[3].chainId).toBe(SolScope.Devnet);
      expect(sortedNetworks[3].name).toBe('Solana Devnet');
    });

    it('handles networks with zero balance correctly', () => {
      const networksWithZeroBalance: NetworkInfo[] = [
        {
          chainId: '0x1', // Ethereum Mainnet
          name: 'Ethereum Mainnet',
          image: { uri: 'ethereum.png' },
        },
        {
          chainId: '0xaa36a7', // Sepolia Testnet
          name: 'Sepolia',
          image: { uri: 'sepolia.png' },
        },
      ];

      const tokensWithZeroBalance: AssetType[] = [
        {
          chainId: '0x1',
          address: '0x123',
          symbol: 'ETH',
          name: 'Ethereum',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 0 },
        } as AssetType,
        {
          chainId: '0xaa36a7',
          address: '0x789',
          symbol: 'ETH',
          name: 'Sepolia ETH',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          // No fiat balance
        } as AssetType,
      ];

      const { result } = renderHook(() =>
        useNetworkFilter(tokensWithZeroBalance, networksWithZeroBalance),
      );

      const sortedNetworks = result.current.networksWithTokens;

      // Should have 2 networks
      expect(sortedNetworks).toHaveLength(2);

      // Mainnet should come first even with zero balance
      expect(sortedNetworks[0].chainId).toBe('0x1');
      expect(sortedNetworks[0].name).toBe('Ethereum Mainnet');

      // Testnet should come after
      expect(sortedNetworks[1].chainId).toBe('0xaa36a7');
      expect(sortedNetworks[1].name).toBe('Sepolia');
    });

    it('handles Bitcoin testnet networks correctly', () => {
      const networksWithBitcoin: NetworkInfo[] = [
        {
          chainId: BtcScope.Mainnet,
          name: 'Bitcoin Mainnet',
          image: { uri: 'bitcoin.png' },
        },
        {
          chainId: BtcScope.Testnet,
          name: 'Bitcoin Testnet',
          image: { uri: 'bitcoin-testnet.png' },
        },
        {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          image: { uri: 'ethereum.png' },
        },
      ];

      const tokensWithBitcoin: AssetType[] = [
        {
          chainId: BtcScope.Mainnet,
          address: '0xbtc1',
          symbol: 'BTC',
          name: 'Bitcoin',
          aggregators: [],
          decimals: 8,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 3000 },
        } as AssetType,
        {
          chainId: BtcScope.Testnet,
          address: '0xbtc2',
          symbol: 'BTC',
          name: 'Bitcoin Testnet',
          aggregators: [],
          decimals: 8,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 100 },
        } as AssetType,
        {
          chainId: '0x1',
          address: '0x123',
          symbol: 'ETH',
          name: 'Ethereum',
          aggregators: [],
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
          fiat: { balance: 5000 },
        } as AssetType,
      ];

      const { result } = renderHook(() =>
        useNetworkFilter(tokensWithBitcoin, networksWithBitcoin),
      );

      const sortedNetworks = result.current.networksWithTokens;

      // Should have 3 networks
      expect(sortedNetworks).toHaveLength(3);

      // Mainnets should come first, sorted by value
      // Ethereum Mainnet ($5000) should be first
      expect(sortedNetworks[0].chainId).toBe('0x1');
      expect(sortedNetworks[0].name).toBe('Ethereum Mainnet');

      // Bitcoin Mainnet ($3000) should be second
      expect(sortedNetworks[1].chainId).toBe(BtcScope.Mainnet);
      expect(sortedNetworks[1].name).toBe('Bitcoin Mainnet');

      // Bitcoin Testnet ($100) should come after all mainnets
      expect(sortedNetworks[2].chainId).toBe(BtcScope.Testnet);
      expect(sortedNetworks[2].name).toBe('Bitcoin Testnet');
    });
  });
});
