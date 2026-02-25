import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsView from './MarketInsightsView';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();
const mockUseMarketInsights = jest.fn();
const mockTrendSourcesBottomSheet = jest.fn();
const mockFeedbackBottomSheet = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(
  (eventName: string) =>
    ({
      addProperties: (properties: Record<string, unknown>) => ({
        build: () => ({ category: eventName, properties }),
      }),
    }) as const,
);
const mockUseSwapBridgeNavigation = jest.fn((_options: unknown) => ({
  goToSwaps: mockGoToSwaps,
}));

let mockRouteParams = {
  assetSymbol: 'ETH',
  caip19Id: 'eip155:1/erc20:0x123',
  tokenImageUrl: 'https://example.com/eth.png',
  pricePercentChange: 4.2,
  tokenAddress: '0x123',
  tokenDecimals: 18,
  tokenName: 'Ethereum',
  tokenChainId: '0x1',
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMarketInsights', () => ({
  useMarketInsights: (caip19Id: string) => mockUseMarketInsights(caip19Id),
}));

jest.mock('../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
  },
  useSwapBridgeNavigation: (options: unknown) =>
    mockUseSwapBridgeNavigation(options),
}));

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return () => <MockView testID="avatar-token" />;
  },
);

jest.mock('../../components/MarketInsightsTrendItem', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  const TrendItem = ({
    testID,
    onPress,
  }: {
    testID?: string;
    onPress?: () => void;
  }) => (
    <MockPressable testID={testID ?? 'trend-item'} onPress={onPress}>
      <MockText>trend-item</MockText>
    </MockPressable>
  );
  return TrendItem;
});

jest.mock('../../components/MarketInsightsTweetCard', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  const TweetCard = ({
    testID,
    onPress,
  }: {
    testID?: string;
    onPress?: () => void;
  }) => (
    <MockPressable testID={testID ?? 'tweet-card'} onPress={onPress}>
      <MockText>tweet-card</MockText>
    </MockPressable>
  );
  return TweetCard;
});

jest.mock('../../components/MarketInsightsSourcesFooter', () => {
  const {
    View: MockView,
    Pressable: MockPressable,
    Text: MockText,
  } = jest.requireActual('react-native');

  const SourcesFooter = ({
    testID,
    onSourcePress,
    onThumbsUp,
    onThumbsDown,
  }: {
    testID?: string;
    onSourcePress?: (url: string) => void;
    onThumbsUp?: () => void;
    onThumbsDown?: () => void;
  }) => (
    <MockView testID={testID ?? 'sources-footer'}>
      <MockPressable
        testID="market-insights-source-link-button"
        onPress={() => onSourcePress?.('https://coindesk.com/article-1')}
      >
        <MockText>source-link</MockText>
      </MockPressable>
      <MockPressable
        testID="market-insights-thumbs-up-button"
        onPress={onThumbsUp}
      >
        <MockText>thumbs-up</MockText>
      </MockPressable>
      <MockPressable
        testID="market-insights-thumbs-down-button"
        onPress={onThumbsDown}
      >
        <MockText>thumbs-down</MockText>
      </MockPressable>
    </MockView>
  );

  const SourcesBottomSheet = (
    props: { onSourcePress?: (url: string) => void } | unknown,
  ) => {
    const typedProps = props as { onSourcePress?: (url: string) => void };
    return (
      <MockView testID="market-insights-sources-bottom-sheet">
        <MockPressable
          testID="market-insights-source-link-button"
          onPress={() =>
            typedProps.onSourcePress?.('https://coindesk.com/article-1')
          }
        >
          <MockText>source-link</MockText>
        </MockPressable>
      </MockView>
    );
  };

  return {
    __esModule: true,
    default: SourcesFooter,
    MarketInsightsSourcesBottomSheet: SourcesBottomSheet,
  };
});

jest.mock('../../components/MarketInsightsTrendSourcesBottomSheet', () => {
  const {
    View: MockView,
    Pressable: MockPressable,
    Text: MockText,
  } = jest.requireActual('react-native');
  const TrendSourcesBottomSheet = (
    props: { onSourcePress?: (url: string) => void } | unknown,
  ) => {
    mockTrendSourcesBottomSheet(props);
    const typedProps = props as { onSourcePress?: (url: string) => void };
    return (
      <MockView testID="market-insights-trend-sources-bottom-sheet">
        <MockPressable
          testID="market-insights-trend-source-link-button"
          onPress={() =>
            typedProps.onSourcePress?.('https://www.coindesk.com/article')
          }
        >
          <MockText>trend-source-link</MockText>
        </MockPressable>
      </MockView>
    );
  };
  return TrendSourcesBottomSheet;
});

jest.mock('../../components/MarketInsightsFeedbackBottomSheet', () => {
  const {
    View: MockView,
    Pressable: MockPressable,
    Text: MockText,
  } = jest.requireActual('react-native');
  const FeedbackBottomSheet = (
    props:
      | {
          onSubmit?: (payload: {
            reason: string;
            feedbackText?: string;
          }) => void;
          onClose?: () => void;
        }
      | unknown,
  ) => {
    mockFeedbackBottomSheet(props);
    const typedProps = props as {
      onSubmit?: (payload: { reason: string; feedbackText?: string }) => void;
      onClose?: () => void;
    };
    return (
      <MockView testID="market-insights-feedback-bottom-sheet">
        <MockPressable
          testID="market-insights-feedback-submit-button"
          onPress={() =>
            typedProps.onSubmit?.({
              reason: 'something_else',
              feedbackText: 'Need confidence score',
            })
          }
        >
          <MockText>submit-feedback</MockText>
        </MockPressable>
        <MockPressable
          testID="market-insights-feedback-close-button"
          onPress={typedProps.onClose}
        >
          <MockText>close-feedback</MockText>
        </MockPressable>
      </MockView>
    );
  };
  return {
    __esModule: true,
    default: FeedbackBottomSheet,
    MarketInsightsFeedbackReason: {
      NotRelevant: 'not_relevant',
      NotAccurate: 'not_accurate',
      HardToUnderstand: 'hard_to_understand',
      HarmfulOrOffensive: 'harmful_or_offensive',
      SomethingElse: 'something_else',
    },
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('MarketInsightsView', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.clearAllMocks();
    mockRouteParams = {
      assetSymbol: 'ETH',
      caip19Id: 'eip155:1/erc20:0x123',
      tokenImageUrl: 'https://example.com/eth.png',
      pricePercentChange: 4.2,
      tokenAddress: '0x123',
      tokenDecimals: 18,
      tokenName: 'Ethereum',
      tokenChainId: '0x1',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when market insights report is unavailable', () => {
    mockUseMarketInsights.mockReturnValue({
      report: null,
      isLoading: false,
      error: null,
      timeAgo: '',
    });

    const { queryByTestId } = renderWithProvider(<MarketInsightsView />);
    expect(queryByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER)).toBeNull();
  });

  it('renders report content and handles tweet/trade actions', () => {
    mockUseMarketInsights.mockReturnValue({
      report: {
        asset: 'eth',
        generatedAt: '2026-02-17T11:55:00.000Z',
        headline: 'ETH extends gains',
        summary: 'Momentum improves on macro risk-on signals',
        trends: [
          {
            title: 'ETF inflows',
            description: 'Spot ETF inflows remain elevated',
            articles: [
              {
                title: 'ETF demand remains high',
                source: 'coindesk.com',
                date: '2026-02-17T08:00:00.000Z',
                url: 'https://www.coindesk.com/article',
              },
            ],
            tweets: [
              {
                author: 'alpha',
                contentSummary: 'Flows are positive',
                date: '2026-02-17T10:00:00.000Z',
                url: 'https://x.com/user/status/100',
              },
            ],
          },
          {
            title: 'On-chain demand',
            description: 'Exchange balances continue to drop',
            articles: [],
            tweets: [
              {
                author: 'beta',
                contentSummary: 'Supply is tightening',
                date: '2026-02-17T09:00:00.000Z',
                url: 'https://x.com/user/status/101',
              },
            ],
          },
        ],
        sources: [],
      },
      isLoading: false,
      error: null,
      timeAgo: '5m ago',
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsView />,
    );

    expect(
      getByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${MarketInsightsSelectorsIDs.TREND_ITEM}-0`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${MarketInsightsSelectorsIDs.TWEET_CARD}-0`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MarketInsightsSelectorsIDs.SOURCES_FOOTER),
    ).toBeOnTheScreen();
    expect(getByText('AI summary • Not financial advice')).toBeOnTheScreen();

    fireEvent.press(getByTestId(`${MarketInsightsSelectorsIDs.TWEET_CARD}-0`));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://x.com/user/status/100',
    );

    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.TRADE_BUTTON));
    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePage: 'MarketInsightsView',
        sourceToken: expect.objectContaining({
          address: '0x123',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: '0x1',
        }),
      }),
    );

    fireEvent.press(getByTestId(`${MarketInsightsSelectorsIDs.TREND_ITEM}-0`));
    expect(
      getByTestId('market-insights-trend-sources-bottom-sheet'),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON));
    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON));
    expect(
      getByTestId('market-insights-feedback-bottom-sheet'),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId('market-insights-feedback-submit-button'));
    fireEvent.press(getByTestId('market-insights-open-sources-button'));
    fireEvent.press(getByTestId('market-insights-source-link-button'));
    fireEvent.press(getByTestId('market-insights-trend-source-link-button'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MARKET_INSIGHTS_VIEWED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_VIEWED,
        properties: expect.objectContaining({
          caip19: 'eip155:1/erc20:0x123',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({
          caip19: 'eip155:1/erc20:0x123',
          interaction_type: 'trade',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'thumbs_up',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'thumbs_down',
          feedback_reason: 'something_else',
          feedback_text: 'Need confidence score',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'source_click',
          source: 'https://coindesk.com/article-1',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
        properties: expect.objectContaining({
          interaction_type: 'source_click',
          source: 'https://www.coindesk.com/article',
        }),
      }),
    );
  });

  it('opens trend sources sheet for tweet-only trend and passes tweet sources', () => {
    mockUseMarketInsights.mockReturnValue({
      report: {
        asset: 'eth',
        generatedAt: '2026-02-17T11:55:00.000Z',
        headline: 'ETH extends gains',
        summary: 'Momentum improves on macro risk-on signals',
        trends: [
          {
            title: 'On-chain demand',
            description: 'Exchange balances continue to drop',
            articles: [],
            tweets: [
              {
                author: 'beta',
                contentSummary: 'Supply is tightening',
                date: '2026-02-17T09:00:00.000Z',
                url: 'https://x.com/user/status/101',
              },
            ],
          },
        ],
        sources: [],
      },
      isLoading: false,
      error: null,
      timeAgo: '5m ago',
    });

    const { getByTestId } = renderWithProvider(<MarketInsightsView />);

    fireEvent.press(getByTestId(`${MarketInsightsSelectorsIDs.TREND_ITEM}-0`));

    expect(
      getByTestId('market-insights-trend-sources-bottom-sheet'),
    ).toBeOnTheScreen();
    expect(mockTrendSourcesBottomSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        trendTitle: 'On-chain demand',
        articles: [],
        tweets: [
          expect.objectContaining({
            author: 'beta',
            url: 'https://x.com/user/status/101',
          }),
        ],
      }),
    );
  });

  it('tracks viewed event again when caip19Id changes on mounted view', () => {
    mockUseMarketInsights.mockImplementation((caip19Id: string) => {
      if (caip19Id === 'eip155:1/erc20:0x456') {
        return {
          report: {
            asset: 'usdc',
            generatedAt: '2026-02-17T12:00:00.000Z',
            headline: 'USDC stable',
            summary: 'Stablecoin demand remains steady',
            trends: [],
            sources: [],
          },
          isLoading: false,
          error: null,
          timeAgo: '1m ago',
        };
      }

      return {
        report: {
          asset: 'eth',
          generatedAt: '2026-02-17T11:55:00.000Z',
          headline: 'ETH extends gains',
          summary: 'Momentum improves on macro risk-on signals',
          trends: [],
          sources: [],
        },
        isLoading: false,
        error: null,
        timeAgo: '5m ago',
      };
    });

    const { rerender } = renderWithProvider(<MarketInsightsView />);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_VIEWED,
        properties: expect.objectContaining({
          caip19: 'eip155:1/erc20:0x123',
        }),
      }),
    );

    mockRouteParams = {
      ...mockRouteParams,
      assetSymbol: 'USDC',
      caip19Id: 'eip155:1/erc20:0x456',
      tokenAddress: '0x456',
      tokenName: 'USD Coin',
    };

    rerender(<MarketInsightsView />);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: MetaMetricsEvents.MARKET_INSIGHTS_VIEWED,
        properties: expect.objectContaining({
          caip19: 'eip155:1/erc20:0x456',
        }),
      }),
    );
  });
});
