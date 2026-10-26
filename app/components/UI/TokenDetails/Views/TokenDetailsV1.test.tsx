import React from 'react';
import { ScrollView, type LayoutChangeEvent } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';

import {
  TokenDetailsV1,
  TOKEN_DETAILS_V1_TEST_ID,
  TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID,
  TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID,
  TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID,
  TOKEN_DETAILS_TAB_BAR_STICKY_INDEX,
  resolveSwipeTargetTab,
} from './TokenDetailsV1';
import {
  TOKEN_DETAILS_V1_TABS,
  TokenDetailsSource,
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
  type TokenDetailsV1TabKey,
} from '../constants/constants';
import {
  selectMemecoinTdpV1TabConfigOrder,
  selectMemecoinTdpV1TokenApiBaseUrl,
} from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import {
  LIVE_PRICE_HEADER_TEST_ID,
  LIVE_PRICE_SCROLL_THRESHOLD_PX,
} from '../hooks/useLivePriceHeaderDescription';
import type { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';
import { SecurityTabSelectors } from '../components/V1/SecurityTab/SecurityTab.testIds';
import { TokenExplainerSheetSelectors } from '../components/V1/TokenExplainerSheet/TokenExplainerSheet.testIds';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
import { StatBarSelectors } from '../components/V1/StatBar/StatBar.testIds';
import { TokenStatKey } from '../constants/tokenStats';
import Routes from '../../../../constants/navigation/Routes';
import { useSocialFeed } from '../../SocialFeed';
import { mapFeedItem } from '../../SocialFeed/utils/mapFeedItem';
import { TOKEN_HOLDERS_FIXTURE } from '../components/tabs/holders/tokenHolders.fixture';
import type { SocialV1FeedPost } from '../../SocialFeed/types';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => undefined),
}));

const mockUseSocialFeed = jest.mocked(useSocialFeed);

const PROD_TOKEN_API_BASE_URL = 'https://token.api.cx.metamask.io';

/**
 * Answers the selectors this page reads, so a test only has to name the ones
 * it cares about. The tab config and the token API host come from remote
 * config and have no usable `undefined` case, so they always resolve to the
 * same defaults the selectors themselves fall back to.
 */
const mockSelectors = ({
  socialEnabled = false,
  tabConfigOrder = TOKEN_DETAILS_V1_TABS,
  tokenApiBaseUrl = PROD_TOKEN_API_BASE_URL,
}: {
  socialEnabled?: boolean;
  tabConfigOrder?: TokenDetailsV1TabKey[];
  tokenApiBaseUrl?: string;
} = {}) => {
  const { useSelector } = jest.requireMock('react-redux') as {
    useSelector: jest.Mock;
  };

  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectSocialLeaderboardEnabled) {
      return socialEnabled;
    }
    if (selector === selectMemecoinTdpV1TabConfigOrder) {
      return tabConfigOrder;
    }
    if (selector === selectMemecoinTdpV1TokenApiBaseUrl) {
      return tokenApiBaseUrl;
    }
    return undefined;
  });
};

// Keeps the Holders tab off React Query, like the other data hooks here. The
// list itself is covered in `HoldersTab.test.tsx` / its integration test.
const holdersState = (overrides: Record<string, unknown> = {}) => ({
  rows: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn(),
  ...overrides,
});

jest.mock('../components/tabs/holders/useTokenHolders', () => ({
  useTokenHolders: jest.fn(() => ({
    rows: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(),
  })),
}));

const mockUseTokenHolders = jest.requireMock(
  '../components/tabs/holders/useTokenHolders',
).useTokenHolders as jest.Mock;

/**
 * One holder is enough: the tab's visibility turns on the row count. Built
 * from the fixture so the row the tab renders is a real mapped position.
 */
const withHolders = (overrides: Record<string, unknown> = {}) => {
  const core = TOKEN_HOLDERS_FIXTURE.items[0];
  const item = mapFeedItem(core);
  return mockUseTokenHolders.mockReturnValue(
    holdersState({ rows: [{ item, core }], ...overrides }),
  );
};

jest.mock('../../SocialFeed', () => {
  const useSocialFeedMock = jest.fn((_source: unknown) => ({
    posts: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(),
  }));
  return {
    useSocialFeed: useSocialFeedMock,
    SocialFeed: () => null,
    SocialFeedSurfaceProvider: ({ children }: { children?: React.ReactNode }) =>
      children ?? null,
    SocialV1FeedPostList: () => null,
    SocialFeedPostShell: () => null,
    SocialFeedSkeleton: () => null,
    SocialFeedEmpty: () => null,
    SocialFeedError: () => null,
  };
});

jest.mock('../components/tabs/TokenDetailsFeed', () => {
  const { Pressable: FeedPressable } = jest.requireActual('react-native');
  const { useSocialFeed: useFeed } = jest.requireMock('../../SocialFeed');
  const { mockOpenSpotFeedItem } = jest.requireActual(
    '../../SocialFeed/mocks/socialV1Feed.mock',
  );
  return {
    TokenDetailsFeed: ({
      source,
      onCopyTrade,
    }: {
      source: { kind: 'token'; assetId: string };
      onCopyTrade?: (item: unknown, commentId?: string) => void;
    }) => {
      useFeed(source);
      return (
        <FeedPressable
          testID="mock-feed-copy-trade"
          onPress={() =>
            onCopyTrade?.(
              mockOpenSpotFeedItem({
                asset: {
                  symbol: 'PEPE',
                  avatar: {
                    positionId: 'pos-pepe',
                    chain: 'ethereum',
                    tokenAddress:
                      ' 0x6982508145454ce325ddbe47a25d4ec3d2311933 ',
                    tokenImageUrl: null,
                    tokenSymbol: 'PEPE',
                  },
                },
              }),
              'comment-1',
            )
          }
        />
      );
    },
  };
});

const mockQuickBuyRoot = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('../../QuickBuy', () => ({
  QuickBuy: {
    Root: (props: Record<string, unknown>) => mockQuickBuyRoot(props),
  },
  TOP_TRADERS_QUICK_BUY_FEATURES: {},
}));

const lastQuickBuyProps = () =>
  mockQuickBuyRoot.mock.calls[mockQuickBuyRoot.mock.calls.length - 1][0];

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics');

let mockCurrentPrice = 1;
jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    currentPrice: mockCurrentPrice,
    priceDiff: 0,
    comparePrice: 1,
    prices: {},
    isLoading: false,
    timePeriod: '1d',
    setTimePeriod: jest.fn(),
    chartNavigationButtons: [],
    currentCurrency: 'usd',
    hasInsufficientCoverage: false,
  }),
}));

// Stubbed for the same reason as `useTokenPrice`: this is a view test, and no
// case here asserts anything about market data. It also keeps the suite off
// React Query, which the real hook needs a provider for.
jest.mock('../hooks/useTokenMarketData', () => ({
  useTokenMarketData: () => ({ marketData: null, isLoading: false }),
}));

const mockUseTokenAssetDetails = jest.fn(() => ({
  asset: null as Record<string, unknown> | null,
  isLoading: false,
  isError: false,
}));
jest.mock('../queries/tokenAssetQuery', () => ({
  useTokenAssetDetails: () => mockUseTokenAssetDetails(),
}));

let mockTokenAgeLabel: string | null = null;
jest.mock('../utils/formatTokenAge', () => ({
  formatTokenAge: () => mockTokenAgeLabel,
}));

// Stands in for the shared query entry so these tests need no QueryClient.
// The entry itself, including the key normalization that lets the token list
// and this page share it, is covered in `useTokenSecurityQuery.test.ts`.
const mockSecurityQueryResult = {
  data: null as unknown,
  isPending: false,
  error: null,
  dataUpdatedAt: 0,
};

jest.mock('../../Tokens/hooks/useTokenSecurityQuery', () => ({
  useTokenSecurityQuery: () => mockSecurityQueryResult,
}));

const mockUseIsPriceAlertsChainSupported = jest.fn(() => true);
jest.mock(
  '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported',
  () => ({
    useIsPriceAlertsChainSupported: () => mockUseIsPriceAlertsChainSupported(),
  }),
);

jest.mock('../../Bridge/utils/exchange-rates', () => ({
  calcUsdAmountFromFiat: () => 1,
}));

jest.mock(
  '../../Assets/watchlist/components/WatchlistStarButton',
  () => () => null,
);

// Price hero + chart are integration-tested separately (Price / AdvancedChart).
const mockPriceHeaderProps: { showPeriodLabel?: boolean }[] = [];

// The mock renders `children` like the real component so the security &
// social row passed into the price-hero slot stays in the tree.
jest.mock('../../AssetOverview/Price/Price', () => {
  const { View } = jest.requireActual('react-native');
  // `Price` is a compound component (`Price.Header` / `Price.Chart`) — stub
  // the parts so the view test can render the compound composition.
  const MockPrice = ({ children }: { children?: React.ReactNode }) => (
    <View testID="mock-price">{children}</View>
  );
  MockPrice.Provider = MockPrice;
  MockPrice.Header = (props: { showPeriodLabel?: boolean }) => {
    mockPriceHeaderProps.push(props);
    return null;
  };
  MockPrice.Chart = () => null;
  return {
    __esModule: true,
    default: MockPrice,
  };
});

const mockOverviewProps: Record<string, unknown>[] = [];
jest.mock('../components/tabs/OverviewTab', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockOverviewProps.push(props);
      return <View testID="mock-overview" />;
    },
  };
});

// Tab bar stand-in: expose each tab as a pressable that reports the tab key,
// so this view test can cover tab switching end to end.
jest.mock('../components/TokenDetailsV1TabBar', () => {
  const actual = jest.requireActual('../components/TokenDetailsV1TabBar');
  const { View, Pressable, Text } = jest.requireActual('react-native');
  return {
    ...actual,
    __esModule: true,
    default: ({
      activeTab,
      onTabPress,
      onLayout,
      tabs = ['feed', 'overview', 'security'],
    }: {
      activeTab: string;
      onTabPress: (tab: string) => void;
      onLayout?: (event: LayoutChangeEvent) => void;
      tabs?: readonly string[];
    }) => (
      <View testID="mock-tab-bar" onLayout={onLayout}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            testID={`token-details-v1-tab-${tab}`}
            onPress={() => onTabPress(tab)}
          >
            <Text>{`${tab}:${activeTab === tab}`}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

jest.mock('../components/ShareTokenBottomSheet', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return () => <MockText testID="share-token-bottom-sheet">share</MockText>;
});

const mockInlineHeaderProps: Record<string, unknown>[] = [];

jest.mock('../components/TokenDetailsInlineHeader', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  return {
    TokenDetailsInlineHeader: (
      props: React.ComponentProps<typeof TokenDetailsInlineHeader>,
    ) => {
      mockInlineHeaderProps.push(props);
      const {
        token,
        description,
        titleEndAccessory,
        onBackPress,
        onPriceAlertPress,
        onSharePress,
      } = props;
      return (
        <>
          <MockText>{token.symbol}</MockText>
          {titleEndAccessory}
          {description}
          <MockPressable testID="mock-back" onPress={onBackPress} />
          {onPriceAlertPress && (
            <MockPressable
              testID="mock-price-alert"
              onPress={onPriceAlertPress}
            />
          )}
          {onSharePress && (
            <MockPressable testID="mock-share" onPress={onSharePress} />
          )}
        </>
      );
    },
  };
});

const mockActionsSectionProps: Record<string, unknown>[] = [];

// Actions row is covered by TokenDetailsActionsSection.test.tsx.
jest.mock('../components/sections/TokenDetailsActionsSection', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockActionsSectionProps.push(props);
      return <View testID="mock-v1-actions" />;
    },
  };
});

jest.mock('../hooks/useStickyQuickBuy', () => ({
  useStickyQuickBuy: () => ({
    onQuickBuyPress: jest.fn(),
    openQuickBuy: jest.fn(),
    quickBuySheet: null,
  }),
}));

const mockUseTokenBalance = jest.fn();
jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: (...args: unknown[]) => mockUseTokenBalance(...args),
}));

jest.mock('../TraderPositionPnl/useOpenPositionHeader', () => ({
  useOpenPositionHeader: () => ({ isLoading: false }),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: jest.fn() }),
  }),
);

const mockStickyFooterProps: Record<string, unknown>[] = [];

jest.mock('../components/TokenDetailsStickyFooter', () => {
  const { View } = jest.requireActual('react-native');
  const TraderPositionPnl = jest.requireActual(
    '../TraderPositionPnl/TraderPositionPnl',
  ).default;

  return {
    __esModule: true,
    default: (props: {
      traderPositionPnl?: React.ComponentProps<typeof TraderPositionPnl>;
    }) => {
      mockStickyFooterProps.push(props);
      return (
        <View testID="mock-sticky-footer">
          {props.traderPositionPnl && (
            <TraderPositionPnl {...props.traderPositionPnl} />
          )}
          {props.traderPositionPnl?.isExpanded && (
            <View testID="token-details-trader-position-pnl-overlay" />
          )}
        </View>
      );
    },
  };
});

const baseToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

/** Minimal shape that satisfies the hook's prefetched-data validation. */
const securityDataWithLinks = {
  resultType: 'Benign',
  features: [],
  metadata: {
    externalLinks: {
      homepage: 'https://pepe.vip',
      twitterPage: 'pepecoineth',
      telegramChannelId: 'pepecoineth',
    },
  },
} as unknown as TokenDetailsRouteParams['securityData'];

describe('TokenDetailsV1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
    mockSelectors();
    // Default: a token nobody holds. Tests that need the tab call `withHolders`.
    mockUseTokenHolders.mockReturnValue(holdersState());
    mockCurrentPrice = 1;
    mockUseTokenAssetDetails.mockReturnValue({
      asset: null,
      isLoading: false,
      isError: false,
    });
    mockTokenAgeLabel = null;
    mockUseIsPriceAlertsChainSupported.mockReturnValue(true);
    mockUseTokenBalance.mockReturnValue({ balance: undefined });
    mockUseSocialFeed.mockImplementation(() => ({
      posts: [],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn(),
      dataUpdatedAt: undefined,
    }));
    mockOverviewProps.length = 0;
    mockPriceHeaderProps.length = 0;
    mockSecurityQueryResult.data = null;
    mockSecurityQueryResult.isPending = false;
    mockSecurityQueryResult.dataUpdatedAt = 0;
    mockStickyFooterProps.length = 0;
    mockInlineHeaderProps.length = 0;
    mockActionsSectionProps.length = 0;
  });

  it('renders the meme-TDP body with the token symbol in the header', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeTruthy();
    expect(getByText('PEPE')).toBeTruthy();
    // V1 must thread tdp_version='v3' to the header (security-badge sheet) and
    // the actions row (below-chart Buy/Send/Receive events); both default to
    // 'v2', so dropping the prop would silently mislabel V1 as legacy.
    expect(mockInlineHeaderProps[0]).toEqual(
      expect.objectContaining({ tdpVersion: 'v3' }),
    );
    expect(mockActionsSectionProps[0]).toEqual(
      expect.objectContaining({ tdpVersion: 'v3' }),
    );
  });

  it('renders the age chip when launchedAt is available', () => {
    mockTokenAgeLabel = '3d';

    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID)).toBeOnTheScreen();
    expect(getByText('3d')).toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID).props.accessibilityLabel,
    ).toBe('Token age 3d. Learn about token age.');
  });

  it('hides the age chip when launchedAt is unavailable', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID)).toBeNull();
  });

  it('opens the token age explainer from the age chip', () => {
    mockTokenAgeLabel = '3d';

    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();

    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID));

    expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'Token age',
    );
    expect(
      getByTestId(TokenExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      'Time since token creation. Seconds, minutes, hours, then days.',
    );
  });

  it('omits the price period label so the header does not say Today', () => {
    render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(mockPriceHeaderProps[0]).toStrictEqual({
      showPeriodLabel: false,
    });
  });

  it('configures the sticky footer with buy and sell actions', () => {
    mockUseTokenBalance.mockReturnValue({ balance: '2.5' });
    render(
      <TokenDetailsV1
        token={{ ...baseToken, balance: '0' }}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(mockStickyFooterProps[0]).toEqual(
      expect.objectContaining({
        currentTokenBalance: '2.5',
        hasTokenBalance: true,
        isTokenDetailsV1: true,
        // Footer defaults to 'v2'; V1 must pass 'v3' so footer Buy/Sell events
        // (and the security-warning sheet) are not mislabelled as legacy.
        tdpVersion: 'v3',
        quickBuyEntrypointLayout: 'buy_sell',
        onOpenQuickBuy: expect.any(Function),
      }),
    );
  });

  it('does not show sell when the live balance is zero despite a stale route balance', () => {
    mockUseTokenBalance.mockReturnValue({ balance: '0' });

    render(
      <TokenDetailsV1
        token={{ ...baseToken, balance: '4' }}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(mockStickyFooterProps[0]).toEqual(
      expect.objectContaining({
        currentTokenBalance: '0',
        hasTokenBalance: false,
      }),
    );
  });

  it('passes token security data to the sticky footer', () => {
    mockSecurityQueryResult.data = securityDataWithLinks;

    render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(mockStickyFooterProps[0]).toEqual(
      expect.objectContaining({
        securityData: securityDataWithLinks,
      }),
    );
  });

  it('renders the price hero, tab bar and Overview panel when the feed is empty', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId('mock-price')).toBeTruthy();
    expect(getByTestId('mock-tab-bar')).toBeTruthy();
    expect(getByTestId('mock-overview')).toBeTruthy();
    expect(getByText('overview:true')).toBeTruthy();
    expect(getByText('security:false')).toBeTruthy();
    // Social is off in this render, so both social tabs are filtered out —
    // not just Feed.
    expect(queryByTestId('token-details-v1-tab-feed')).toBeNull();
    expect(queryByTestId('token-details-v1-tab-holders')).toBeNull();
  });

  it('wires the Overview panel with the token, asset id and spot-prices market data', () => {
    render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(mockOverviewProps[0]).toStrictEqual(
      expect.objectContaining({
        token: baseToken,
        assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        marketData: null,
      }),
    );
  });

  it('docks the tab bar as a sticky ScrollView child', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // Child 0 = price hero (title, security/social row, chart, stat bar),
    // child 1 = action tiles, child 2 = tab bar (sticky), child 3 = tab
    // content stack.
    expect(
      getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID).props
        .stickyHeaderIndices,
    ).toStrictEqual([TOKEN_DETAILS_TAB_BAR_STICKY_INDEX]);
  });

  it('keeps room at the end of the page for the sticky footer', () => {
    // The footer is an absolutely positioned BottomSheetDialog, so it covers
    // the end of the scroll. Without this padding a short tab -- a token with
    // two holders -- has no scroll range to lift its rows clear of it.
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    const { contentContainerStyle } = getByTestId(
      TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID,
    ).props;

    expect(contentContainerStyle).toEqual(
      expect.objectContaining({
        paddingBottom: expect.any(Number) as unknown as number,
      }),
    );
    expect(contentContainerStyle.paddingBottom).toBeGreaterThan(0);
  });

  it('renders a stacked tab content container where only the active page is laid out', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // The active page (Overview while Feed is hidden) flows at its natural
    // height…
    const overviewPage = getByTestId(
      `${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-overview`,
    );
    expect(overviewPage).toBeOnTheScreen();
    expect(overviewPage.props.style).toBeUndefined();
    expect(overviewPage.props.pointerEvents).toBe('auto');

    // …while inactive pages are display:none — out of layout entirely, so
    // no page stretches to a tallest sibling and hits stay on the active one.
    // (Hidden elements need opt-in to be queryable.)
    const securityPage = getByTestId(
      `${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-security`,
      { includeHiddenElements: true },
    );
    expect(securityPage.props.style).toStrictEqual({ display: 'none' });
    expect(securityPage.props.pointerEvents).toBe('none');
  });

  it('re-stacks pages when the active tab changes so tabs keep their own heights', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    // The previously active page drops out of layout entirely… (hidden
    // elements need opt-in to be queryable)
    expect(
      getByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-overview`, {
        includeHiddenElements: true,
      }).props.style,
    ).toStrictEqual({ display: 'none' });
    // …and the newly active page becomes the only page contributing height.
    expect(
      getByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-security`).props
        .style,
    ).toBeUndefined();
    expect(
      queryByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-feed`, {
        includeHiddenElements: true,
      }),
    ).toBeNull();
  });

  it('mounts tab pages lazily on first activation and keeps them mounted', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // Feed is omitted until it has posts, so Overview is the only mounted tab.
    expect(getByTestId('mock-overview')).toBeTruthy();
    expect(queryByTestId('token-details-v1-tab-panel-feed')).toBeNull();
    expect(queryByTestId(SecurityTabSelectors.TAB)).toBeNull();

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(getByTestId(SecurityTabSelectors.TAB)).toBeTruthy();
  });

  it('renders the security & social row inside the price hero slot, with the mocked security verdict', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    // The pills belong just below the price header and above the chart,
    // so they must render inside the price hero slot (Price children).
    const priceHero = within(getByTestId('mock-price'));
    expect(
      priceHero.getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    // Asserted by test ID, not label, so a different verdict from the API does
    // not fail this test. SecurityPill's own tests cover the label for each
    // verdict.
    expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
  });

  it('renders the token social links from its security data', () => {
    mockSecurityQueryResult.data = securityDataWithLinks;

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_X),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeOnTheScreen();
  });

  it('renders no social links for a token without security data', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(SecuritySocialSectionSelectors.LINK_X)).toBeNull();
  });

  it('opens the Security tab when the security pill is pressed', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId(SecurityPillSelectors.VERDICT));

    expect(getByTestId(SecurityTabSelectors.TAB)).toBeOnTheScreen();
    expect(getByText('security:true')).toBeOnTheScreen();
  });

  // The sheet is hosted here rather than inside SecurityTab because the design
  // system `BottomSheet` is positioned `absolute inset-0` against its nearest
  // positioned ancestor instead of being portalled. Mounted inside the page
  // ScrollView it gets clipped to the viewport and scrolls away with the
  // content, so these two tests are what keep it out here.
  describe('security explainer sheet', () => {
    const openSecurityTab = () => {
      const utils = render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );
      fireEvent.press(utils.getByTestId('token-details-v1-tab-security'));
      return utils;
    };

    it('opens the tapped row’s definition', () => {
      const { getByTestId, queryByTestId } = openSecurityTab();

      expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();

      fireEvent.press(
        getByTestId(SecurityTabSelectors.rowLabel(TokenStatKey.Top10)),
      );

      expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
        'Top 10 holders',
      );
    });

    it('mounts the sheet outside the scrolling page content', () => {
      const { getByTestId } = openSecurityTab();

      fireEvent.press(
        getByTestId(SecurityTabSelectors.rowLabel(TokenStatKey.Top10)),
      );

      expect(
        within(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID)).queryByTestId(
          TokenExplainerSheetSelectors.SHEET,
        ),
      ).toBeNull();
      expect(getByTestId(TokenExplainerSheetSelectors.SHEET)).toBeOnTheScreen();
    });

    // Shares the one `explainerCopy` slot with the row definitions, so the
    // provenance disclaimer cannot be open alongside one of them.
    it('opens the Blockaid disclaimer from the provenance line', () => {
      const { getByTestId } = openSecurityTab();

      fireEvent.press(getByTestId(SecurityTabSelectors.SCAN_META));

      expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
        'Security verification',
      );
    });

    it('closes the sheet again', () => {
      const { getByTestId, queryByTestId } = openSecurityTab();

      fireEvent.press(
        getByTestId(SecurityTabSelectors.rowLabel(TokenStatKey.Created)),
      );
      fireEvent.press(getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON));

      expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();
    });

    // The Contract heading pushes a screen rather than opening a sheet: seven
    // rows each carrying a sentence runs past the height a sheet can offer.
    //
    // Needs a payload with something detected in it, because the heading is
    // only tappable when the Contract security screen has findings to list.
    it('pushes the contract security screen from the Contract heading', () => {
      mockSecurityQueryResult.data = {
        resultType: 'Warning',
        features: [
          {
            featureId: 'SNIPE_AT_MINT',
            type: 'Warning',
            description: 'Sniped at mint',
          },
        ],
      } as unknown as TokenDetailsRouteParams['securityData'];

      const { getByTestId } = openSecurityTab();

      fireEvent.press(getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CONTRACT_SECURITY, {
        token: baseToken,
        tdpVersion: 'v3',
        tokenCategory: 'memecoin',
      });
    });
  });

  it('offers the contract address for copying', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeOnTheScreen();
  });

  // A native token's `address` is a placeholder, not something worth copying.
  it('hides the copy chip for a native token', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={{ ...baseToken, isNative: true }}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      queryByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeNull();
  });

  describe('remote tab config', () => {
    const TAB_BUTTON_TEST_IDS =
      /^token-details-v1-tab-(feed|holders|overview|security)$/;

    const renderTabs = () =>
      render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

    it('renders the tabs in the order the config gives', () => {
      mockSelectors({
        socialEnabled: true,
        tabConfigOrder: ['security', 'overview', 'feed', 'holders'],
      });
      withHolders();

      const { getAllByTestId } = renderTabs();

      expect(
        getAllByTestId(TAB_BUTTON_TEST_IDS).map((tab) => tab.props.testID),
      ).toStrictEqual([
        'token-details-v1-tab-security',
        'token-details-v1-tab-overview',
        'token-details-v1-tab-feed',
        'token-details-v1-tab-holders',
      ]);
    });

    it('lands on the first tab in the config rather than Feed', () => {
      mockSelectors({
        socialEnabled: true,
        tabConfigOrder: ['security', 'overview', 'feed'],
      });

      const { getByText } = renderTabs();

      expect(getByText('security:true')).toBeTruthy();
      expect(getByText('feed:false')).toBeTruthy();
    });

    it('never renders a tab the config leaves out', () => {
      mockSelectors({
        socialEnabled: true,
        tabConfigOrder: ['overview', 'security'],
      });
      withHolders();

      const { queryByTestId } = renderTabs();

      expect(queryByTestId('token-details-v1-tab-feed')).toBeNull();
      expect(queryByTestId('token-details-v1-tab-holders')).toBeNull();
      expect(
        queryByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-feed`),
      ).toBeNull();
    });

    // The config takes tabs away; it does not grant them. Listing Feed on a
    // wallet without the social leaderboard would otherwise ship a tab whose
    // data nobody is allowed to load.
    it('does not grant a listed tab that the social gate denies', () => {
      mockSelectors({
        socialEnabled: false,
        tabConfigOrder: ['feed', 'holders', 'overview', 'security'],
      });
      withHolders();

      const { queryByTestId, getByText } = renderTabs();

      expect(queryByTestId('token-details-v1-tab-feed')).toBeNull();
      expect(queryByTestId('token-details-v1-tab-holders')).toBeNull();
      expect(getByText('overview:true')).toBeTruthy();
    });

    // The verdict is worth reading whether or not the tab exists, but a pill
    // that navigates nowhere is not.
    it('renders the verdict pill as static text when Security is left out', () => {
      mockSelectors({
        socialEnabled: true,
        tabConfigOrder: ['overview'],
      });

      const { getByTestId, queryByTestId } = renderTabs();

      expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
      expect(queryByTestId(SecurityPillSelectors.PILL)).toBeNull();
    });

    // A config of nothing but gated tabs would otherwise leave an empty tab
    // strip with no panel under it.
    it('falls back to Overview when every configured tab is gated away', () => {
      mockSelectors({
        socialEnabled: false,
        tabConfigOrder: ['feed', 'holders'],
      });

      const { getByTestId, getByText } = renderTabs();

      expect(getByTestId('token-details-v1-tab-overview')).toBeTruthy();
      expect(getByText('overview:true')).toBeTruthy();
    });
  });

  it('switches tab panels and back to the Overview tab', () => {
    mockSelectors({ socialEnabled: true });
    mockUseSocialFeed.mockReturnValue({
      posts: [{ id: 'post-1' } as SocialV1FeedPost],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn(),
      dataUpdatedAt: undefined,
    });
    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByText('feed:true')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(getByText('security:true')).toBeTruthy();
    expect(getByTestId(SecurityTabSelectors.TAB)).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-overview'));

    expect(getByText('overview:true')).toBeTruthy();
    expect(getByTestId('mock-overview')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-feed'));

    expect(getByText('feed:true')).toBeTruthy();
    expect(
      getByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-feed`),
    ).toBeTruthy();
  });

  it('keeps the Feed tab when the feed has no posts', () => {
    mockSelectors({ socialEnabled: true });

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId('token-details-v1-tab-feed')).toBeTruthy();
  });

  it('hides the Holders tab for a token nobody holds', () => {
    mockSelectors({ socialEnabled: true });

    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId('token-details-v1-tab-holders')).toBeNull();
  });

  it('shows the Holders tab second, right after Feed, once the token has holders', () => {
    mockSelectors({ socialEnabled: true });
    withHolders();

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId('token-details-v1-tab-holders')).toBeTruthy();
    // Second in the order, so a right swipe from it lands on Feed.
    expect(resolveSwipeTargetTab('holders', 120, 0)).toBe('feed');
  });

  it('keeps the Holders tab through the first fetch, so the tab bar does not shift', () => {
    mockSelectors({ socialEnabled: true });
    mockUseTokenHolders.mockReturnValue(holdersState({ isLoading: true }));

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId('token-details-v1-tab-holders')).toBeTruthy();
  });

  it('keeps the Holders tab when the fetch failed, so a blip does not remove it', () => {
    mockSelectors({ socialEnabled: true });
    mockUseTokenHolders.mockReturnValue(
      holdersState({ error: 'holders route exploded' }),
    );

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId('token-details-v1-tab-holders')).toBeTruthy();
  });

  it('lands on the Feed tab even when the feed has no posts', () => {
    mockSelectors({ socialEnabled: true });

    const { getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // Keeping the tab is not the same as landing on it: an empty feed must
    // still be the tab the reader opens on.
    expect(getByText('feed:true')).toBeTruthy();
    expect(getByText('overview:false')).toBeTruthy();
  });

  it('drops both social tabs when the token has no CAIP-19 asset id', () => {
    mockSelectors({ socialEnabled: true });
    // No chain id, so `useTokenCaipAssetId` resolves null and neither social
    // surface has a source to load.
    const tokenWithoutAssetId = {
      ...baseToken,
      chainId: undefined,
      caipAssetId: undefined,
    } as unknown as TokenDetailsRouteParams;

    const { queryByTestId, getByText } = render(
      <TokenDetailsV1
        token={tokenWithoutAssetId}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId('token-details-v1-tab-feed')).toBeNull();
    expect(queryByTestId('token-details-v1-tab-holders')).toBeNull();
    expect(getByText('overview:true')).toBeTruthy();
  });

  it('loads the social feed on the Feed tab', () => {
    mockSelectors({ socialEnabled: true });
    mockUseSocialFeed.mockReturnValue({
      posts: [{ id: 'post-1' } as SocialV1FeedPost],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn(),
      dataUpdatedAt: undefined,
    });

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('token-details-v1-tab-feed'));

    expect(mockUseSocialFeed).toHaveBeenCalledWith({
      kind: 'token',
      assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    });
  });

  it('opens Quick Buy for the token when a feed post is copy traded', () => {
    mockSelectors({ socialEnabled: true });
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );
    expect(lastQuickBuyProps().isVisible).toBe(false);

    fireEvent.press(getByTestId('mock-feed-copy-trade'));

    expect(lastQuickBuyProps()).toEqual(
      expect.objectContaining({
        isVisible: true,
        target: {
          tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
          tokenSymbol: 'PEPE',
          tokenName: 'PEPE',
          chain: 'eip155:1',
        },
        copyTradeOrigin: { commentId: 'comment-1' },
        initialTradeMode: 'buy',
        analyticsContext: { source: 'trader_feed' },
      }),
    );
  });

  it('closes the copy-trade Quick Buy sheet', () => {
    mockSelectors({ socialEnabled: true });
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );
    fireEvent.press(getByTestId('mock-feed-copy-trade'));

    act(() => {
      (lastQuickBuyProps().onClose as () => void)();
    });

    expect(lastQuickBuyProps()).toEqual(
      expect.objectContaining({ isVisible: false, target: null }),
    );
  });

  it('shows the holders list on the Holders tab', () => {
    mockSelectors({ socialEnabled: true });
    withHolders();

    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('token-details-v1-tab-holders'));

    expect(getByTestId('token-details-v1-holders-list')).toBeTruthy();
  });

  it('anchors the scroll position to the docked tab bar when switching tabs from a scrolled-down state', () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );
    const scrollView = getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID);

    // Simulate tab bar layout at offset Y = 400
    fireEvent(getByTestId('mock-tab-bar'), 'layout', {
      nativeEvent: { layout: { y: 400 } },
    });

    // Simulate scrolling down to 800 (past the tab bar at 400)
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 800 } },
    });

    // Switch to security tab
    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    // Should scrollTo the docked tab bar offset (400) without animation to prevent UI jumping
    expect(scrollToSpy).toHaveBeenCalledWith({
      y: 400,
      animated: false,
    });

    scrollToSpy.mockRestore();
  });

  it('keeps the tab area tall enough to hold the docked tab bar when a tab is short', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID), 'layout', {
      nativeEvent: { layout: { height: 900 } },
    });
    fireEvent(getByTestId('mock-tab-bar'), 'layout', {
      nativeEvent: { layout: { y: 400, height: 48 } },
    });

    // Viewport, less the tab bar and the room kept for the sticky footer.
    expect(getByTestId(TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID)).toHaveStyle({
      minHeight: 900 - 48 - 190,
    });
  });

  it('preserves scroll position when switching tabs before scrolling past the tab bar', () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );
    const scrollView = getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID);

    // Simulate tab bar layout at offset Y = 400
    fireEvent(getByTestId('mock-tab-bar'), 'layout', {
      nativeEvent: { layout: { y: 400 } },
    });

    // Simulate scrolling to 200 (before tab bar at 400)
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 200 } },
    });

    // Switch to security tab
    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    // Should NOT call scrollTo
    expect(scrollToSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
  });

  it('activates the swiped-to tab when a pan settles as a decisive swipe', () => {
    // The pan gesture itself is design-system wiring (TabsList pattern —
    // see its test); the decision logic is covered directly below.
    expect(resolveSwipeTargetTab('overview', -120, 0)).toBe('security');
  });

  describe('resolveSwipeTargetTab', () => {
    it('targets the next tab on a left swipe', () => {
      expect(resolveSwipeTargetTab('feed', -120, 0)).toBe('holders');
      expect(resolveSwipeTargetTab('holders', -120, 0)).toBe('overview');
      expect(resolveSwipeTargetTab('overview', -120, 0)).toBe('security');
    });

    it('targets the previous tab on a right swipe', () => {
      expect(resolveSwipeTargetTab('security', 120, 0)).toBe('overview');
      expect(resolveSwipeTargetTab('overview', 120, 0)).toBe('holders');
      expect(resolveSwipeTargetTab('holders', 120, 0)).toBe('feed');
    });

    it('lets a fast fling switch tabs even with a short travel', () => {
      expect(resolveSwipeTargetTab('overview', -10, -600)).toBe('security');
    });

    it('ignores pans that are too small and swipes past the end tabs', () => {
      // Too small to be decisive, even with moderate velocity.
      expect(resolveSwipeTargetTab('overview', 30, 0)).toBeNull();
      expect(resolveSwipeTargetTab('overview', 40, 100)).toBeNull();
      // No neighbouring tab in the swipe direction.
      expect(resolveSwipeTargetTab('feed', 120, 0)).toBeNull();
      expect(resolveSwipeTargetTab('security', -120, 0)).toBeNull();
    });
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('mock-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to manage price alerts when the bell is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('mock-price-alert'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MANAGE_PRICE_ALERTS,
      expect.objectContaining({
        symbol: 'PEPE',
        assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      }),
    );
  });

  it('hides the price alert action when the chain is not supported', () => {
    mockUseIsPriceAlertsChainSupported.mockReturnValue(false);

    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId('mock-price-alert')).toBeNull();
  });

  it('tracks the share event and opens the share sheet', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );
    expect(queryByTestId('share-token-bottom-sheet')).toBeNull();

    fireEvent.press(getByTestId('mock-share'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Token Details Shared' }),
    );
    expect(getByTestId('share-token-bottom-sheet')).toBeTruthy();
  });

  describe('analytics', () => {
    const trackedEvents = (name: string) =>
      mockTrackEvent.mock.calls
        .map(([event]) => event)
        .filter((event) => event?.name === name);

    it('fires TOKEN_DETAILS_OPENED once with tdp_version v3 and token_category', () => {
      const { rerender } = render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

      const openedEvents = trackedEvents('Token Details Opened');
      expect(openedEvents).toHaveLength(1);
      expect(openedEvents[0].properties).toEqual(
        expect.objectContaining({
          tdp_version: 'v3',
          token_category: 'memecoin',
          chain_id: '0x1',
          source: 'unknown',
          token_symbol: 'PEPE',
          token_address: baseToken.address,
          token_name: 'Pepe',
          has_balance: false,
        }),
      );

      // A re-render for the same token must not re-fire the event.
      rerender(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );
      expect(trackedEvents('Token Details Opened')).toHaveLength(1);

      // A different token must re-fire (dedup keys on the token, not mount).
      rerender(
        <TokenDetailsV1
          token={{ ...baseToken, address: '0xdifferentaddress' }}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );
      expect(trackedEvents('Token Details Opened')).toHaveLength(2);
    });

    it('reports has_balance and the real source from the token, not constants', () => {
      render(
        <TokenDetailsV1
          token={{
            ...baseToken,
            balance: '2.5',
            source: TokenDetailsSource.Trending,
          }}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

      const openedEvents = trackedEvents('Token Details Opened');
      expect(openedEvents).toHaveLength(1);
      expect(openedEvents[0].properties).toEqual(
        expect.objectContaining({
          source: 'trending',
          has_balance: true,
        }),
      );
    });

    it('fires TOKEN_DETAILS_TAB_VIEWED with the tapped tab name', () => {
      const { getByTestId } = render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

      fireEvent.press(getByTestId('token-details-v1-tab-security'));

      const tabEvents = trackedEvents('Token Details Tab Viewed');
      expect(tabEvents).toHaveLength(1);
      expect(tabEvents[0].properties).toEqual(
        expect.objectContaining({
          tab_name: 'security',
          tdp_version: 'v3',
          token_category: 'memecoin',
          chain_id: '0x1',
        }),
      );
    });

    it('fires the security pill event with the displayed verdict and no tab event', () => {
      // Benign security data, which `useSecurityFacts` maps to the `screened`
      // verdict shown on the pill.
      mockSecurityQueryResult.data = securityDataWithLinks;

      const { getByTestId } = render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

      fireEvent.press(getByTestId(SecurityPillSelectors.VERDICT));

      const pillEvents = trackedEvents('Token Details Security Pill Clicked');
      expect(pillEvents).toHaveLength(1);
      expect(pillEvents[0].properties).toEqual(
        expect.objectContaining({
          verdict: 'screened',
          tdp_version: 'v3',
          token_category: 'memecoin',
          chain_id: '0x1',
        }),
      );

      // The pill jump to Security must not also emit a tab-viewed event.
      expect(trackedEvents('Token Details Tab Viewed')).toHaveLength(0);
    });

    it('reports the actual non-default verdict from the security facts', () => {
      // Warning payload -> `useSecurityFacts` maps to `medium_risk`, proving the
      // event reads the displayed verdict rather than a hardcoded `screened`.
      mockSecurityQueryResult.data = {
        resultType: 'Warning',
        features: [
          {
            featureId: 'SNIPE_AT_MINT',
            type: 'Warning',
            description: 'Sniped at mint',
          },
        ],
      } as unknown as TokenDetailsRouteParams['securityData'];

      const { getByTestId } = render(
        <TokenDetailsV1
          token={baseToken}
          variant={TokenDetailsVariant.Memecoin}
        />,
      );

      fireEvent.press(getByTestId(SecurityPillSelectors.VERDICT));

      const pillEvents = trackedEvents('Token Details Security Pill Clicked');
      expect(pillEvents).toHaveLength(1);
      expect(pillEvents[0].properties).toEqual(
        expect.objectContaining({ verdict: 'medium_risk' }),
      );
    });
  });

  it('keeps the contract address until the page is scrolled', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('replaces the contract address with the live price after scrolling', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.scroll(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID), {
      nativeEvent: {
        contentOffset: { y: LIVE_PRICE_SCROLL_THRESHOLD_PX },
      },
    });

    expect(getByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeOnTheScreen();

    fireEvent.scroll(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID), {
      nativeEvent: { contentOffset: { y: 0 } },
    });

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('keeps the contract address when there is no live price', () => {
    mockCurrentPrice = 0;

    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.scroll(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID), {
      nativeEvent: {
        contentOffset: { y: LIVE_PRICE_SCROLL_THRESHOLD_PX },
      },
    });

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('renders the stat bar for the variant it is given', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(StatBarSelectors.BAR)).toBeOnTheScreen();
    expect(
      getByTestId(StatBarSelectors.cell(TokenStatKey.MarketCap)),
    ).toBeOnTheScreen();
  });

  it('does not render a stat explainer until a label is tapped', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();
  });

  it('opens the explainer for the stat whose label was tapped', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId(StatBarSelectors.label(TokenStatKey.Holders)));

    // Asserts the copy, not just that a sheet opened: the press has to carry
    // which stat it was through to the sheet.
    expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'Holders',
    );
    expect(
      getByTestId(TokenExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent('Number of unique addresses holding this token.');
  });

  it('dismisses the explainer when the button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId(StatBarSelectors.label(TokenStatKey.Tax)));
    fireEvent.press(getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON));

    expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();
  });
});
