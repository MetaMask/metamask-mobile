import { renderHook, act } from '@testing-library/react-hooks';

import { AssetType } from '../../types/token';
import { useTokenSearch } from './useTokenSearch';

const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    balance: '100',
    chainId: '0x1',
    name: 'Ethereum',
    symbol: 'ETH',
    isNative: true,
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    balance: '50',
    chainId: '0x1',
    name: 'USD Coin',
    symbol: 'USDC',
    isNative: false,
  },
  {
    address: '0x9876543210987654321098765432109876543210',
    balance: '200',
    chainId: '0x1',
    name: 'Tether USD',
    symbol: 'USDT',
    isNative: false,
  },
] as AssetType[];

describe('useTokenSearch', () => {
  it('return all tokens when search query is empty', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    expect(result.current.filteredTokens).toEqual(mockTokens);
    expect(result.current.searchQuery).toBe('');
  });

  it('filter tokens by symbol (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('usdc');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].symbol).toBe('USDC');
  });

  it('filter tokens by name (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('ethereum');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].name).toBe('Ethereum');
  });

  it('filter tokens by address (case insensitive)', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery(
        '0x1234567890123456789012345678901234567890',
      );
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].address).toBe(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('filter tokens by partial address', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('123456');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].address).toBe(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('return multiple tokens when search matches multiple criteria', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('USD');
    });

    expect(result.current.filteredTokens).toHaveLength(2);
    expect(result.current.filteredTokens.map((t) => t.symbol)).toEqual([
      'USDC',
      'USDT',
    ]);
  });

  it('handle whitespace in search query', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('  usdc  ');
    });

    expect(result.current.filteredTokens).toHaveLength(1);
    expect(result.current.filteredTokens[0].symbol).toBe('USDC');
  });

  it('return empty array when no tokens match', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('nonexistent');
    });

    expect(result.current.filteredTokens).toHaveLength(0);
  });

  it('clear search when clearSearch is called', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('usdc');
    });

    expect(result.current.searchQuery).toBe('usdc');
    expect(result.current.filteredTokens).toHaveLength(1);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filteredTokens).toEqual(mockTokens);
  });

  it('handle empty tokens array', () => {
    const { result } = renderHook(() => useTokenSearch([]));

    expect(result.current.filteredTokens).toEqual([]);

    act(() => {
      result.current.setSearchQuery('eth');
    });

    expect(result.current.filteredTokens).toEqual([]);
  });

  it('search for "eth" matches both ETH symbol and Tether USD name', () => {
    const { result } = renderHook(() => useTokenSearch(mockTokens));

    act(() => {
      result.current.setSearchQuery('eth');
    });

    expect(result.current.filteredTokens).toHaveLength(2);
    expect(result.current.filteredTokens.map((t) => t.symbol)).toEqual([
      'ETH',
      'USDT',
    ]);
  });
});
