import React from 'react';
import { Pressable, View } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsHappeningExpandedCard from './components/WhatsHappeningExpandedCard';
import WhatsHappeningSourcesBottomSheet from './components/WhatsHappeningSourcesBottomSheet';
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('./components/WhatsHappeningExpandedCard', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./components/WhatsHappeningSourcesBottomSheet', () => ({
  __esModule: true,
  default: jest.fn(),
}));

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

const mockNav = jest.requireMock('@react-navigation/native');
const mockUseRoute = mockNav.useRoute as jest.Mock;
const mockUseNavigation = mockNav.useNavigation as jest.Mock;

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
    mockUseRoute.mockReturnValue({
      params: { initialIndex: 0, source: 'homepage' },
    });
    mockUseNavigation.mockReturnValue({ goBack: mockGoBack });

    (WhatsHappeningExpandedCard as unknown as jest.Mock).mockImplementation(
      ({
        onSourcesPress,
      }: {
        onSourcesPress?: (articles: unknown[]) => void;
      }) => (
        <Pressable
          testID="mock-expanded-card"
          onPress={() =>
            onSourcesPress?.([
              {
                title: 'Test',
                source: 'coindesk.com',
                url: 'https://coindesk.com/test',
                date: '2026-03-15T10:00:00.000Z',
              },
            ])
          }
        />
      ),
    );

    (
      WhatsHappeningSourcesBottomSheet as unknown as jest.Mock
    ).mockImplementation(({ onClose }: { onClose: () => void }) => (
      <View testID="mock-sources-bottom-sheet">
        <Pressable testID="mock-sources-close" onPress={onClose} />
      </View>
    ));
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
    expect(screen.getByTestId('mock-expanded-card')).toBeOnTheScreen();
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
          source: 'homepage',
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
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: SNAP_INTERVAL_FOR_TEST, y: 0 } },
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
          source: 'homepage',
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
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
  });

  it('tracks MARKET_INSIGHTS_INTERACTION pan event when swiping to a new card', () => {
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
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: SNAP_INTERVAL_FOR_TEST, y: 0 } },
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({ interaction_type: 'pan' }),
      }),
    );
  });

  it('does not track pan event when momentum scroll resolves to the same card index', () => {
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
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
    );
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
          source: 'homepage',
        }),
      }),
    );
  });

  it('shows the sources bottom sheet when onSourcesPress is called from a card', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    fireEvent.press(screen.getByTestId('mock-expanded-card'));
    expect(screen.getByTestId('mock-sources-bottom-sheet')).toBeOnTheScreen();
  });

  it('hides the sources bottom sheet when onClose is called', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    fireEvent.press(screen.getByTestId('mock-expanded-card'));
    expect(screen.getByTestId('mock-sources-bottom-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mock-sources-close'));
    expect(screen.queryByTestId('mock-sources-bottom-sheet')).toBeNull();
  });

  it('updates the active page indicator dot when the carousel is scrolled', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [
        mockItem,
        { ...mockItem, id: 'trend-1' },
        { ...mockItem, id: 'trend-2' },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    fireEvent(carousel, 'scroll', {
      nativeEvent: { contentOffset: { x: 343, y: 0 } },
    });
    expect(screen.getByTestId('page-indicator-dot-active')).toBeOnTheScreen();
    const inactiveDots = screen.getAllByTestId('page-indicator-dot');
    expect(inactiveDots.length).toBe(2);
  });

  it('scrolls to initialIndex once content is wide enough', () => {
    mockUseRoute.mockReturnValue({ params: { initialIndex: 1 } });
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, { ...mockItem, id: 'trend-1' }],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningDetailView />);
    const carousel = screen.getByTestId('whats-happening-detail-carousel');
    fireEvent(carousel, 'layout', {
      nativeEvent: { layout: { height: 600, width: 375, x: 0, y: 0 } },
    });
    expect(() =>
      fireEvent(carousel, 'contentSizeChange', 700, 600),
    ).not.toThrow();
  });
});
