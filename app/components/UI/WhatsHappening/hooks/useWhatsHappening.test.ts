import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  isWhatsHappeningSectionVisible,
  useWhatsHappening,
} from './useWhatsHappening';

const mockFetchMarketOverview = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AiDigestController: {
        fetchMarketOverview: (...args: unknown[]) =>
          mockFetchMarketOverview(...args),
      },
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

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

describe('useWhatsHappening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockFetchMarketOverview.mockResolvedValue(mockOverview);
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

  it('respects the limit parameter', async () => {
    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends: [mockTrend, mockTrend, mockTrend],
    });
    const { result } = renderHook(() => useWhatsHappening(2));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(2);
  });

  it('sets error and clears items on fetch failure', async () => {
    mockFetchMarketOverview.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBe('Network error');
  });

  it('sets fallback error message for non-Error rejections', async () => {
    mockFetchMarketOverview.mockRejectedValue('unknown');
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch trending items');
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
    const { result } = renderHook(() =>
      useWhatsHappening(5, { enabled: false }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketOverview).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
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
