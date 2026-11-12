import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import WhatsHappeningSection from './WhatsHappeningSection';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import {
  WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
  WHATS_HAPPENING_CARD_WIDTH,
  WHATS_HAPPENING_CAROUSEL_GAP,
  WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING,
  WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE,
  WhatsHappeningInteractionType,
  WhatsHappeningSource,
  WhatsHappeningView,
} from './constants';
import { WhatsHappeningSelectorsIDs } from './WhatsHappening.testIds';

const mockTrace = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(
  AnalyticsEventBuilder.createEventBuilder,
);
let mockNotifySectionVisible: (() => void) | null = null;
let mockHoldSectionBelowFold = false;
const mockUseViewportTracking = jest.fn();

jest.mock('../MarketInsights/hooks/useViewportTracking', () => ({
  useViewportTracking: (
    onVisible: () => void,
    areaThreshold?: number,
    context?: { emitTrace?: boolean },
  ): { ref: { current: null }; onLayout: () => void } => {
    mockUseViewportTracking(onVisible, areaThreshold, context);
    mockNotifySectionVisible = onVisible;
    return {
      ref: { current: null },
      onLayout: (): void => {
        if (!mockHoldSectionBelowFold) {
          onVisible();
        }
      },
    };
  },
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('../../../selectors/featureFlagController/whatsHappening', () => ({
  selectWhatsHappeningEnabled: jest.fn(() => true),
}));

jest.mock('./hooks', () => ({
  ...jest.requireActual('./hooks'),
  useWhatsHappening: jest.fn(() => ({
    items: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock(
  '../MarketInsights/components/MarketInsightsEntryCard/MarketInsightsDisclaimerBottomSheet',
  () => ({
    __esModule: true,
    default: ({ onClose }: { onClose: () => void }) => {
      const { View, Pressable } = jest.requireActual('react-native');
      return (
        <View testID="mock-ai-disclaimer-bottom-sheet">
          <Pressable testID="mock-ai-disclaimer-close" onPress={onClose} />
        </View>
      );
    },
  }),
);
const mockUseWhatsHappening = jest.requireMock('./hooks').useWhatsHappening;
const mockSelectWhatsHappeningEnabled = jest.requireMock(
  '../../../selectors/featureFlagController/whatsHappening',
).selectWhatsHappeningEnabled;

const mockItem = {
  id: 'trend-0',
  title: 'Bitcoin ETF inflows hit record high',
  description: 'Spot Bitcoin ETFs recorded over $1.2B in net inflows.',
  date: '2026-03-15T10:00:00.000Z',
  category: 'macro' as const,
  impact: 'positive' as const,
  relatedAssets: [],
  articles: [],
};

const defaultProps = {
  source: 'homepage' as const,
};

describe('WhatsHappeningSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHoldSectionBelowFold = false;
    mockNotifySectionVisible = null;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockSelectWhatsHappeningEnabled.mockImplementation(() => true);
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('passes carousel telemetry context to the feed observer', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);

    expect(mockUseWhatsHappening).toHaveBeenCalledWith({
      enabled: true,
      telemetryContext: { source: 'homepage', stage: 'carousel' },
    });
  });

  it('returns null when feature flag is disabled', () => {
    mockSelectWhatsHappeningEnabled.mockImplementation(() => false);
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeNull();
  });

  it('returns null when not loading and items are empty', () => {
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeNull();
  });

  it('renders null (not ErrorState) when items are empty but there is no error', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(screen.queryByText(/unable to load/i)).toBeNull();
    expect(
      screen.queryByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeNull();
  });

  it('renders skeleton cards while loading', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeOnTheScreen();
  });

  it('renders item cards when data is available', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeOnTheScreen();
    expect(screen.getByText(mockItem.title)).toBeOnTheScreen();
  });

  it('renders the AI generated label as a section subtitle when items are available', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(screen.getByText('AI generated')).toBeOnTheScreen();
    expect(
      screen.getByTestId(WhatsHappeningSelectorsIDs.AI_GENERATED_LABEL),
    ).toBeOnTheScreen();
  });

  it('opens the AI disclaimer bottom sheet when the info button is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(WhatsHappeningSelectorsIDs.AI_GENERATED_LABEL),
    );

    expect(
      screen.getByTestId('mock-ai-disclaimer-bottom-sheet'),
    ).toBeOnTheScreen();
  });

  it('hides the AI disclaimer bottom sheet when onClose is called', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(
      screen.getByTestId(WhatsHappeningSelectorsIDs.AI_GENERATED_LABEL),
    );
    fireEvent.press(screen.getByTestId('mock-ai-disclaimer-close'));

    expect(screen.queryByTestId('mock-ai-disclaimer-bottom-sheet')).toBeNull();
  });

  it('does not render the AI generated label while loading', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(screen.queryByText('AI generated')).toBeNull();
  });

  it('renders error state when fetch fails', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    expect(
      screen.queryByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
    ).toBeNull();
    expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
  });

  it('calls refresh when error retry button is pressed', () => {
    const mockRefresh = jest.fn();
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: 'Network error',
      refresh: mockRefresh,
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('navigates to detail view at index 0 when a card is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(mockItem.title));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: 0,
      source: 'homepage',
    });
    expect(mockTrace).toHaveBeenCalledWith({
      name: "What's Happening View Load",
      op: 'whats_happening.load',
      id: 'homepage:expanded',
      tags: {
        feature: 'whats_happening',
        source: 'homepage',
        stage: 'expanded',
        cache_state: 'warm',
      },
    });
  });

  it('navigates to detail view at index 0 when ViewMore card is pressed', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(/view more/i));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: 0,
      source: 'homepage',
    });
  });

  it('navigates with correct index when second card is pressed', () => {
    const secondItem = {
      ...mockItem,
      id: 'trend-1',
      title: 'Ethereum Pectra upgrade',
    };
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, secondItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    fireEvent.press(screen.getByText(secondItem.title));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: 1,
      source: 'homepage',
    });
  });

  it('tracks WHATS_HAPPENING_INTERACTED pan event when carousel swipes to a new card', () => {
    const secondItem = { ...mockItem, id: 'trend-1', title: 'Second trend' };
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem, secondItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    const carousel = screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL);
    // CARD_WIDTH = 280, GAP = 12 → offset for index 1 = 292
    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 292, y: 0 } },
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.WHATS_HAPPENING_INTERACTED.category,
        properties: expect.objectContaining({
          interaction_type: WhatsHappeningInteractionType.Pan,
          view: WhatsHappeningView.Carousel,
          trend_id: secondItem.id,
          card_index: 1,
          source: WhatsHappeningSource.Homepage,
        }),
      }),
    );
  });

  it('does not track pan event when momentum scroll resolves to the same card index', () => {
    mockUseWhatsHappening.mockReturnValue({
      items: [mockItem],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    const carousel = screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL);

    fireEvent(carousel, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.WHATS_HAPPENING_INTERACTED,
    );
  });

  describe('without section-tracking props (Perps context)', () => {
    it('renders correctly when source is Perps', () => {
      mockUseWhatsHappening.mockReturnValue({
        items: [mockItem],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });
      renderWithProvider(
        <WhatsHappeningSection source={WhatsHappeningSource.Perps} />,
      );
      expect(
        screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
      ).toBeOnTheScreen();
    });

    it('renders error state correctly when source is Perps', () => {
      mockUseWhatsHappening.mockReturnValue({
        items: [],
        isLoading: false,
        error: 'Network error',
        refresh: jest.fn(),
      });
      renderWithProvider(
        <WhatsHappeningSection source={WhatsHappeningSource.Perps} />,
      );
      expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
    });
  });

  describe('carousel card view analytics', () => {
    const cardStride =
      WHATS_HAPPENING_CARD_WIDTH + WHATS_HAPPENING_CAROUSEL_GAP;
    const cardStart = (index: number): number =>
      WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING + index * cardStride;
    const halfCardWidth =
      WHATS_HAPPENING_CARD_WIDTH * WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD;
    const viewportShowingFirstTwoCards = cardStart(1) + halfCardWidth;
    const offsetWhereCardTwoReachesHalf =
      cardStart(2) + halfCardWidth - viewportShowingFirstTwoCards;
    const fiveItems = Array.from({ length: 5 }, (_, index) => ({
      ...mockItem,
      id: `trend-${index}`,
      title: `Trend ${index}`,
    }));

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null;

    const scrolledToViewEvents = (): Record<string, unknown>[] =>
      mockTrackEvent.mock.calls.flatMap(([event]) => {
        if (
          !isRecord(event) ||
          event.name !==
            MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW.category
        ) {
          return [];
        }

        return [event];
      });

    const layoutCarousel = (width: number): void => {
      fireEvent(
        screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
        'layout',
        {
          nativeEvent: { layout: { x: 0, y: 0, width, height: 240 } },
        },
      );
    };

    const scrollCarousel = (offsetX: number, width: number): void => {
      fireEvent.scroll(
        screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL),
        {
          nativeEvent: {
            contentOffset: { x: offsetX, y: 0 },
            contentSize: { width: 2000, height: 240 },
            layoutMeasurement: { width, height: 240 },
          },
        },
      );
    };

    const renderLoadedCarousel = (): void => {
      mockUseWhatsHappening.mockReturnValue({
        items: fiveItems,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });
      renderWithProvider(<WhatsHappeningSection {...defaultProps} />);
    };

    it('throttles carousel scroll events', () => {
      renderLoadedCarousel();

      expect(
        screen.getByTestId(WhatsHappeningSelectorsIDs.CAROUSEL).props
          .scrollEventThrottle,
      ).toBe(WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE);
    });

    it('fires Whats Happening Card Scrolled to View only for cards at least half visible on layout', () => {
      renderLoadedCarousel();

      layoutCarousel(viewportShowingFirstTwoCards);

      const events = scrolledToViewEvents();
      expect(events.map((event) => event.properties)).toEqual([
        {
          trend_id: 'trend-0',
          card_index: 0,
          trend_category: 'macro',
          trend_impact: 'positive',
          asset_symbols: [],
          source: 'homepage',
        },
        {
          trend_id: 'trend-1',
          card_index: 1,
          trend_category: 'macro',
          trend_impact: 'positive',
          asset_symbols: [],
          source: 'homepage',
        },
      ]);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(2);
    });

    it('fires the view event for on-screen cards when the feed arrives after layout', () => {
      mockUseWhatsHappening.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });
      const { rerender } = renderWithProvider(
        <WhatsHappeningSection {...defaultProps} />,
      );

      layoutCarousel(viewportShowingFirstTwoCards);

      expect(scrolledToViewEvents()).toHaveLength(0);

      mockUseWhatsHappening.mockReturnValue({
        items: fiveItems,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });
      rerender(<WhatsHappeningSection {...defaultProps} />);

      expect(scrolledToViewEvents().map((event) => event.properties)).toEqual([
        expect.objectContaining({ trend_id: 'trend-0', card_index: 0 }),
        expect.objectContaining({ trend_id: 'trend-1', card_index: 1 }),
      ]);
    });

    it('fires the view event once when a later card scrolls to half width', () => {
      renderLoadedCarousel();
      layoutCarousel(viewportShowingFirstTwoCards);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      scrollCarousel(
        offsetWhereCardTwoReachesHalf - 1,
        viewportShowingFirstTwoCards,
      );

      expect(scrolledToViewEvents()).toHaveLength(0);

      scrollCarousel(
        offsetWhereCardTwoReachesHalf,
        viewportShowingFirstTwoCards,
      );

      expect(scrolledToViewEvents().map((event) => event.properties)).toEqual([
        expect.objectContaining({
          trend_id: 'trend-2',
          card_index: 2,
          source: 'homepage',
        }),
      ]);

      scrollCarousel(
        offsetWhereCardTwoReachesHalf + cardStride - 1,
        viewportShowingFirstTwoCards,
      );
      scrollCarousel(
        offsetWhereCardTwoReachesHalf,
        viewportShowingFirstTwoCards,
      );

      expect(scrolledToViewEvents()).toHaveLength(1);
    });

    it('does not fire view events while the section is below the fold, then fires only the horizontally visible cards', () => {
      mockHoldSectionBelowFold = true;
      renderLoadedCarousel();
      layoutCarousel(viewportShowingFirstTwoCards);
      scrollCarousel(
        offsetWhereCardTwoReachesHalf,
        viewportShowingFirstTwoCards,
      );

      expect(scrolledToViewEvents()).toHaveLength(0);
      expect(mockUseViewportTracking).toHaveBeenCalledWith(
        expect.any(Function),
        WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
        expect.objectContaining({ emitTrace: false }),
      );

      mockNotifySectionVisible?.();

      expect(scrolledToViewEvents().map((event) => event.properties)).toEqual([
        expect.objectContaining({ trend_id: 'trend-1', card_index: 1 }),
        expect.objectContaining({ trend_id: 'trend-2', card_index: 2 }),
      ]);

      mockNotifySectionVisible?.();

      expect(scrolledToViewEvents()).toHaveLength(2);
    });
  });
});
