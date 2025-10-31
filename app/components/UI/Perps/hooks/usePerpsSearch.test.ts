import { renderHook, act } from '@testing-library/react-native';
import type { PerpsMarketData } from '../controllers/types';
import { usePerpsSearch } from './usePerpsSearch';

describe('usePerpsSearch', () => {
  const createMockMarket = (symbol: string, name: string): PerpsMarketData => ({
    symbol,
    name,
    maxLeverage: '50x',
    price: '$50,000.00',
    change24h: '+$2,600.00',
    change24hPercent: '+5.2%',
    volume: '$1,000,000',
    fundingRate: 0.01,
  });

  const mockMarkets: PerpsMarketData[] = [
    createMockMarket('BTC', 'Bitcoin'),
    createMockMarket('ETH', 'Ethereum'),
    createMockMarket('SOL', 'Solana'),
    createMockMarket('AVAX', 'Avalanche'),
  ];

  describe('initialization', () => {
    it('returns all markets when search is not visible', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      expect(result.current.filteredMarkets).toEqual(mockMarkets);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.isSearchVisible).toBe(false);
    });

    it('initializes with search visible when specified', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets, initialSearchVisible: true }),
      );

      expect(result.current.isSearchVisible).toBe(true);
    });

    it('returns empty array when markets array is empty', () => {
      const { result } = renderHook(() => usePerpsSearch({ markets: [] }));

      expect(result.current.filteredMarkets).toEqual([]);
    });
  });

  describe('search visibility', () => {
    it('shows search when setIsSearchVisible is called with true', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
      });

      expect(result.current.isSearchVisible).toBe(true);
    });

    it('hides search when setIsSearchVisible is called with false', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setIsSearchVisible(false);
      });

      expect(result.current.isSearchVisible).toBe(false);
    });

    it('toggles search visibility from hidden to visible', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.toggleSearchVisibility();
      });

      expect(result.current.isSearchVisible).toBe(true);
    });

    it('toggles search visibility from visible to hidden', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.toggleSearchVisibility();
      });

      expect(result.current.isSearchVisible).toBe(false);
    });
  });

  describe('search query management', () => {
    it('updates search query when setSearchQuery is called', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.searchQuery).toBe('BTC');
    });

    it('clears search query and hides search when clearSearch is called', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('ETH');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.isSearchVisible).toBe(false);
    });
  });

  describe('market filtering by symbol', () => {
    it('filters markets by exact symbol match', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].symbol).toBe('BTC');
    });

    it('filters markets by partial symbol match', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('A');
      });

      expect(result.current.filteredMarkets).toHaveLength(2);
      expect(result.current.filteredMarkets.map((m) => m.symbol)).toEqual([
        'SOL',
        'AVAX',
      ]);
    });

    it('performs case-insensitive symbol search', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('btc');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].symbol).toBe('BTC');
    });
  });

  describe('market filtering by name', () => {
    it('filters markets by exact name match', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('Bitcoin');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].name).toBe('Bitcoin');
    });

    it('filters markets by partial name match', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('Ava');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].name).toBe('Avalanche');
    });

    it('performs case-insensitive name search', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(true);
        result.current.setSearchQuery('ethereum');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].name).toBe('Ethereum');
    });
  });

  describe('edge cases', () => {
    it('returns all markets when search query is empty string', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('');
      });

      expect(result.current.filteredMarkets).toEqual(mockMarkets);
    });

    it('returns all markets when search query is only whitespace', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('   ');
      });

      expect(result.current.filteredMarkets).toEqual(mockMarkets);
    });

    it('returns empty array when no markets match search', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('NONEXISTENT');
      });

      expect(result.current.filteredMarkets).toEqual([]);
    });

    it('returns all markets when search is hidden regardless of query', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setIsSearchVisible(false);
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.filteredMarkets).toEqual(mockMarkets);
    });

    it('trims whitespace from search query', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('  ETH  ');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].symbol).toBe('ETH');
    });

    it('handles markets with null or undefined symbol', () => {
      const marketsWithNullSymbol: PerpsMarketData[] = [
        {
          ...createMockMarket('BTC', 'Bitcoin'),
          symbol: null as unknown as string,
        },
        createMockMarket('ETH', 'Ethereum'),
      ];

      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: marketsWithNullSymbol,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.filteredMarkets).toEqual([]);
    });

    it('handles markets with null or undefined name', () => {
      const marketsWithNullName: PerpsMarketData[] = [
        {
          ...createMockMarket('BTC', 'Bitcoin'),
          name: null as unknown as string,
        },
        createMockMarket('ETH', 'Ethereum'),
      ];

      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: marketsWithNullName,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('Bitcoin');
      });

      expect(result.current.filteredMarkets).toEqual([]);
    });
  });

  describe('filtering behavior updates', () => {
    it('updates filtered markets when query changes', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({
          markets: mockMarkets,
          initialSearchVisible: true,
        }),
      );

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);

      act(() => {
        result.current.setSearchQuery('ETH');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].symbol).toBe('ETH');
    });

    it('updates filtered markets when markets array changes', () => {
      const { result, rerender } = renderHook(
        ({ markets }) =>
          usePerpsSearch({ markets, initialSearchVisible: true }),
        { initialProps: { markets: mockMarkets } },
      );

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.filteredMarkets).toHaveLength(1);

      const newMarkets = [
        createMockMarket('BTC', 'Bitcoin'),
        createMockMarket('BTC-PERP', 'Bitcoin Perpetual'),
      ];

      rerender({ markets: newMarkets });

      expect(result.current.filteredMarkets).toHaveLength(2);
    });

    it('updates filtered markets when search visibility changes', () => {
      const { result } = renderHook(() =>
        usePerpsSearch({ markets: mockMarkets }),
      );

      act(() => {
        result.current.setSearchQuery('BTC');
        result.current.setIsSearchVisible(false);
      });

      expect(result.current.filteredMarkets).toEqual(mockMarkets);

      act(() => {
        result.current.setIsSearchVisible(true);
      });

      expect(result.current.filteredMarkets).toHaveLength(1);
      expect(result.current.filteredMarkets[0].symbol).toBe('BTC');
    });
  });
});
