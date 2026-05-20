/**
 * useExploreSearchV2 — unit tests
 *
 * Covers:
 * 1. Section order: tokens first, perps (when enabled), then stocks/predictions/sites.
 * 2. Perps omitted when selectPerpsEnabledFlag is false.
 * 3. Debounce: isLoading is true for all sections while query !== debouncedQuery.
 * 4. Predictions section exposes fetchMore, isFetchingMore, hasMore.
 * 5. Non-predictions sections do NOT carry pagination fields.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useExploreSearchV2 } from './useExploreSearchV2';

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
  useStocksFeed: jest.fn(() => ({ data: mockStocksData, isLoading: false })),
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

const renderV2 = (query = '') => renderHook(() => useExploreSearchV2(query));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExploreSearchV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPerpsEnabled = true;
    (useTokensFeed as jest.Mock).mockReturnValue({
      data: mockTokensData,
      isLoading: false,
      loadMore: mockTokensLoadMore,
      isLoadingMore: false,
      hasMore: true,
      totalCount: undefined,
    });
  });

  describe('section order', () => {
    it('includes tokens, perps, stocks, predictions, sites when perps is enabled', () => {
      const { result } = renderV2();
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
      const { result } = renderV2();
      const feedIds = result.current.sections.map((s) => s.feedId);
      expect(feedIds).toEqual(['tokens', 'stocks', 'predictions', 'sites']);
      expect(feedIds).not.toContain('perps');
    });
  });

  describe('section items', () => {
    it('maps feed data to section items correctly', () => {
      const { result } = renderV2();
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
        ({ q }: { q: string }) => useExploreSearchV2(q),
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

      const { result } = renderV2();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.isLoading).toBe(true);
    });
  });

  describe('predictions pagination fields', () => {
    it('exposes fetchMore, isFetchingMore, and hasMore on the predictions section', () => {
      const { result } = renderV2();
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

      const { result } = renderV2();
      const predictionsSection = result.current.sections.find(
        (s) => s.feedId === 'predictions',
      );
      expect(predictionsSection?.hasMore).toBe(false);
    });
  });

  describe('tokens pagination fields', () => {
    it('exposes fetchMore (loadMore), isFetchingMore, and hasMore on the tokens section', () => {
      const { result } = renderV2();
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
        totalCount: undefined,
      });

      const { result } = renderV2();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.hasMore).toBe(false);
    });

    it('forwards totalCount from the tokens feed to the tokens section', () => {
      (useTokensFeed as jest.Mock).mockReturnValue({
        data: mockTokensData,
        isLoading: false,
        loadMore: mockTokensLoadMore,
        isLoadingMore: false,
        hasMore: true,
        totalCount: 2101,
      });

      const { result } = renderV2();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.totalCount).toBe(2101);
    });

    it('passes undefined totalCount when the feed has no totalCount', () => {
      const { result } = renderV2();
      const tokensSection = result.current.sections.find(
        (s) => s.feedId === 'tokens',
      );
      expect(tokensSection?.totalCount).toBeUndefined();
    });
  });

  describe('sections without pagination fields', () => {
    it.each(['perps', 'stocks', 'sites'] as const)(
      '%s section does not carry fetchMore or hasMore',
      (feedId) => {
        const { result } = renderV2();
        const section = result.current.sections.find(
          (s) => s.feedId === feedId,
        );
        expect(section?.fetchMore).toBeUndefined();
        expect(section?.hasMore).toBeUndefined();
        expect(section?.isFetchingMore).toBeUndefined();
      },
    );
  });

  describe('query is passed to feed hooks after debounce', () => {
    it('passes empty string to feeds on initial render', () => {
      renderV2('');
      expect(useTokensFeed).toHaveBeenCalledWith({ query: '' });
      expect(usePerpsFeed).toHaveBeenCalledWith({ query: '' });
      expect(useStocksFeed).toHaveBeenCalledWith({ query: '' });
      expect(usePredictionsFeed).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'trending', query: '' }),
      );
      expect(useSitesFeed).toHaveBeenCalledWith({ query: '' });
    });
  });
});
