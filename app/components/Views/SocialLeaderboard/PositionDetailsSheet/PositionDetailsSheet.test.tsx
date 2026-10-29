import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { UseOpenPerpsOrderOptions } from '../../../UI/SocialFeed/hooks/useOpenPerpsOrder';
import type { PositionSheetData } from './hooks/usePositionSheetData';
import PositionDetailsSheet from './PositionDetailsSheet';
import { PositionDetailsSheetSelectorsIDs } from './PositionDetailsSheet.testIds';
import type { PositionDetailsSheetParams } from './PositionDetailsSheet.types';
import {
  buildAuthor,
  buildPerpPosition,
  buildPosition,
} from './positionDetailsSheet.fixtures';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOpenPerpsOrder = jest.fn();
const mockToggleFollow = jest.fn();
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

jest.mock('../TraderPositionView/hooks/useTraderPosition', () => ({
  useTraderPosition: () => ({ position: undefined, isLoading: false }),
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
    }: {
      isVisible: boolean;
      initialTradeMode?: string;
    }) =>
      isVisible ? (
        <Text testID="quick-buy-sheet">{initialTradeMode}</Text>
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

  describe('post message', () => {
    it('renders the comment when the post has one', () => {
      mockParams = { ...mockParams, comment: 'Shorting the top' };

      render(<PositionDetailsSheet />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COMMENT),
      ).toHaveTextContent('Shorting the top');
    });

    it('is omitted for a trade', () => {
      render(<PositionDetailsSheet />);

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.COMMENT),
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

    it('copies an open spot position through QuickBuy', () => {
      render(<PositionDetailsSheet />);

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(screen.getByTestId('quick-buy-sheet')).toHaveTextContent('buy');
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
    });
  });

  it('opens the trade details from the summary', () => {
    const position = buildPosition();
    mockParams = { ...mockParams, position };

    render(<PositionDetailsSheet />);
    fireEvent.press(
      screen.getByTestId(PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY),
    );

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({
        position,
        positionId: 'position-1',
        traderId: 'trader-1',
        source: 'trader_feed',
        isSocialV1: true,
      }),
    );
  });
});
