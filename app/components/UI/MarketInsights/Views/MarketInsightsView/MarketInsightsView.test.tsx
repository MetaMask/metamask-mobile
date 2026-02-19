import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsView from './MarketInsightsView';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();
const mockUseMarketInsights = jest.fn();
const mockUseSwapBridgeNavigation = jest.fn((_options: unknown) => ({
  goToSwaps: mockGoToSwaps,
}));

const mockRouteParams = {
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
  const { View: MockView } = jest.requireActual('react-native');
  const SourcesFooter = ({ testID }: { testID?: string }) => (
    <MockView testID={testID ?? 'sources-footer'} />
  );
  return SourcesFooter;
});

jest.mock('../../components/MarketInsightsTrendSourcesBottomSheet', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const TrendSourcesBottomSheet = () => (
    <MockView testID="market-insights-trend-sources-bottom-sheet" />
  );
  return TrendSourcesBottomSheet;
});

describe('MarketInsightsView', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.clearAllMocks();
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

    const { getByTestId } = renderWithProvider(<MarketInsightsView />);

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
  });
});
