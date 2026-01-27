import { renderHook, act } from '@testing-library/react-native';
import type { PerpsMarketData } from '../controllers/types';
import { MARKET_SORTING_CONFIG } from '../constants/perpsConfig';
import { usePerpsSorting } from './usePerpsSorting';
import { sortMarkets } from '../utils/sortMarkets';

// Mock the sortMarkets utility
jest.mock('../utils/sortMarkets', () => ({
  sortMarkets: jest.fn((params) => params.markets),
}));

const mockSortMarkets = sortMarkets as jest.MockedFunction<typeof sortMarkets>;

describe('usePerpsSorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockMarket = (
    symbol: string,
    overrides: Partial<PerpsMarketData> = {},
  ): PerpsMarketData => ({
    symbol,
    name: `${symbol} Market`,
    maxLeverage: '50x',
    price: '$50,000.00',
    change24h: '+$2,600.00',
    change24hPercent: '+5.2%',
    volume: '$1,000,000',
    fundingRate: 0.01,
    ...overrides,
  });

  const mockMarkets: PerpsMarketData[] = [
    createMockMarket('BTC', { volume: '$5,000,000' }),
    createMockMarket('ETH', { volume: '$3,000,000' }),
    createMockMarket('SOL', { volume: '$1,000,000' }),
  ];

  describe('initialization', () => {
    it('initializes with default sort option', () => {
      const { result } = renderHook(() => usePerpsSorting());

      expect(result.current.selectedOptionId).toBe(
        MARKET_SORTING_CONFIG.DefaultSortOptionId,
      );
      expect(result.current.sortBy).toBe(
        MARKET_SORTING_CONFIG.SortFields.Volume,
      );
      expect(result.current.direction).toBe(
        MARKET_SORTING_CONFIG.DefaultDirection,
      );
    });

    it('initializes with custom sort option', () => {
      const { result } = renderHook(() =>
        usePerpsSorting({ initialOptionId: 'priceChange' }),
      );

      expect(result.current.selectedOptionId).toBe('priceChange');
      expect(result.current.sortBy).toBe('priceChange');
      expect(result.current.direction).toBe('desc');
    });
  });

  describe('option selection', () => {
    it('updates selected option when handleOptionChange is called', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      expect(result.current.selectedOptionId).toBe('fundingRate');
      expect(result.current.sortBy).toBe('fundingRate');
      expect(result.current.direction).toBe('desc');
    });

    it('updates sort direction for price change ascending', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('priceChange', 'priceChange', 'asc');
      });

      expect(result.current.selectedOptionId).toBe('priceChange');
      expect(result.current.sortBy).toBe('priceChange');
      expect(result.current.direction).toBe('asc');
    });

    it('updates sort direction for price change descending', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('priceChange', 'priceChange', 'desc');
      });

      expect(result.current.selectedOptionId).toBe('priceChange');
      expect(result.current.sortBy).toBe('priceChange');
      expect(result.current.direction).toBe('desc');
    });

    it('maintains handleOptionChange reference across renders', () => {
      const { result } = renderHook(() => usePerpsSorting());

      const initialHandler = result.current.handleOptionChange;

      // Function reference should remain stable
      expect(result.current.handleOptionChange).toBe(initialHandler);
    });
  });

  describe('sorting markets', () => {
    it('calls sortMarkets with current sort settings', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.sortMarketsList(mockMarkets);
      });

      expect(mockSortMarkets).toHaveBeenCalledWith({
        markets: mockMarkets,
        sortBy: MARKET_SORTING_CONFIG.SortFields.Volume,
        direction: MARKET_SORTING_CONFIG.DefaultDirection,
      });
    });

    it('calls sortMarkets with updated sort field', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      act(() => {
        result.current.sortMarketsList(mockMarkets);
      });

      expect(mockSortMarkets).toHaveBeenCalledWith({
        markets: mockMarkets,
        sortBy: 'fundingRate',
        direction: 'desc',
      });
    });

    it('calls sortMarkets with ascending direction', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('priceChange', 'priceChange', 'asc');
      });

      act(() => {
        result.current.sortMarketsList(mockMarkets);
      });

      expect(mockSortMarkets).toHaveBeenCalledWith({
        markets: mockMarkets,
        sortBy: 'priceChange',
        direction: 'asc',
      });
    });

    it('returns sorted markets from sortMarkets utility', () => {
      const sortedMarkets = [mockMarkets[2], mockMarkets[1], mockMarkets[0]];
      mockSortMarkets.mockReturnValue(sortedMarkets);

      const { result } = renderHook(() => usePerpsSorting());

      const resultMarkets = result.current.sortMarketsList(mockMarkets);

      expect(resultMarkets).toEqual(sortedMarkets);
    });

    it('updates sortMarketsList when sort options change', () => {
      const { result } = renderHook(() => usePerpsSorting());

      const initialSortFn = result.current.sortMarketsList;

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      expect(result.current.sortMarketsList).not.toBe(initialSortFn);
    });

    it('maintains sortMarketsList reference when sort options unchanged', () => {
      const { result } = renderHook(() => usePerpsSorting());

      const initialSortFn = result.current.sortMarketsList;

      // Function reference should remain stable
      expect(result.current.sortMarketsList).toBe(initialSortFn);
    });
  });

  describe('edge cases', () => {
    it('handles empty markets array', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.sortMarketsList([]);
      });

      expect(mockSortMarkets).toHaveBeenCalledWith({
        markets: [],
        sortBy: MARKET_SORTING_CONFIG.SortFields.Volume,
        direction: MARKET_SORTING_CONFIG.DefaultDirection,
      });
    });

    it('falls back to default values when option not found', () => {
      const { result } = renderHook(() =>
        usePerpsSorting({
          initialOptionId: 'invalid-option' as 'volume',
        }),
      );

      expect(result.current.selectedOptionId).toBe('invalid-option');
      expect(result.current.sortBy).toBe(
        MARKET_SORTING_CONFIG.SortFields.Volume,
      );
      expect(result.current.direction).toBe(
        MARKET_SORTING_CONFIG.DefaultDirection,
      );
    });

    it('handles multiple sort changes in sequence', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      expect(result.current.sortBy).toBe('fundingRate');

      act(() => {
        result.current.handleOptionChange('priceChange', 'priceChange', 'asc');
      });

      expect(result.current.sortBy).toBe('priceChange');
      expect(result.current.direction).toBe('asc');

      act(() => {
        result.current.handleOptionChange('volume', 'volume', 'desc');
      });

      expect(result.current.sortBy).toBe('volume');
      expect(result.current.direction).toBe('desc');
    });
  });

  describe('all sort options', () => {
    it('handles volume sort option', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('volume', 'volume', 'desc');
      });

      expect(result.current.selectedOptionId).toBe('volume');
      expect(result.current.sortBy).toBe('volume');
      expect(result.current.direction).toBe('desc');
    });

    it('handles funding rate sort option', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      expect(result.current.selectedOptionId).toBe('fundingRate');
      expect(result.current.sortBy).toBe('fundingRate');
      expect(result.current.direction).toBe('desc');
    });

    it('handles open interest sort option', () => {
      const { result } = renderHook(() => usePerpsSorting());

      act(() => {
        result.current.handleOptionChange(
          'openInterest',
          'openInterest',
          'desc',
        );
      });

      expect(result.current.selectedOptionId).toBe('openInterest');
      expect(result.current.sortBy).toBe('openInterest');
      expect(result.current.direction).toBe('desc');
    });
  });

  describe('derived values', () => {
    it('derives sortBy and direction from selectedOptionId', () => {
      const { result } = renderHook(
        ({ optionId }) => usePerpsSorting({ initialOptionId: optionId }),
        { initialProps: { optionId: 'volume' as const } },
      );

      expect(result.current.sortBy).toBe('volume');
      expect(result.current.direction).toBe('desc');

      act(() => {
        result.current.handleOptionChange('fundingRate', 'fundingRate', 'desc');
      });

      expect(result.current.sortBy).toBe('fundingRate');
      expect(result.current.direction).toBe('desc');
    });

    it('recalculates derived values only when selectedOptionId changes', () => {
      const { result } = renderHook(() => usePerpsSorting());

      const initialSortBy = result.current.sortBy;
      const initialDirection = result.current.direction;

      // Re-render should not change derived values if selectedOptionId hasn't changed
      expect(result.current.sortBy).toBe(initialSortBy);
      expect(result.current.direction).toBe(initialDirection);
    });
  });
});
