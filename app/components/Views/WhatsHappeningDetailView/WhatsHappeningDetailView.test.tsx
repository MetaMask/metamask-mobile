import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsHappeningDetailView, {
  CARD_WIDTH,
} from './WhatsHappeningDetailView';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';

const GAP = 12;
const SNAP_INTERVAL_FOR_TEST = CARD_WIDTH + GAP;

const mockGoBack = jest.fn();
const mockRefresh = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((eventName: string) => ({
  addProperties: jest.fn((properties: Record<string, unknown>) => ({
    build: jest.fn(() => ({ category: eventName, properties })),
  })),
  build: jest.fn(() => ({ category: eventName })),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({ params: { initialIndex: 0 } }),
  };
});

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../Homepage/Sections/WhatsHappening/hooks', () => ({
  useWhatsHappening: jest.fn(() => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  })),
}));

jest.mock('./utils/getRelatedAssetImageSource', () => ({
  getRelatedAssetImageSource: jest.fn(() => undefined),
}));

jest.mock('../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: jest.fn() }),
}));

jest.mock('../../UI/MarketInsights/utils/marketInsightsFormatting', () => ({
  formatRelativeTime: jest.fn(() => 'now'),
  getUniqueSourcesByFavicon: jest.fn(() => []),
}));

jest.mock(
  '../../UI/MarketInsights/components/SourceLogoGroup',
  () => 'SourceLogoGroup',
);

const mockUseWhatsHappening = jest.requireMock(
  '../Homepage/Sections/WhatsHappening/hooks',
).useWhatsHappening;

const mockItem = {
  id: 'trend-0',
  title: 'The Federal Reserve pauses interest rates',
  description: 'Reflecting the current economy.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro' as const,
  impact: 'positive' as const,
  relatedAssets: [],
  articles: [],
};

describe('WhatsHappeningDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title', () => {
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.getByText("What's happening")).toBeOnTheScreen();
  });

  it('renders skeleton carousel while loading', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(
      screen.getByTestId('whats-happening-detail-skeleton'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('whats-happening-detail-carousel')).toBeNull();
  });

  it('renders error state when fetch fails', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
    expect(screen.queryByTestId('whats-happening-detail-carousel')).toBeNull();
  });

  it('calls refresh when error retry button is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the carousel with items when data is available', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    expect(carousel).toBeOnTheScreen();
    // Simulate the carousel measuring its height so cards become visible
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    expect(screen.getByText(mockItem.title)).toBeOnTheScreen();
  });

  it('does not show the skeleton or error when items are loaded', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(screen.queryByTestId('whats-happening-detail-skeleton')).toBeNull();
    expect(screen.queryByText(/unable to load/i)).toBeNull();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByTestId('whats-happening-detail-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('tracks Whats Happening Viewed once for the initial card on mount', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED,
        properties: expect.objectContaining({
          trend_id: mockItem.id,
          card_index: 0,
          trend_category: 'macro',
          trend_impact: 'positive',
          asset_symbols: [],
        }),
      }),
    );
  });

  it('does not fire Viewed more than once for the initial card across re-renders', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    const { rerender } = renderWithProvider(<WhatsHappeningDetailView />);
    rerender(<WhatsHappeningDetailView />);
    const viewedCalls = mockCreateEventBuilder.mock.calls.filter(
      ([name]) =>
        name ===
        (MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED as unknown as string),
    );
    expect(viewedCalls).toHaveLength(1);
  });

  it('tracks Whats Happening Viewed when scrolling to a new card', () => {
    const secondItem = {
      ...mockItem,
      id: 'trend-1',
      title: 'Second trend',
      category: 'social' as const,
      impact: 'negative' as const,
    };
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, secondItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'onMomentumScrollEnd', {
      nativeEvent: { contentOffset: { x: SNAP_INTERVAL_FOR_TEST } },
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED,
        properties: expect.objectContaining({
          trend_id: 'trend-1',
          card_index: 1,
          trend_category: 'social',
          trend_impact: 'negative',
        }),
      }),
    );
  });

  it('does not track Viewed when scroll resolves to same index', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'onMomentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
  });

  it('tracks Whats Happening Closed with the visible card when back is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    fireEvent.press(screen.getByTestId('whats-happening-detail-back-button'));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_DETAILS_CLOSED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.WHATS_HAPPENING_DETAILS_CLOSED,
        properties: expect.objectContaining({
          trend_id: mockItem.id,
          card_index: 0,
        }),
      }),
    );
  });
});
