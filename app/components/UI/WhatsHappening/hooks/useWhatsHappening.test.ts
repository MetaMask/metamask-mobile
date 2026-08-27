import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import {
  isWhatsHappeningSectionVisible,
  useWhatsHappening,
  WHATS_HAPPENING_FETCH_FAILED,
} from './useWhatsHappening';

const mockFetchMarketOverview = jest.fn();
const mockFetchFrontPageItem = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AiDigestController: {
        fetchMarketOverview: (...args: unknown[]) =>
          mockFetchMarketOverview(...args),
        fetchFrontPageItem: (...args: unknown[]) =>
          mockFetchFrontPageItem(...args),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;

/**
 * Configures the feature-flag selector the hook reads. The deep-linked
 * outdated item id is now passed via the hook's `outdatedItemId` option, not
 * a selector.
 *
 * @param options - Selector return overrides.
 * @param options.enabled - Value for `selectWhatsHappeningEnabled`.
 */
const configureSelectors = ({ enabled = true }: { enabled?: boolean } = {}) => {
  mockUseSelector.mockReturnValue(enabled);
};

const mockTrend = {
  title: 'Bitcoin ETF inflows hit record high',
  description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
  category: 'macro',
  impact: 'positive',
  relatedAssets: [
    {
      sourceAssetId: 'btc-mainnet',
      symbol: 'BTC',
      name: 'Bitcoin',
      caip19: ['eip155:1/slip44:0'],
    },
  ],
  articles: [
    {
      title: 'Article',
      url: 'https://example.com',
      date: '2026-03-14T08:00:00.000Z',
    },
  ],
};

const mockOverview = {
  generatedAt: '2026-03-15T10:00:00.000Z',
  trends: [mockTrend],
};

const createMockTrends = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...mockTrend,
    title: `${mockTrend.title} ${index + 1}`,
  }));

describe('useWhatsHappening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSelectors();
    mockFetchMarketOverview.mockResolvedValue(mockOverview);
    mockFetchFrontPageItem.mockResolvedValue(null);
  });

  it('starts in loading state when enabled', () => {
    const { result } = renderHook(() => useWhatsHappening());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns mapped items from API on success', async () => {
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe(mockTrend.title);
    expect(result.current.items[0].category).toBe(mockTrend.category);
    expect(result.current.items[0].relatedAssets).toEqual(
      mockTrend.relatedAssets,
    );
    expect(result.current.error).toBeNull();
  });

  it('uses overview generatedAt as item date', async () => {
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items[0].date).toBe(mockOverview.generatedAt);
  });

  it('sets empty items when API returns null', async () => {
    mockFetchMarketOverview.mockResolvedValue(null);
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('sets empty items when trends array is empty', async () => {
    mockFetchMarketOverview.mockResolvedValue({ ...mockOverview, trends: [] });
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
  });

  it('returns all trends from the API without client-side slicing', async () => {
    const trends = createMockTrends(7);
    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends,
    });

    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(trends.length);
  });

  it('sets error and clears items on fetch failure', async () => {
    mockFetchMarketOverview.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBe('Network error');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('sets fallback error flag for non-Error rejections', async () => {
    mockFetchMarketOverview.mockRejectedValue('unknown');
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(WHATS_HAPPENING_FETCH_FAILED);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('does not start loading and returns empty state when disabled', async () => {
    mockUseSelector.mockReturnValue(false);
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketOverview).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches items', async () => {
    const { result } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends: [mockTrend, mockTrend],
    });

    await result.current.refresh();

    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it('resolves refresh promise on unmount during fetch', async () => {
    let resolveOverview: ((value: typeof mockOverview) => void) | undefined;
    mockFetchMarketOverview
      .mockResolvedValueOnce(mockOverview)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveOverview = resolve;
          }),
      );

    const { result, unmount } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let refreshSettled = false;
    const refreshPromise = result.current.refresh().then(() => {
      refreshSettled = true;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    unmount();

    await act(async () => {
      resolveOverview?.(mockOverview);
      await refreshPromise;
    });

    expect(refreshSettled).toBe(true);
  });

  it('resolves a superseded refresh promise when refresh is called again', async () => {
    let resolveFirstRefresh: ((value: typeof mockOverview) => void) | undefined;
    let resolveSecondRefresh:
      | ((value: typeof mockOverview) => void)
      | undefined;
    mockFetchMarketOverview
      .mockResolvedValueOnce(mockOverview)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRefresh = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondRefresh = resolve;
          }),
      );

    const { result } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstRefreshSettled = false;
    const firstRefreshPromise = result.current.refresh().then(() => {
      firstRefreshSettled = true;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    let secondRefreshSettled = false;
    const secondRefreshPromise = result.current.refresh().then(() => {
      secondRefreshSettled = true;
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(firstRefreshSettled).toBe(true);
    expect(secondRefreshSettled).toBe(false);

    await act(async () => {
      resolveSecondRefresh?.(mockOverview);
      await secondRefreshPromise;
    });

    expect(secondRefreshSettled).toBe(true);

    await act(async () => {
      resolveFirstRefresh?.(mockOverview);
      await Promise.resolve();
    });
  });

  it('does not update state after unmount during fetch', async () => {
    let resolveOverview: ((value: typeof mockOverview) => void) | undefined;
    mockFetchMarketOverview.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveOverview = resolve;
        }),
    );

    const { result, unmount } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    unmount();

    await act(async () => {
      resolveOverview?.(mockOverview);
      await Promise.resolve();
    });

    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('returns items and no error when an asset is missing sourceAssetId and name', async () => {
    const assetWithoutOptionalFields = {
      symbol: 'ETH',
      caip19: ['eip155:1/slip44:60'],
      // sourceAssetId intentionally absent
      // name intentionally absent
    };
    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends: [
        {
          ...mockTrend,
          relatedAssets: [assetWithoutOptionalFields],
        },
      ],
    });

    const { result } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.items[0].relatedAssets[0].symbol).toBe('ETH');
    expect(
      result.current.items[0].relatedAssets[0].sourceAssetId,
    ).toBeUndefined();
    expect(result.current.items[0].relatedAssets[0].name).toBeUndefined();
  });

  it('returns empty items and no error when API returns overview with empty trends', async () => {
    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends: [],
    });

    const { result } = renderHook(() => useWhatsHappening());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when enabled option is false', async () => {
    const { result } = renderHook(() => useWhatsHappening({ enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketOverview).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  describe('deep-linked outdated front-page item', () => {
    const mockFrontPage = {
      id: 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      item: {
        title: 'Older headline that dropped out of the report',
        description: 'An older market overview item fetched by id.',
        category: 'regulatory' as const,
        impact: 'negative' as const,
        relatedAssets: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            caip19: ['eip155:1/slip44:60'],
          },
        ],
        articles: [],
      },
      ctaTitle: 'CTA title',
      ctaDescription: 'CTA description',
      createdAt: '2026-02-01T00:00:00.000Z',
    };

    it('prepends the fetched item first, flagged outdated, before the latest items', async () => {
      mockFetchFrontPageItem.mockResolvedValue(mockFrontPage);

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchFrontPageItem).toHaveBeenCalledWith(mockFrontPage.id);
      expect(result.current.items[0].isOutdated).toBe(true);
      expect(result.current.items[0].id).toBe(`front-page-${mockFrontPage.id}`);
      expect(result.current.items[0].title).toBe(mockFrontPage.item.title);
      expect(result.current.items[0].date).toBe(mockFrontPage.createdAt);
      expect(result.current.items[1].title).toBe(mockTrend.title);
      expect(result.current.items[1].isOutdated).toBeUndefined();
    });

    it('shows the item once and unbadged when it is also in the latest feed', async () => {
      const duplicateTrend = { ...mockTrend, title: mockFrontPage.item.title };
      mockFetchFrontPageItem.mockResolvedValue(mockFrontPage);
      mockFetchMarketOverview.mockResolvedValue({
        ...mockOverview,
        trends: [duplicateTrend, mockTrend],
      });

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Appears exactly once, first, and is NOT flagged outdated (it is recent).
      const withTitle = result.current.items.filter(
        (item) => item.title === mockFrontPage.item.title,
      );
      expect(withTitle).toHaveLength(1);
      expect(result.current.items[0].title).toBe(mockFrontPage.item.title);
      expect(result.current.items[0].isOutdated).toBe(false);
      // The non-duplicate latest item is still present.
      expect(
        result.current.items.some((item) => item.title === mockTrend.title),
      ).toBe(true);
    });

    it('matches duplicates case- and whitespace-insensitively', async () => {
      const noisyDuplicate = {
        ...mockTrend,
        title: `  ${mockFrontPage.item.title.replace(/ /gu, '   ').toUpperCase()}  `,
      };
      mockFetchFrontPageItem.mockResolvedValue(mockFrontPage);
      mockFetchMarketOverview.mockResolvedValue({
        ...mockOverview,
        trends: [noisyDuplicate],
      });

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].isOutdated).toBe(false);
    });

    it('keeps all trends when prepending an outdated item', async () => {
      mockFetchFrontPageItem.mockResolvedValue(mockFrontPage);
      mockFetchMarketOverview.mockResolvedValue({
        ...mockOverview,
        trends: [mockTrend, mockTrend],
      });

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].isOutdated).toBe(true);
    });

    it('shows the outdated item even when the market overview is empty', async () => {
      mockFetchFrontPageItem.mockResolvedValue(mockFrontPage);
      mockFetchMarketOverview.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].isOutdated).toBe(true);
    });

    it('falls back to the latest items when the front-page fetch fails', async () => {
      mockFetchFrontPageItem.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].isOutdated).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('falls back to the latest items when the front page is not found', async () => {
      mockFetchFrontPageItem.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useWhatsHappening({ outdatedItemId: mockFrontPage.id }),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].isOutdated).toBeUndefined();
    });

    it('does not fetch a front-page item when no deep-linked id is set', async () => {
      const { result } = renderHook(() => useWhatsHappening());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchFrontPageItem).not.toHaveBeenCalled();
    });
  });
});

describe('isWhatsHappeningSectionVisible', () => {
  it('returns true while loading', () => {
    expect(
      isWhatsHappeningSectionVisible({
        isLoading: true,
        items: [],
        error: null,
      }),
    ).toBe(true);
  });

  it('returns true when items are available', () => {
    expect(
      isWhatsHappeningSectionVisible({
        isLoading: false,
        items: [{ id: 'trend-0' } as never],
        error: null,
      }),
    ).toBe(true);
  });

  it('returns true when an error is present', () => {
    expect(
      isWhatsHappeningSectionVisible({
        isLoading: false,
        items: [],
        error: 'Network error',
      }),
    ).toBe(true);
  });

  it('returns false for an empty loaded feed without error', () => {
    expect(
      isWhatsHappeningSectionVisible({
        isLoading: false,
        items: [],
        error: null,
      }),
    ).toBe(false);
  });
});
