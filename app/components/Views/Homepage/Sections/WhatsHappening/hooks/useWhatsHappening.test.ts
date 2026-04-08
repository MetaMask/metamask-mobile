import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useWhatsHappening } from './useWhatsHappening';

const mockFetchMarketOverview = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
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
      date: '2026-03-15T10:00:00.000Z',
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

  it('uses article date as item date when articles are present', async () => {
    const { result } = renderHook(() => useWhatsHappening());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items[0].date).toBe(mockTrend.articles[0].date);
  });

  it('falls back to generatedAt when trend has no articles', async () => {
    mockFetchMarketOverview.mockResolvedValue({
      ...mockOverview,
      trends: [{ ...mockTrend, articles: [] }],
    });
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
});
