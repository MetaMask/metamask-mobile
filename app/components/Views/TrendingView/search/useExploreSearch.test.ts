/**
 * useExploreSearch — unit tests
 *
 * Covers:
 * 1. Section order: tokens first, perps (when enabled), then stocks/predictions/sites.
 * 2. Perps omitted when selectPerpsEnabledFlag is false.
 * 3. Debounce: isLoading is true for all sections while query !== debouncedQuery.
 * 4. Tokens, stocks, and predictions expose pagination fields when supported.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useExploreSearch } from './useExploreSearch';

// ---------------------------------------------------------------------------
// Feed hook mocks
// ---------------------------------------------------------------------------

const mockTokensData = [{ assetId: 'token-1' }];
const mockPerpsData = [{ market: { symbol: 'BTC' } }];
const mockStocksData = [{ assetId: 'stock-1' }];
const mockPredictionsData = [{ id: 'pred-1' }];
const mockSitesData = [{ url: 'https://example.com' }];
const mockFetchMore = jest.fn();
const mockTokensLoadMore = jest.fn();
const mockStocksLoadMore = jest.fn();

jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: jest.fn(() => ({
    data: mockTokensData,
    isLoading: false,
    loadMore: mockTokensLoadMore,
    isLoadingMore: false,
    hasMore: true,
  })),
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: jest.fn(() => ({ data: mockPerpsData, isLoading: false })),
}));

jest.mock('../feeds/stocks/useStocksFeed', () => ({
  useStocksFeed: jest.fn(() => ({
    data: mockStocksData,
    isLoading: false,
    loadMore: undefined,
    isLoadingMore: undefined,
    hasMore: undefined,
    totalCount: undefined,
  })),
}));

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: jest.fn(() => ({
    data: mockPredictionsData,
    isLoading: false,
    fetchMore: mockFetchMore,
    isFetchingMore: false,
    hasMore: true,
  })),
}));

jest.mock('../feeds/sites/useSitesFeed', () => ({
  useSitesFeed: jest.fn(() => ({ data: mockSitesData, isLoading: false })),
}));

// ---------------------------------------------------------------------------
// Redux / selector mocks
// ---------------------------------------------------------------------------

let mockIsPerpsEnabled = true;

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (s: unknown) => unknown) =>
    selector({ perpsEnabled: mockIsPerpsEnabled }),
  ),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: (state: { perpsEnabled: boolean }) =>
    state.perpsEnabled,
}));

// ---------------------------------------------------------------------------
// i18n mock — return the key suffix so tests are readable
// ---------------------------------------------------------------------------

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useSitesFeed } from '../feeds/sites/useSitesFeed';

const renderExploreSearch = (query = '') =>
  renderHook(() => useExploreSearch(query, { exposePagination: true }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExploreSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPerpsEnabled = true;
    (useTokensFeed as jest.Mock).mockReturnValue({
      data: mockTokensData,
      isLoading: false,
      loadMore: mockTokensLoadMore,
      isLoadingMore: false,
      hasMore: true,
    });
  });

  describe('section order', () => {
    it('includes tokens, perps, stocks, predictions, sites when perps is enabled', () => {
      const { result } = renderExploreSearch();
      const feedIds = result.current.sections.map((s) => s.feedId);
      expect(feedIds).toEqual([
        'tokens',
        'perps',
        'stocks',
        'predictions',
        'sites',
      ]);
    });

    it('omits perps when selectPerpsEnabledFlag is false', () => {
      mockIsPerpsEnabled = false;
      const { result } = renderExploreSearch();
      const feedIds = result.current.sections.map((s) => s.feedId);
      expect(feedIds).toEqual(['tokens', 'stocks', 'predictions', 'sites']);
      expect(feedIds).not.toContain('perps');
    });
  });

  describe('section items', () => {
    it('maps feed data to section items correctly', () => {
      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      const perpsSection = result.current.sections.find(
        (s) => s.feedId === 'perps',
      );
      const stocksSection = result.current.sections.find(
        (s) => s.feedId === 'stocks',
      );
      const sitesSection = result.current.sections.find(
        (s) => s.feedId === 'sites',
      );

      expect(tokensSection?.items).toEqual(mockTokensData);
      // perps items are mapped to d.market
      expect(perpsSection?.items).toEqual([mockPerpsData[0].market]);
      expect(stocksSection?.items).toEqual(mockStocksData);
      expect(sitesSection?.items).toEqual(mockSitesData);
    });
  });

  describe('debounce loading state', () => {
    it('marks all sections as isLoading while query is debouncing', async () => {
      jest.useFakeTimers();

      const { result, rerender } = renderHook(
        ({ q }: { q: string }) =>
          useExploreSearch(q, { exposePagination: true }),
        { initialProps: { q: '' } },
      );

      // Change query — debouncedQuery hasn't caught up yet
      rerender({ q: 'eth' });

      // isDebouncing = true → all sections should have isLoading: true
      result.current.sections.forEach((section) => {
        expect(section.isLoading).toBe(true);
      });

      // Advance past debounce timeout
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // After debounce, isLoading should reflect feed loading state (false in mocks)
      result.current.sections.forEach((section) => {
        expect(section.isLoading).toBe(false);
      });

      jest.useRealTimers();
    });

    it('reflects feed isLoading when not debouncing', () => {
      (useTokensFeed as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
      });

      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.isLoading).toBe(true);
    });
  });

  describe('predictions pagination fields', () => {
    it('exposes fetchMore, isFetchingMore, and hasMore on the predictions section without a query', () => {
      const { result } = renderExploreSearch();
      const predictionsSection = result.current.sections.find(
        (s) => s.feedId === 'predictions',
      );
      expect(predictionsSection?.fetchMore).toBe(mockFetchMore);
      expect(predictionsSection?.isFetchingMore).toBe(false);
      expect(predictionsSection?.hasMore).toBe(true);
    });

    it('reflects updated hasMore from the predictions feed', () => {
      (usePredictionsFeed as jest.Mock).mockReturnValue({
        data: mockPredictionsData,
        isLoading: false,
        fetchMore: mockFetchMore,
        isFetchingMore: false,
        hasMore: false,
      });

      const { result } = renderExploreSearch();
      const predictionsSection = result.current.sections.find(
        (s) => s.feedId === 'predictions',
      );
      expect(predictionsSection?.hasMore).toBe(false);
    });

    it('exposes fetchMore, isFetchingMore, and hasMore on predictions when a search query is active', () => {
      jest.useFakeTimers();

      const mockSearchFetchMore = jest.fn();

      (usePredictionsFeed as jest.Mock).mockReturnValue({
        data: mockPredictionsData,
        isLoading: false,
        fetchMore: mockSearchFetchMore,
        isFetchingMore: false,
        hasMore: true,
      });

      const { result } = renderHook(() =>
        useExploreSearch('bitcoin', { exposePagination: true }),
      );

      act(() => {
        jest.advanceTimersByTime(250);
      });

      const predictionsSection = result.current.sections.find(
        (s) => s.feedId === 'predictions',
      );

      expect(predictionsSection?.fetchMore).toBe(mockSearchFetchMore);
      expect(predictionsSection?.isFetchingMore).toBe(false);
      expect(predictionsSection?.hasMore).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('tokens pagination fields', () => {
    it('exposes fetchMore, isFetchingMore, and hasMore on the tokens section', () => {
      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.fetchMore).toBe(mockTokensLoadMore);
      expect(tokensSection?.isFetchingMore).toBe(false);
      expect(tokensSection?.hasMore).toBe(true);
    });

    it('reflects updated hasMore from the tokens feed', () => {
      (useTokensFeed as jest.Mock).mockReturnValue({
        data: mockTokensData,
        isLoading: false,
        loadMore: mockTokensLoadMore,
        isLoadingMore: false,
        hasMore: false,
      });

      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.hasMore).toBe(false);
    });

    it('forwards totalCount from the tokens feed as section.total', () => {
      (useTokensFeed as jest.Mock).mockReturnValue({
        data: mockTokensData,
        isLoading: false,
        loadMore: mockTokensLoadMore,
        isLoadingMore: false,
        hasMore: true,
        totalCount: 2101,
      });

      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.total).toBe(2101);
    });

    it('passes undefined total when the tokens feed has no totalCount', () => {
      const { result } = renderExploreSearch();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.total).toBeUndefined();
    });
  });

  describe('sections without pagination fields', () => {
    it.each(['perps', 'sites'] as const)(
      '%s section does not carry fetchMore or hasMore',
      (feedId) => {
        const { result } = renderExploreSearch();
        const section = result.current.sections.find(
          (s) => s.feedId === feedId,
        );
        expect(section?.fetchMore).toBeUndefined();
        expect(section?.hasMore).toBeUndefined();
        expect(section?.isFetchingMore).toBeUndefined();
      },
    );
  });

  describe('stocks pagination fields', () => {
    it('forwards pagination metadata from the stocks feed when searching', () => {
      (useStocksFeed as jest.Mock).mockReturnValue({
        data: mockStocksData,
        isLoading: false,
        loadMore: mockStocksLoadMore,
        isLoadingMore: true,
        hasMore: true,
        totalCount: 12,
      });

      const { result } = renderExploreSearch('appl');
      const stocksSection = result.current.sections.find(
        (s) => s.feedId === 'stocks',
      );

      expect(stocksSection?.fetchMore).toBe(mockStocksLoadMore);
      expect(stocksSection?.isFetchingMore).toBe(true);
      expect(stocksSection?.hasMore).toBe(true);
      expect(stocksSection?.total).toBe(12);
    });
  });

  describe('query is passed to feed hooks after debounce', () => {
    it('passes empty string to feeds on initial render', () => {
      renderExploreSearch('');
      expect(useTokensFeed).toHaveBeenCalledWith({ query: '' });
      expect(usePerpsFeed).toHaveBeenCalledWith({ query: '' });
      expect(useStocksFeed).toHaveBeenCalledWith({ query: '' });
      expect(usePredictionsFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'trending',
          query: '',
        }),
      );
      expect(useSitesFeed).toHaveBeenCalledWith({ query: '' });
    });
  });
});
