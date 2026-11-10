import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { KLIPY_STATIC_GIF_EXAMPLE } from '../../../UI/SocialFeed/utils/klipyGifComment';
import type { UseOpenPerpsOrderOptions } from '../../../UI/SocialFeed/hooks/useOpenPerpsOrder';
import type { PositionSheetData } from './hooks/usePositionSheetData';
import PositionDetailsSheet from './PositionDetailsSheet';
import { PositionDetailsSheetSelectorsIDs } from './PositionDetailsSheet.testIds';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';
import {
  AvatarTokenSize,
  Icon,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import type { PositionDetailsSheetParams } from './PositionDetailsSheet.types';
import {
  DAY_MS,
  NOW_MS,
  buildAuthor,
  buildComment,
  buildPerpPosition,
  buildPosition,
  buildTrade,
} from './positionDetailsSheet.fixtures';

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    formatAddressToAssetId: jest.fn(
      (...args: Parameters<typeof actual.formatAddressToAssetId>) =>
        actual.formatAddressToAssetId(...args),
    ),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOpenPerpsOrder = jest.fn();
const mockToggleFollow = jest.fn();
const mockEnsureSocialProfileOnboarding = jest.fn(() => true);
const mockEnsureSocialTermsAccepted = jest.fn(() => true);
let mockParams: PositionDetailsSheetParams;
let mockSheetData: PositionSheetData;
let mockProfile: { profileId: string; linkedAccountAddress?: string } | null;
let mockIsFollowing = false;
let mockHeldBalance: object | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: () => mockParams,
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'LOW',
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('./hooks/usePositionSheetData', () => ({
  usePositionSheetData: () => mockSheetData,
}));

jest.mock('./hooks/useLivePosition', () => ({
  useLivePosition: ({ snapshot }: { snapshot?: unknown }) => ({
    position: snapshot,
    isRefreshed: false,
    isLoading: false,
  }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: mockProfile }),
}));

jest.mock('../../../hooks/useFollowToggle', () => ({
  useFollowToggle: () => ({
    isFollowing: mockIsFollowing,
    toggleFollow: mockToggleFollow,
  }),
}));

jest.mock('../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: (_isFollowing: boolean, perform: () => void) => perform(),
  }),
}));

jest.mock('../hooks/useRequireSocialProfileOnboarding', () => ({
  useRequireSocialProfileOnboarding: () => ({
    ensureSocialProfileOnboarding: mockEnsureSocialProfileOnboarding,
  }),
}));

jest.mock('../../../../util/haptics');

jest.mock('../navigation/navigateToSocialV1Profile', () => ({
  navigateToSocialV1Profile: jest.fn(),
}));

jest.mock('../terms/useSocialTermsGate', () => ({
  useSocialTermsGate: () => ({
    ensureSocialTermsAccepted: mockEnsureSocialTermsAccepted,
  }),
}));

jest.mock('../../../UI/SocialFeed/hooks/useOpenPerpsOrder', () => ({
  useOpenPerpsOrder: ({ runNavigation }: UseOpenPerpsOrderOptions) => ({
    openPerpsOrder: (params: unknown) => {
      mockOpenPerpsOrder(params);
      runNavigation?.(() => mockNavigate('PerpsModals'));
    },
    geoBlockSheet: null,
  }),
}));

jest.mock('../../../UI/QuickBuy', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isVisible,
      initialTradeMode,
      onClose,
    }: {
      isVisible: boolean;
      initialTradeMode?: string;
      onClose: () => void;
    }) =>
      isVisible ? (
        <Text testID="quick-buy-sheet" onPress={onClose}>
          {initialTradeMode}
        </Text>
      ) : null,
    positionToQuickBuyTarget: () => ({ tokenAddress: '0xpepe' }),
  };
});

jest.mock('../../../UI/QuickBuy/hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: () => ({ destToken: undefined }),
}));

jest.mock('../../../UI/QuickBuy/hooks/usePositionTokenBalance', () => ({
  usePositionTokenBalance: () => mockHeldBalance,
}));

jest.mock('./components/PositionSheetChart', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onScrub,
    }: {
      onScrub?: (point: [string, number] | null) => void;
    }) => (
      <View testID="position-sheet-chart">
        <Pressable
          testID="position-sheet-chart-scrub"
          onPress={() => onScrub?.(['100', 60])}
        />
      </View>
    ),
  };
});

jest.mock('../../../UI/SocialFeed/components/PositionTokenAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ size }: { size?: string }) => (
      <View testID="position-token-avatar" accessibilityLabel={size} />
    ),
  };
});

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

const buildSheetData = (
  overrides: Partial<PositionSheetData> = {},
): PositionSheetData => ({
  isPerp: false,
  isClosed: false,
  symbol: 'PEPE',
  assetName: 'Pepe',
  leverage: undefined,
  perpDirection: null,
  perpTradeSymbol: undefined,
  prices: [],
  isPricesLoading: false,
  timeAxisLabels: [],
  isTrendPositive: true,
  markers: [],
  isMarketCapMode: false,
  formatValue: (price) => `$${price}`,
  currentPrice: 120,
  dailyChangePercent: 3.49,
  marketCap: undefined,
  chartPeriod: '1D',
  setChartPeriod: jest.fn(),
  summaryTitle: '2 PEPE',
  summaryTagLabel: undefined,
  summarySubtitle: 'Opened · 2 hr ago',
  pnlPercentLabel: '+20.00%',
  pnlValueLabel: '+$40.00',
  isPnlPositive: true,
  ...overrides,
});

const perpData = (overrides: Partial<PositionSheetData> = {}) =>
  buildSheetData({
    isPerp: true,
    symbol: 'BTC',
    assetName: 'BTC',
    leverage: 40,
    perpDirection: 'short',
    perpTradeSymbol: 'BTC',
    ...overrides,
  });

describe('PositionDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(formatAddressToAssetId)
      .mockImplementation((...args) =>
        jest
          .requireActual('@metamask/bridge-controller')
          .formatAddressToAssetId(...args),
      );
    mockParams = {
      positionId: 'position-1',
      position: buildPosition(),
      author: buildAuthor(),
    };
    mockSheetData = buildSheetData();
    mockProfile = { profileId: 'viewer-1', linkedAccountAddress: '0xViewer' };
    mockIsFollowing = false;
    mockHeldBalance = undefined;
    mockEnsureSocialProfileOnboarding.mockReturnValue(true);
    mockEnsureSocialTermsAccepted.mockReturnValue(true);
  });

  it('titles the sheet with the trader and shows the current price', () => {
    render(<PositionDetailsSheet />);

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('satoshi');
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$120');
  });

  it('opens on price when the spot card has no market cap on its fills', () => {
    mockSheetData = buildSheetData({
      marketCap: 1_200_000,
    });

    render(<PositionDetailsSheet />);

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$120');
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_MARKET_CAP,
      ),
    );

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$1.2M');
  });

  it('names the market cap toggle for screen readers', () => {
    mockSheetData = buildSheetData({ marketCap: 1_200_000 });

    render(<PositionDetailsSheet />);

    const marketCapToggle = screen.getByTestId(
      PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_MARKET_CAP,
    );

    expect(marketCapToggle).toHaveTextContent('MC');
    expect(marketCapToggle.props.accessibilityLabel).toBe('Market cap');
  });

  it('changes the chart period from the range control', () => {
    const setChartPeriod = jest.fn();
    mockSheetData = buildSheetData({ setChartPeriod });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.chartPeriod('1W')),
    );

    expect(setChartPeriod).toHaveBeenCalledWith('1W');
  });

  it('scrubs the headline in the selected price or market cap format', () => {
    mockSheetData = buildSheetData({
      marketCap: 1_200_000,
      currentPrice: 120,
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(screen.getByTestId('position-sheet-chart-scrub'));

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$60');

    fireEvent.press(
      screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_MARKET_CAP,
      ),
    );

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$600K');
  });

  it('opens token details from the price header', () => {
    render(<PositionDetailsSheet />);

    const priceHeader = screen.getByTestId(
      PositionDetailsSheetSelectorsIDs.PRICE_HEADER,
    );

    expect(within(priceHeader).getByText('Pepe')).toBeOnTheScreen();
    expect(priceHeader.props.accessibilityLabel).toBe(
      'Pepe, $120, +3.49%, Today',
    );
    expect(priceHeader.props.accessibilityHint).toBe('Opens the asset page');
    expect(within(priceHeader).UNSAFE_getByType(Icon).props).toMatchObject({
      name: IconName.ArrowRight,
      color: IconColor.IconAlternative,
    });
    expect(
      within(priceHeader).getByTestId('position-token-avatar').props
        .accessibilityLabel,
    ).toBe(AvatarTokenSize.Xl);

    fireEvent.press(priceHeader);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      chainId: '0x1',
      address: '0xpepe',
      symbol: 'PEPE',
      name: 'Pepe',
      isNative: false,
    });
  });

  it('opens a native token as the chain asset', () => {
    mockParams = {
      ...mockParams,
      position: buildPosition({
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'ETH',
        tokenName: 'Ethereum',
      }),
    };
    mockSheetData = buildSheetData({
      symbol: 'ETH',
      assetName: 'Ethereum',
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      isNative: true,
    });
  });

  it('labels a market cap so it is not read as a unit price', () => {
    mockSheetData = buildSheetData({
      marketCap: 1_200_000,
      currentPrice: 120,
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_MARKET_CAP,
      ),
    );

    const priceHeader = screen.getByTestId(
      PositionDetailsSheetSelectorsIDs.PRICE_HEADER,
    );

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$1.2M');
    expect(within(priceHeader).getByText('(MC)')).toBeOnTheScreen();
    expect(priceHeader.props.accessibilityLabel).toContain('$1.2M, (MC)');
  });

  it('shows a dash without a token when the price and change are unknown', () => {
    mockParams = {
      ...mockParams,
      position: undefined,
    };
    mockSheetData = buildSheetData({
      currentPrice: undefined,
      dailyChangePercent: undefined,
    });

    render(<PositionDetailsSheet />);

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('\u2014');
    expect(screen.queryByTestId('position-token-avatar')).toBeNull();
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER).props
        .accessibilityLabel,
    ).toBe('Pepe, Today');
  });

  it('colors a falling daily change', () => {
    mockSheetData = buildSheetData({ dailyChangePercent: -2.5 });

    render(<PositionDetailsSheet />);

    expect(screen.getByText('-2.50%')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER).props
        .accessibilityLabel,
    ).toContain('-2.50%');
  });

  it('opens an EVM token as a contract when native lookup throws', () => {
    jest.mocked(formatAddressToAssetId).mockImplementation(() => {
      throw new Error('No native asset');
    });
    mockParams = {
      ...mockParams,
      position: buildPosition({
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'ETH',
        tokenName: 'Ethereum',
      }),
    };
    mockSheetData = buildSheetData({
      symbol: 'ETH',
      assetName: 'Ethereum',
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      isNative: false,
    });
  });

  it('opens a Solana token as a CAIP asset', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const mint = 'So11111111111111111111111111111111111111112';

    mockParams = {
      ...mockParams,
      position: buildPosition({
        chain: 'solana',
        tokenAddress: mint,
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
      }),
    };
    mockSheetData = buildSheetData({
      symbol: 'SOL',
      assetName: 'Solana',
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      chainId: solanaChainId,
      address: `${solanaChainId}/token:${mint}`,
      symbol: 'SOL',
      name: 'Solana',
      isNative: false,
    });
  });

  it('opens a non-EVM slip44 id as the native asset', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const assetId = `${solanaChainId}/slip44:501`;

    mockParams = {
      ...mockParams,
      position: buildPosition({
        chain: 'solana',
        tokenAddress: assetId,
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
      }),
    };
    mockSheetData = buildSheetData({
      symbol: 'SOL',
      assetName: 'Solana',
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Asset', {
      chainId: solanaChainId,
      address: assetId,
      symbol: 'SOL',
      name: 'Solana',
      isNative: true,
    });
  });

  it('keeps the sheet open when the token chain is unknown', () => {
    mockParams = {
      ...mockParams,
      position: buildPosition({ chain: 'not-a-chain' }),
    };

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the sheet open when the token address is missing', () => {
    mockParams = {
      ...mockParams,
      position: buildPosition({ tokenAddress: '' }),
    };

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens perps market details from the price header', () => {
    mockParams = {
      ...mockParams,
      position: buildPerpPosition(),
    };
    mockSheetData = buildSheetData({
      isPerp: true,
      symbol: 'BTC',
      assetName: 'BTC',
      leverage: 40,
      perpDirection: 'short',
      perpTradeSymbol: 'BTC',
    });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: expect.objectContaining({ symbol: 'BTC' }),
        source: 'trader_feed',
      },
    });
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER).props
        .accessibilityLabel,
    ).toContain('40x');
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER).props
        .accessibilityHint,
    ).toBe('Opens market details');
  });

  it('omits the leverage tag when a perp has none', () => {
    mockParams = {
      ...mockParams,
      position: buildPerpPosition(),
    };
    mockSheetData = perpData({ leverage: undefined });

    render(<PositionDetailsSheet />);

    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER).props
        .accessibilityLabel,
    ).toBe('BTC, $120, +3.49%, Today');
    expect(screen.queryByText(/\dx/)).toBeNull();
  });

  it('keeps the sheet open when a perp has no trade symbol', () => {
    mockParams = {
      ...mockParams,
      position: buildPerpPosition(),
    };
    mockSheetData = perpData({ perpTradeSymbol: undefined });

    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE_HEADER),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the trader profile from the header identity', () => {
    render(<PositionDetailsSheet />);

    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.IDENTITY),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(navigateToSocialV1Profile).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      expect.objectContaining({
        traderId: 'trader-1',
        traderName: 'satoshi',
        traderAddress: '0xTrader',
        source: 'trader_feed',
        viewerProfileId: 'viewer-1',
        viewerAddress: '0xViewer',
      }),
    );
  });

  describe('follow button', () => {
    it('follows the trader from the feed', () => {
      render(<PositionDetailsSheet />);

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.FOLLOW_BUTTON),
      );

      expect(mockToggleFollow).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'trader_feed',
          traderAddress: '0xTrader',
        }),
      );
    });

    it('reads Following once followed', () => {
      mockIsFollowing = true;

      render(<PositionDetailsSheet />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.FOLLOW_BUTTON),
      ).toHaveTextContent('Following');
    });

    it.each([
      ['profile id', { profileId: 'trader-1' }],
      [
        'linked address',
        { profileId: 'other', linkedAccountAddress: '0xtrader' },
      ],
    ])('is hidden on the viewer’s own post (by %s)', (_label, profile) => {
      mockProfile = profile;

      render(<PositionDetailsSheet />);

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.FOLLOW_BUTTON),
      ).toBeNull();
    });
  });

  describe('tabs', () => {
    const swipe = (gestureTestId: string, translationY: number) =>
      act(() => {
        fireGestureHandler(getByGestureTestId(gestureTestId), [
          { translationY: 0 },
          { translationY },
        ]);
      });

    it('opens collapsed so the footer stays in view', () => {
      render(<PositionDetailsSheet />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('toggles the active tab open and closed on tap', () => {
      render(<PositionDetailsSheet />);
      const postsTab = screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.POSTS_TAB,
      );

      fireEvent.press(postsTab);
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeOnTheScreen();

      fireEvent.press(postsTab);
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
    });

    it('stays open when switching to the other tab', () => {
      render(<PositionDetailsSheet />);

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRANSACTIONS_TAB),
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRANSACTIONS_LIST),
      ).toBeOnTheScreen();
    });

    const scrollBy = (y: number) =>
      fireEvent.scroll(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SCROLL),
        { nativeEvent: { contentOffset: { x: 0, y } } },
      );

    it('opens on a scroll up and closes on a swipe down over the tab bar', async () => {
      render(<PositionDetailsSheet />);

      scrollBy(40);
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeOnTheScreen();
      // GestureDetector swaps in the re-enabled gesture on a microtask.
      await act(async () => undefined);

      swipe(PositionDetailsSheetSelectorsIDs.TABS_COLLAPSE_GESTURE, 40);
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
    });

    it('ignores a scroll shorter than the threshold', () => {
      render(<PositionDetailsSheet />);

      scrollBy(10);

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
    });

    it('scrolls the sheet from the start and pins the footer only while open', () => {
      render(<PositionDetailsSheet />);
      const scroll = screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.SCROLL,
      );
      const copyTradeId = PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON;

      expect(scroll).toHaveProp('scrollEnabled', true);
      expect(within(scroll).getByTestId(copyTradeId)).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );

      expect(scroll).toHaveProp('scrollEnabled', true);
      expect(within(scroll).queryByTestId(copyTradeId)).toBeNull();
      expect(screen.getByTestId(copyTradeId)).toBeOnTheScreen();
    });

    it('closes when the sheet is pulled down past its top', () => {
      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );

      fireEvent(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SCROLL),
        'scrollEndDrag',
        { nativeEvent: { contentOffset: { x: 0, y: -80 } } },
      );

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
    });

    it('lists every comment on the position under Posts', () => {
      mockParams = {
        ...mockParams,
        position: buildPosition({
          trades: [
            buildTrade({
              comments: [
                buildComment({ uid: 'comment-2', text: 'Adding more' }),
                buildComment({ uid: 'comment-1', text: 'Shorting the top' }),
              ],
            }),
          ],
        }),
      };

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      ).toHaveTextContent(/Posts \(2\)/);
      expect(
        screen.getByTestId(
          `${PositionDetailsSheetSelectorsIDs.POST_ROW}-comment-1`,
        ),
      ).toHaveTextContent(/Shorting the top/);
      expect(
        screen.getByTestId(
          `${PositionDetailsSheetSelectorsIDs.POST_ROW}-comment-2`,
        ),
      ).toHaveTextContent(/Adding more/);
    });

    it('renders a post’s Klipy link as a GIF instead of text', () => {
      mockParams = {
        ...mockParams,
        position: buildPosition({
          trades: [
            buildTrade({
              comments: [
                buildComment({
                  uid: 'with-caption',
                  text: `Adding more\n${KLIPY_STATIC_GIF_EXAMPLE}`,
                }),
                buildComment({
                  uid: 'gif-only',
                  text: KLIPY_STATIC_GIF_EXAMPLE,
                }),
              ],
            }),
          ],
        }),
      };

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );

      const captioned = screen.getByTestId(
        `${PositionDetailsSheetSelectorsIDs.POST_ROW}-with-caption`,
      );
      expect(captioned).toHaveTextContent(/Adding more/);
      expect(captioned).not.toHaveTextContent(/klipy/);
      expect(
        screen.getByTestId(
          `${PositionDetailsSheetSelectorsIDs.POST_GIF}-with-caption`,
        ),
      ).toHaveProp('source', { uri: KLIPY_STATIC_GIF_EXAMPLE });
      expect(
        screen.getByTestId(
          `${PositionDetailsSheetSelectorsIDs.POST_GIF}-gif-only`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows the empty state when the position has no comments', () => {
      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_TAB),
      ).toHaveTextContent(/Posts \(0\)/);
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.POSTS_EMPTY),
      ).toBeOnTheScreen();
    });

    it('switches to the fills under Transactions', () => {
      mockParams = {
        ...mockParams,
        position: buildPosition({
          trades: [
            buildTrade({ transactionHash: '0xopen', action: 'opened' }),
            buildTrade({
              transactionHash: '0xadd',
              action: 'added',
              timestamp: NOW_MS - DAY_MS,
            }),
          ],
        }),
      };

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRANSACTIONS_TAB),
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRANSACTIONS_TAB),
      ).toHaveTextContent(/Transactions \(2\)/);
      expect(screen.getByTestId('trade-row-0xadd')).toBeOnTheScreen();
      expect(screen.getByTestId('trade-row-0xopen')).toBeOnTheScreen();
      expect(
        screen.getByTestId('trade-row-value-avatar-0xopen'),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('trade-row-0xopen')).UNSAFE_getByProps({
          name: IconName.Add,
        }),
      ).toBeTruthy();
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_EMPTY),
      ).toBeNull();
    });
  });

  describe('footer', () => {
    it('copies an open perp with the trader’s side and leverage', () => {
      mockParams = { ...mockParams, position: buildPerpPosition() };
      mockSheetData = perpData();

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(mockOpenPerpsOrder).toHaveBeenCalledWith({
        direction: 'short',
        asset: 'BTC',
        leverage: 40,
      });
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('PerpsModals');
    });

    it('dismisses the sheet and copies an open spot position through QuickBuy', () => {
      render(<PositionDetailsSheet />);

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(screen.getByTestId('quick-buy-sheet')).toHaveTextContent('buy');
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.CONTAINER),
      ).toBeNull();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('leaves the route once QuickBuy closes', () => {
      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      fireEvent.press(screen.getByTestId('quick-buy-sheet'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('skips copy trade when social terms are not accepted', () => {
      mockEnsureSocialTermsAccepted.mockReturnValue(false);
      mockParams = { ...mockParams, position: buildPerpPosition() };
      mockSheetData = perpData();

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(mockOpenPerpsOrder).not.toHaveBeenCalled();
    });

    it('skips copy trade when there is no linked social wallet', () => {
      mockEnsureSocialProfileOnboarding.mockReturnValue(false);
      mockParams = { ...mockParams, position: buildPerpPosition() };
      mockSheetData = perpData();

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(mockOpenPerpsOrder).not.toHaveBeenCalled();
    });

    it('offers Long and Short on a closed perp', () => {
      mockParams = { ...mockParams, position: buildPerpPosition() };
      mockSheetData = perpData({ isClosed: true });

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.LONG_BUTTON),
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON,
        ),
      ).toBeNull();
      expect(mockOpenPerpsOrder).toHaveBeenCalledWith({
        direction: 'long',
        asset: 'BTC',
        leverage: undefined,
      });
    });

    it('opens Long on a closed perp without a linked social wallet', () => {
      mockEnsureSocialProfileOnboarding.mockReturnValue(false);
      mockParams = { ...mockParams, position: buildPerpPosition() };
      mockSheetData = perpData({ isClosed: true });

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.LONG_BUTTON),
      );

      expect(mockOpenPerpsOrder).toHaveBeenCalledWith({
        direction: 'long',
        asset: 'BTC',
        leverage: undefined,
      });
    });

    it('plays a primary haptic when Buy is pressed', () => {
      mockSheetData = buildSheetData({ isClosed: true });

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      );

      expect(fireImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
    });

    it('offers only Buy on a closed spot position the viewer does not hold', () => {
      mockSheetData = buildSheetData({ isClosed: true });

      render(<PositionDetailsSheet />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      ).toBeNull();
    });

    it('adds Sell when the viewer holds the token', () => {
      mockSheetData = buildSheetData({ isClosed: true });
      mockHeldBalance = { balance: '1' };

      render(<PositionDetailsSheet />);
      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      );

      expect(screen.getByTestId('quick-buy-sheet')).toHaveTextContent('sell');
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.CONTAINER),
      ).toBeNull();
    });
  });

  it('shows the trade summary without navigating away on tap', () => {
    render(<PositionDetailsSheet />);
    const summary = screen.getByTestId(
      PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY,
    );

    fireEvent.press(summary);

    expect(within(summary).getByText('2 PEPE')).toBeOnTheScreen();
    expect(within(summary).getByText('Opened · 2 hr ago')).toBeOnTheScreen();
    expect(summary).toHaveTextContent(/\+\$40\.00/);
    expect(within(summary).queryByTestId('position-token-avatar')).toBeNull();
  });

  it('shows a direction tag and colors a loss', () => {
    mockSheetData = buildSheetData({
      summaryTagLabel: '40x Short',
      perpDirection: 'short',
      isPnlPositive: false,
      pnlValueLabel: '-$1.86',
      pnlPercentLabel: '-10.38%',
      summarySubtitle: '',
    });

    render(<PositionDetailsSheet />);
    const summary = screen.getByTestId(
      PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY,
    );

    expect(within(summary).getByText('40x Short')).toBeOnTheScreen();
    expect(within(summary).getByText('-$1.86')).toBeOnTheScreen();
    expect(within(summary).queryByText('Opened · 2 hr ago')).toBeNull();
  });

  it('shows a long tag', () => {
    mockSheetData = buildSheetData({
      summaryTagLabel: '2x Long',
      perpDirection: 'long',
    });

    render(<PositionDetailsSheet />);

    expect(
      within(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY),
      ).getByText('2x Long'),
    ).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
