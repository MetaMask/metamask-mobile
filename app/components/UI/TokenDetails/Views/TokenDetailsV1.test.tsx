import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  TokenDetailsV1,
  TOKEN_DETAILS_V1_TEST_ID,
  TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID,
  TOKEN_DETAILS_TAB_BAR_STICKY_INDEX,
} from './TokenDetailsV1';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  LIVE_PRICE_HEADER_TEST_ID,
  LIVE_PRICE_SCROLL_THRESHOLD_PX,
} from '../hooks/useLivePriceHeaderDescription';
import type { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
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
jest.mock('../../AssetOverview/Price/Price', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-price" />,
  };
});

// Overview tab content is unit-tested in TokenDetailsV1Overview.test.tsx.
// Capture the props so this view still asserts the wiring into it.
const mockOverviewProps: Record<string, unknown>[] = [];
jest.mock('../components/TokenDetailsV1Overview', () => {
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
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const tabs = ['overview', 'security', 'feed'];
  return {
    __esModule: true,
    default: ({
      activeTab,
      onTabPress,
    }: {
      activeTab: string;
      onTabPress: (tab: string) => void;
    }) => (
      <View testID="mock-tab-bar">
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
      onBackPress,
      onPriceAlertPress,
      onSharePress,
    }: React.ComponentProps<typeof TokenDetailsInlineHeader>) => (
      <>
        <MockText>{token.symbol}</MockText>
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
      <TokenDetailsV1 token={baseToken} />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeTruthy();
    expect(getByText('PEPE')).toBeTruthy();
  });

  it('renders the price hero, tab bar and Overview panel by default', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    expect(getByTestId('mock-price')).toBeTruthy();
    expect(getByTestId('mock-tab-bar')).toBeTruthy();
    expect(getByTestId('mock-overview')).toBeTruthy();
    expect(getByText('overview:true')).toBeTruthy();
    expect(getByText('security:false')).toBeTruthy();
    expect(getByText('feed:false')).toBeTruthy();
  });

  it('wires the Overview panel with the token, asset id and currency', () => {
    render(<TokenDetailsV1 token={baseToken} />);

    expect(mockOverviewProps[0]).toEqual(
      expect.objectContaining({
        token: baseToken,
        assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        currentCurrency: 'usd',
      }),
    );
  });

  it('docks the tab bar as a sticky ScrollView child', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    // Child 0 = security/social row, child 1 = price hero, child 2 = tab bar
    // (sticky), child 3 = tab panel.
    expect(
      getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID).props
        .stickyHeaderIndices,
    ).toEqual([TOKEN_DETAILS_TAB_BAR_STICKY_INDEX]);
  });

  it('renders the security & social row with the mocked security verdict', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
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
    const { queryByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(queryByTestId(SecuritySocialSectionSelectors.LINK_X)).toBeNull();
  });

  it('opens the Security tab when the security pill is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    fireEvent.press(getByTestId(SecurityPillSelectors.VERDICT));

    expect(
      getByTestId('token-details-v1-tab-panel-security'),
    ).toBeOnTheScreen();
    expect(queryByTestId('mock-overview')).toBeNull();
  });

  it('offers the contract address for copying', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(
      getByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeOnTheScreen();
  });

  // A native token's `address` is a placeholder, not something worth copying.
  it('hides the copy chip for a native token', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1 token={{ ...baseToken, isNative: true }} />,
    );

    expect(
      queryByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeNull();
  });

  it('switches tab panels and back to the Overview tab', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(queryByTestId('mock-overview')).toBeNull();
    expect(getByTestId('token-details-v1-tab-panel-security')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-v1-tab-overview'));

    expect(getByTestId('mock-overview')).toBeTruthy();
    expect(queryByTestId('token-details-v1-tab-panel-security')).toBeNull();

    fireEvent.press(getByTestId('token-details-v1-tab-feed'));

    expect(getByTestId('token-details-v1-tab-panel-feed')).toBeTruthy();
    expect(queryByTestId('mock-overview')).toBeNull();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    fireEvent.press(getByTestId('mock-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to manage price alerts when the bell is pressed', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

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

    const { queryByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(queryByTestId('mock-price-alert')).toBeNull();
  });

  it('tracks the share event and opens the share sheet', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );
    expect(queryByTestId('share-token-bottom-sheet')).toBeNull();

    fireEvent.press(getByTestId('mock-share'));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getByTestId('share-token-bottom-sheet')).toBeTruthy();
  });

  it('keeps the contract address until the page is scrolled', () => {
    const { queryByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('replaces the contract address with the live price after scrolling', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
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
      <TokenDetailsV1 token={baseToken} />,
    );

    fireEvent.scroll(getByTestId(TOKEN_DETAILS_V1_SCROLL_VIEW_TEST_ID), {
      nativeEvent: {
        contentOffset: { y: LIVE_PRICE_SCROLL_THRESHOLD_PX },
      },
    });

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });
});
