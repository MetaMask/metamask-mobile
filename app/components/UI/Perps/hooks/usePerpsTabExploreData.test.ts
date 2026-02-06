import { renderHook } from '@testing-library/react-hooks';
import { usePerpsTabExploreData } from './usePerpsTabExploreData';
import {
  usePerpsMarkets,
  type PerpsMarketDataWithVolumeNumber,
} from './usePerpsMarkets';
import { useSelector } from 'react-redux';
import type { PerpsMarketData } from '../controllers/types';

// Mock dependencies
jest.mock('./usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsTabExploreData', () => {
  const mockMarkets: PerpsMarketDataWithVolumeNumber[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$100,000',
      change24h: '+$2,500',
      change24hPercent: '2.5%',
      volume: '$1B',
      openInterest: '$500M',
      volumeNumber: 1000000000,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      maxLeverage: '50x',
      price: '$3,000',
      change24h: '+$100',
      change24hPercent: '3.4%',
      volume: '$500M',
      openInterest: '$250M',
      volumeNumber: 500000000,
      marketType: 'equity',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      maxLeverage: '20x',
      price: '$150',
      change24h: '-$5',
      change24hPercent: '-3.2%',
      volume: '$100M',
      openInterest: '$50M',
      volumeNumber: 100000000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
    mockUseSelector.mockReturnValue(['BTC']); // watchlist contains BTC
  });

  describe('when enabled', () => {
    it('returns explore markets filtered to top 8 crypto + equity', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert
      expect(result.current.exploreMarkets).toHaveLength(3);
      expect(result.current.exploreMarkets[0].symbol).toBe('BTC');
      expect(result.current.isLoading).toBe(false);
    });

    it('returns watchlist markets matching symbols from Redux', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert
      expect(result.current.watchlistMarkets).toHaveLength(1);
      expect(result.current.watchlistMarkets[0].symbol).toBe('BTC');
    });

    it('calls usePerpsMarkets with skipInitialFetch=false when enabled', () => {
      // Arrange & Act
      renderHook(() => usePerpsTabExploreData({ enabled: true }));

      // Assert
      expect(mockUsePerpsMarkets).toHaveBeenCalledWith({
        skipInitialFetch: false,
        showZeroVolume: false,
      });
    });
  });

  describe('when disabled', () => {
    it('returns empty arrays for explore and watchlist markets', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: false }),
      );

      // Assert
      expect(result.current.exploreMarkets).toHaveLength(0);
      expect(result.current.watchlistMarkets).toHaveLength(0);
    });

    it('calls usePerpsMarkets with skipInitialFetch=true when disabled', () => {
      // Arrange & Act
      renderHook(() => usePerpsTabExploreData({ enabled: false }));

      // Assert
      expect(mockUsePerpsMarkets).toHaveBeenCalledWith({
        skipInitialFetch: true,
        showZeroVolume: false,
      });
    });
  });

  describe('loading state', () => {
    it('returns isLoading=true when markets are loading', () => {
      // Arrange
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.exploreMarkets).toHaveLength(0);
    });
  });

  describe('market filtering', () => {
    it('limits explore markets to 8', () => {
      // Arrange - Create 10 markets
      const manyMarkets: PerpsMarketDataWithVolumeNumber[] = Array.from(
        { length: 10 },
        (_, i) => ({
          symbol: `TOKEN${i}`,
          name: `Token ${i}`,
          maxLeverage: '50x',
          price: '$100',
          change24h: '+$1',
          change24hPercent: '1%',
          volume: '$100M',
          openInterest: '$50M',
          volumeNumber: 100000000 - i * 1000000,
        }),
      );
      mockUsePerpsMarkets.mockReturnValue({
        markets: manyMarkets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert
      expect(result.current.exploreMarkets).toHaveLength(8);
      expect(result.current.exploreMarkets[0].symbol).toBe('TOKEN0');
      expect(result.current.exploreMarkets[7].symbol).toBe('TOKEN7');
    });

    it('includes all market types without filtering', () => {
      // Arrange
      const mixedMarkets: PerpsMarketDataWithVolumeNumber[] = [
        { ...mockMarkets[0], marketType: undefined }, // crypto (no type)
        { ...mockMarkets[1], marketType: 'equity' }, // equity
        {
          ...mockMarkets[2],
          marketType: 'forex' as PerpsMarketData['marketType'],
        }, // forex
      ];
      mockUsePerpsMarkets.mockReturnValue({
        markets: mixedMarkets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      // Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert - all market types are included (no filtering)
      expect(result.current.exploreMarkets).toHaveLength(3);
      expect(result.current.exploreMarkets.map((m) => m.symbol)).toEqual([
        'BTC',
        'ETH',
        'SOL',
      ]);
    });

    it('returns empty watchlist when no symbols match', () => {
      // Arrange
      mockUseSelector.mockReturnValue(['UNKNOWN_SYMBOL']);

      // Act
      const { result } = renderHook(() =>
        usePerpsTabExploreData({ enabled: true }),
      );

      // Assert
      expect(result.current.watchlistMarkets).toHaveLength(0);
    });
  });
});
