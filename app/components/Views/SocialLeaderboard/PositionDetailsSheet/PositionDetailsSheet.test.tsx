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
import { KLIPY_STATIC_GIF_EXAMPLE } from '../../../UI/SocialFeed/utils/klipyGifComment';
import type { UseOpenPerpsOrderOptions } from '../../../UI/SocialFeed/hooks/useOpenPerpsOrder';
import type { PositionSheetData } from './hooks/usePositionSheetData';
import PositionDetailsSheet from './PositionDetailsSheet';
import { PositionDetailsSheetSelectorsIDs } from './PositionDetailsSheet.testIds';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';
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
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="position-sheet-chart" />,
  };
});

jest.mock('../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

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
  levels: [],
  isMarketCapMode: false,
  formatValue: (price) => `$${price}`,
  currentPrice: 120,
  dailyChangePercent: 3.49,
  marketCap: undefined,
  summaryTitle: '2 PEPE',
  summarySubtitle: '$240.00',
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
    ).toHaveTextContent("satoshi's trade");
    expect(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.PRICE),
    ).toHaveTextContent('$120');
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

    it('opens on a swipe up and closes on a swipe down over the tab bar', async () => {
      render(<PositionDetailsSheet />);

      swipe(PositionDetailsSheetSelectorsIDs.DETAILS_EXPAND_GESTURE, -40);
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

    it('ignores swipes shorter than the threshold', () => {
      render(<PositionDetailsSheet />);

      swipe(PositionDetailsSheetSelectorsIDs.DETAILS_EXPAND_GESTURE, -10);

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.POSTS_LIST),
      ).toBeNull();
    });

    it('scrolls the sheet with the footer pinned below only while open', () => {
      render(<PositionDetailsSheet />);
      const scroll = screen.getByTestId(
        PositionDetailsSheetSelectorsIDs.SCROLL,
      );
      const copyTradeId = PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON;

      expect(scroll).toHaveProp('scrollEnabled', false);
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

    expect(summary).toHaveTextContent(/2 PEPE/);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
