import React from 'react';
import { ScrollView, type LayoutChangeEvent } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';

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
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import {
  LIVE_PRICE_HEADER_TEST_ID,
  LIVE_PRICE_SCROLL_THRESHOLD_PX,
} from '../hooks/useLivePriceHeaderDescription';
import type { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
import {
  StatBarSelectors,
  StatExplainerSheetSelectors,
} from '../components/V1/StatBar/StatBar.testIds';
import { TokenStatKey } from '../components/V1/StatBar/StatBar.types';
import Routes from '../../../../constants/navigation/Routes';

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

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

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

// Echoes the prefetched security data so tests can supply security data at
// navigation time, matching the real hook's pass-through of valid prefetched
// data (no network fetch needed in tests).
jest.mock('../hooks/useTokenSecurityData', () => ({
  useTokenSecurityData: ({ prefetchedData }: { prefetchedData?: unknown }) => ({
    securityData: prefetchedData ?? null,
    isLoading: false,
  }),
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
// The mock renders `children` like the real component so the security &
// social row passed into the price-hero slot stays in the tree.
jest.mock('../../AssetOverview/Price/Price', () => {
  const { View } = jest.requireActual('react-native');
  // `Price` is a compound component (`Price.Header` / `Price.Chart`) — stub
  // the parts so the view test can render the compound composition.
  const MockPrice = ({ children }: { children?: React.ReactNode }) => (
    <View testID="mock-price">{children}</View>
  );
  MockPrice.Header = () => null;
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
  const tabs = ['overview', 'security', 'feed'];
  return {
    ...actual,
    __esModule: true,
    default: ({
      activeTab,
      onTabPress,
      onLayout,
    }: {
      activeTab: string;
      onTabPress: (tab: string) => void;
      onLayout?: (event: LayoutChangeEvent) => void;
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

jest.mock('../components/TokenDetailsInlineHeader', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  return {
    TokenDetailsInlineHeader: ({
      token,
      description,
      titleEndAccessory,
      onBackPress,
      onPriceAlertPress,
      onSharePress,
    }: React.ComponentProps<typeof TokenDetailsInlineHeader>) => (
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
    ),
  };
});

// Actions row is covered by TokenDetailsActionsSection.test.tsx.
jest.mock('../components/sections/TokenDetailsActionsSection', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-v1-actions" />,
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
    mockCurrentPrice = 1;
    mockUseIsPriceAlertsChainSupported.mockReturnValue(true);
    mockOverviewProps.length = 0;
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
  });

  it('renders the age chip in the header with the mocked token age', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_AGE_CHIP_TEST_ID)).toBeOnTheScreen();
    expect(getByText('3d')).toBeOnTheScreen();
  });

  it('renders the price hero, tab bar and Overview panel by default', () => {
    const { getByTestId, getByText } = render(
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
    expect(getByText('feed:false')).toBeTruthy();
  });

  it('wires the Overview panel with the token, asset id and currency', () => {
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
        currentCurrency: 'usd',
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

    // Child 0 = price hero (title + security/social row + chart), child 1 =
    // stat bar, child 2 = action tiles, child 3 = tab bar (sticky), child 4 =
    // tab content stack.
    expect(
      getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID).props
        .stickyHeaderIndices,
    ).toStrictEqual([TOKEN_DETAILS_TAB_BAR_STICKY_INDEX]);
  });

  it('renders a stacked tab content container where only the active page is laid out', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // The active page flows at its natural height…
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
    const { getByTestId } = render(
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
      getByTestId(`${TOKEN_DETAILS_V1_TAB_CONTENT_TEST_ID}-page-feed`, {
        includeHiddenElements: true,
      }).props.style,
    ).toStrictEqual({ display: 'none' });
  });

  it('mounts tab pages lazily on first activation and keeps them mounted', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    // Only the default tab is mounted initially.
    expect(getByTestId('mock-overview')).toBeTruthy();
    expect(queryByTestId('token-details-v1-tab-panel-security')).toBeNull();

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(getByTestId('token-details-v1-tab-panel-security')).toBeTruthy();
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
    // Asserted by test ID, not label, so previewing a different verdict via
    // MOCK_SECURITY_VERDICT does not fail this test. SecurityPill's own tests
    // cover the label for each verdict.
    expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
  });

  it('renders the token social links from its security data', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={{ ...baseToken, securityData: securityDataWithLinks }}
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

    expect(
      getByTestId('token-details-v1-tab-panel-security'),
    ).toBeOnTheScreen();
    expect(getByText('security:true')).toBeOnTheScreen();
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

  it('switches tab panels and back to the Overview tab', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(getByText('security:true')).toBeTruthy();
    expect(getByTestId('token-details-v1-tab-panel-security')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-overview'));

    expect(getByText('overview:true')).toBeTruthy();
    expect(getByTestId('mock-overview')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-feed'));

    expect(getByText('feed:true')).toBeTruthy();
    expect(getByTestId('token-details-v1-tab-panel-feed')).toBeTruthy();
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
      expect(resolveSwipeTargetTab('overview', -120, 0)).toBe('security');
      expect(resolveSwipeTargetTab('security', -120, 0)).toBe('feed');
    });

    it('targets the previous tab on a right swipe', () => {
      expect(resolveSwipeTargetTab('security', 120, 0)).toBe('overview');
      expect(resolveSwipeTargetTab('feed', 120, 0)).toBe('security');
    });

    it('lets a fast fling switch tabs even with a short travel', () => {
      expect(resolveSwipeTargetTab('overview', -10, -600)).toBe('security');
    });

    it('ignores pans that are too small and swipes past the end tabs', () => {
      // Too small to be decisive, even with moderate velocity.
      expect(resolveSwipeTargetTab('overview', 30, 0)).toBeNull();
      expect(resolveSwipeTargetTab('overview', 40, 100)).toBeNull();
      // No neighbouring tab in the swipe direction.
      expect(resolveSwipeTargetTab('overview', 120, 0)).toBeNull();
      expect(resolveSwipeTargetTab('feed', -120, 0)).toBeNull();
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getByTestId('share-token-bottom-sheet')).toBeTruthy();
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

    expect(queryByTestId(StatExplainerSheetSelectors.SHEET)).toBeNull();
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
    expect(getByTestId(StatExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'Holders',
    );
    expect(
      getByTestId(StatExplainerSheetSelectors.DESCRIPTION),
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
    fireEvent.press(getByTestId(StatExplainerSheetSelectors.GOT_IT_BUTTON));

    expect(queryByTestId(StatExplainerSheetSelectors.SHEET)).toBeNull();
  });
});
