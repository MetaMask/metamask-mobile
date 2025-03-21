import { renderHook, act } from '@testing-library/react-hooks';
import { useTokenSearch } from './useTokenSearch';
import { TokenIWithFiatAmount } from './useTokensWithBalance';

describe('useTokenSearch', () => {
  // Mock token data
  const mockTokens: TokenIWithFiatAmount[] = [
    {
      address: '0x1',
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
      balance: '1.23',
      balanceFiat: '$2000.00',
      tokenFiatAmount: 2000.00,
      aggregators: [],
      image: 'https://example.com/eth.png',
      logo: 'https://example.com/eth.png',
      isETH: true,
    },
    {
      address: '0x2',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      balance: '100.123',
      balanceFiat: '$100.123',
      tokenFiatAmount: 100.123,
      aggregators: [],
      image: 'https://example.com/usdc.png',
      logo: 'https://example.com/usdc.png',
      isETH: false,
    },
    {
      address: '0x3',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
      balance: '0',
      balanceFiat: '$0.00',
      tokenFiatAmount: 0.00,
      aggregators: [],
      image: 'https://example.com/dai.png',
      logo: 'https://example.com/dai.png',
      isETH: false,
    },
    {
      address: '0x4',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether USD',
      balance: '20.1',
      balanceFiat: '$20.1',
      tokenFiatAmount: 20.1,
      aggregators: [],
      image: 'https://example.com/usdt.png',
      logo: 'https://example.com/usdt.png',
      isETH: false,
    },
  ];

  it('should initialize with empty search string and empty token list', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    expect(result.current.searchString).toBe('');
    expect(result.current.searchResults).toEqual([]);
  });

  it('should update search string when setSearchString is called', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('ETH');
    });

    expect(result.current.searchString).toBe('ETH');
  });

  it('should find tokens by symbol', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('ETH');
    });

    expect(result.current.searchResults[0].symbol).toBe('ETH');
  });

  it('should find tokens by name', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('Coin');
    });

    expect(result.current.searchResults[0].symbol).toBe('USDC');
  });

  it('should find tokens by address', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('0x1');
    });

    expect(result.current.searchResults[0].symbol).toBe('ETH');
  });

  it('should return empty array when no matches found', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('NONEXISTENT');
    });

    expect(result.current.searchResults).toHaveLength(0);
  });

  it('should sort results by tokenFiatAmount in descending order', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: mockTokens }));

    act(() => {
      result.current.setSearchString('USD'); // Should match both USDC and USDT
    });

    expect(result.current.searchResults).toHaveLength(2);
    expect(result.current.searchResults[0].symbol).toBe('USDC'); // Higher fiat value should be first
    expect(result.current.searchResults[1].symbol).toBe('USDT');
  });

  it('should handle empty token list', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: [] }));

    act(() => {
      result.current.setSearchString('ETH');
    });

    expect(result.current.searchResults).toHaveLength(0);
  });

  it('should handle undefined token list', () => {
    const { result } = renderHook(() => useTokenSearch({ tokens: undefined as unknown as TokenIWithFiatAmount[] }));

    act(() => {
      result.current.setSearchString('ETH');
    });

    expect(result.current.searchResults).toHaveLength(0);
  });

  it('should limit results to MAX_TOKENS_RESULTS', () => {
    // Create a large token list
    const largeTokenList = Array.from({ length: 30 }, (_, i) => ({
      address: `0x${i}`,
      symbol: `TKN${i}`,
      decimals: 18,
      name: `Token ${i}`,
      balance: '0',
      balanceFiat: '$0.00',
      tokenFiatAmount: 0,
      aggregators: [],
      image: `https://example.com/tkn${i}.png`,
      logo: `https://example.com/tkn${i}.png`,
      isETH: false,
    })) as TokenIWithFiatAmount[];

    const { result } = renderHook(() => useTokenSearch({ tokens: largeTokenList }));

    act(() => {
      result.current.setSearchString('TKN'); // Should match all tokens
    });

    expect(result.current.searchResults.length).toBeLessThanOrEqual(20); // MAX_TOKENS_RESULTS is 20
  });
});
