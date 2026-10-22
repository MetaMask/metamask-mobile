import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import PerpsFlipPositionConfirmSheet from './PerpsFlipPositionConfirmSheet';
import { type Position } from '@metamask/perps-controller';
import { usePerpsOrderFees } from '../../hooks';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import { PerpsFlipPositionConfirmSheetSelectorsIDs } from '../../Perps.testIds';

const mockHandleFlipPosition = jest.fn();
let mockIsFlipping = false;
let mockRewardsDiscount = 0;

// Mock dependencies
jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});
jest.mock('../../../../../util/haptics');

jest.mock('./PerpsFlipPositionConfirmSheet.styles', () => () => ({
  contentContainer: {},
  loadingContainer: {},
  loadingText: {},
  detailsWrapper: {},
  detailItem: {},
  detailItemFirst: {},
  detailItemLast: {},
  detailItemWrapper: {},
  infoRow: {},
  directionContainer: {},
  footerContainer: {},
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.flip_position.title': 'Flip Position',
      'perps.flip_position.direction': 'Direction',
      'perps.flip_position.est_size': 'Est. Size',
      'perps.flip_position.cancel': 'Cancel',
      'perps.flip_position.flip': 'Flip',
      'perps.flip_position.flipping': 'Flipping...',
      'perps.order.long_label': 'Long',
      'perps.order.short_label': 'Short',
      'perps.order.fees': 'Fees',
      'perps.estimated_points': 'Est. Points',
      'pro_subscription.pro': 'Orange',
      'perps.fees_row.member_accessibility_label': '{{plan}} member',
      'perps.fees_row.was': 'was {{fee}}',
      'perps.fees_row.info_accessibility_label': 'About fees',
    };
    const template = translations[key] || key;
    return Object.entries(params ?? {}).reduce(
      (text, [name, value]) => text.replace(`{{${name}}}`, value),
      template,
    );
  }),
}));

jest.mock('../../hooks', () => ({
  useMinimumOrderAmount: () => ({
    minimumOrderAmount: 10,
    isLoading: false,
    error: null,
  }),
  usePerpsOrderFees: jest.fn(() => ({
    totalFee: 0.5,
    undiscountedTotalFee: 0.5,
    makerFee: 0.2,
    takerFee: 0.3,
    isLoadingMetamaskFee: false,
  })),
  usePerpsRewards: () => ({
    shouldShowRewardsRow: false,
    estimatedPoints: undefined,
    accountOptedIn: false,
    feeDiscountPercentage: mockRewardsDiscount,
    hasError: false,
    bonusBips: 0,
  }),
  usePerpsMeasurement: jest.fn(),
}));
jest.mock('../PerpsTradeBottomSheet/PerpsTradeNestedScreens', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    PerpsInlineFeesInfoScreen: ({
      data,
      onBack,
      onOpenOrangeInfo,
    }: {
      data: { feeSource?: string; metamaskFeeRate?: number };
      onBack: () => void;
      onOpenOrangeInfo: () => void;
    }) => (
      <View testID="inline-fees-info">
        <Text>{`${data.feeSource}:${data.metamaskFeeRate}`}</Text>
        <Pressable testID="inline-fees-back" onPress={onBack} />
        <Pressable testID="inline-fees-orange" onPress={onOpenOrangeInfo} />
      </View>
    ),
    PerpsInlineOrangeFeesInfoScreen: ({ onBack }: { onBack: () => void }) => (
      <Pressable testID="inline-orange-info" onPress={onBack} />
    ),
  };
});
jest.mock('../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="rewards-vip-badge" />,
  };
});
const mockPerpsRebateBanner = jest.fn(
  (_props: Record<string, unknown>) => null,
);
jest.mock('../PerpsRebateBanner', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockPerpsRebateBanner(props),
}));

jest.mock('../../hooks/usePerpsFlipPosition', () => ({
  usePerpsFlipPosition: ({ onSuccess }: { onSuccess?: () => void }) => ({
    handleFlipPosition: mockHandleFlipPosition.mockImplementation(async () => {
      onSuccess?.();
    }),
    isFlipping: mockIsFlipping,
  }),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: () => ({
    ETH: { price: '2500', markPrice: '2502' },
    BTC: { price: '50000', markPrice: '50010' },
  }),
  usePerpsTopOfBook: () => ({
    bestAsk: '2501',
    bestBid: '2499',
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value) => `$${value.toFixed(2)}`),
  PRICE_RANGES_MINIMAL_VIEW: {},
}));

jest.mock('@metamask/perps-controller', () => {
  const actual = jest.requireActual(
    '@metamask/perps-controller',
  ) as typeof import('@metamask/perps-controller');

  return {
    ...actual,
    getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
  };
});

jest.mock('../../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => null,
}));

jest.mock('../../../Rewards/components/RewardPointsAnimation', () => ({
  __esModule: true,
  default: () => null,
  RewardAnimationState: {
    Idle: 'Idle',
    Loading: 'Loading',
    ErrorState: 'ErrorState',
  },
}));

jest.mock('../../../../../util/trace', () => ({
  TraceName: {
    PerpsFlipPositionSheet: 'PerpsFlipPositionSheet',
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Icon: ({ name }: { name: string }) =>
      ReactModule.createElement(View, { accessibilityLabel: name }),
  };
});

describe('PerpsFlipPositionConfirmSheet', () => {
  const mockLongPosition: Position = {
    symbol: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const mockShortPosition: Position = {
    ...mockLongPosition,
    size: '-2.5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFlipping = false;
    mockRewardsDiscount = 0;
    (usePerpsOrderFees as jest.Mock).mockReturnValue({
      totalFee: 0.5,
      makerFee: 0.2,
      takerFee: 0.3,
      isLoadingMetamaskFee: false,
    });
  });

  it('renders the flip position title', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Flip Position')).toBeOnTheScreen();
  });

  it('renders direction labels', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Direction')).toBeOnTheScreen();
    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('Short')).toBeOnTheScreen();
  });

  it('renders direction for short position', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockShortPosition} />);

    expect(screen.getByText('Short')).toBeOnTheScreen();
    expect(screen.getByText('Long')).toBeOnTheScreen();
  });

  it('renders estimated size', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Est. Size')).toBeOnTheScreen();
    expect(screen.getByText('2.5 ETH')).toBeOnTheScreen();
  });

  it('renders fees label', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Fees')).toBeOnTheScreen();
  });

  it('renders the rebate banner with flip metadata', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(mockPerpsRebateBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: 'ETH',
        containerTwClassName: 'px-4 mb-3',
        direction: 'short',
      }),
    );
  });

  it('renders cancel button', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Cancel')).toBeOnTheScreen();
  });

  it('renders flip button', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByText('Flip')).toBeOnTheScreen();
  });

  it('calls handleFlipPosition when flip button is pressed', async () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    fireEvent.press(screen.getByText('Flip'));

    await waitFor(() => {
      expect(mockHandleFlipPosition).toHaveBeenCalledWith(
        mockLongPosition,
        expect.objectContaining({
          totalFee: expect.any(Number),
          marketPrice: expect.any(Number),
        }),
      );
    });
    expect(playImpact).not.toHaveBeenCalled();
  });

  it('plays PrimaryCTA once for an opted-in flip confirmation', async () => {
    render(
      <PerpsFlipPositionConfirmSheet
        position={mockLongPosition}
        enableHaptics
      />,
    );

    fireEvent.press(screen.getByText('Flip'));

    await waitFor(() => {
      expect(mockHandleFlipPosition).toHaveBeenCalled();
    });
    expect(playImpact).toHaveBeenCalledTimes(1);
    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
  });

  it('calls onClose when cancel button is pressed', () => {
    const mockOnClose = jest.fn();
    render(
      <PerpsFlipPositionConfirmSheet
        position={mockLongPosition}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onConfirm after successful flip', async () => {
    const mockOnConfirm = jest.fn();
    const mockOnClose = jest.fn();
    render(
      <PerpsFlipPositionConfirmSheet
        position={mockLongPosition}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    fireEvent.press(screen.getByText('Flip'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('displays the position size correctly for short position', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockShortPosition} />);

    // Math.abs(-2.5) = 2.5
    expect(screen.getByText('2.5 ETH')).toBeOnTheScreen();
  });

  it('uses ArrowRight (not Arrow2Right) for direction transition indicator', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    expect(screen.getByLabelText('ArrowRight')).toBeOnTheScreen();
  });

  it('passes 2x position notional to usePerpsOrderFees for accurate fee estimate', () => {
    render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

    // ETH position: size=2.5, markPrice=2502 → 2x notional = 2.5 * 2 * 2502 = 12510
    expect(usePerpsOrderFees).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '12510' }),
    );
  });

  describe('fees row', () => {
    const memberFees = {
      totalFee: 2.54,
      undiscountedTotalFee: 3.54,
      metamaskFeeRate: 0.00059,
      protocolFeeRate: 0.00045,
      originalMetamaskFeeRate: 0.001,
      feeDiscountPercentage: 41,
      feeSource: 'subscription',
      isLoadingMetamaskFee: false,
    };

    it('shows the shared Fees row with the Orange chip for a member', () => {
      mockRewardsDiscount = 41;
      (usePerpsOrderFees as jest.Mock).mockReturnValue(memberFees);

      render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

      const { FEES_ROW, FEES_VALUE } =
        PerpsFlipPositionConfirmSheetSelectorsIDs;
      expect(screen.getByText('Fees')).toBeOnTheScreen();
      expect(screen.getByTestId(`${FEES_ROW}-member-chip`)).toHaveTextContent(
        'Orange',
      );
      expect(screen.getByTestId(`${FEES_VALUE}-original`)).toHaveTextContent(
        '$3.54',
      );
      expect(screen.getByTestId(FEES_VALUE)).toHaveTextContent('$2.54');
      expect(screen.queryByTestId('rewards-vip-badge')).not.toBeOnTheScreen();
      expect(screen.getByTestId(FEES_ROW).props.accessibilityLabel).toBe(
        'Fees, Orange member, $2.54, was $3.54. About fees',
      );
    });

    it('keeps the plain fee for a non-member', () => {
      render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

      const { FEES_ROW, FEES_VALUE } =
        PerpsFlipPositionConfirmSheetSelectorsIDs;
      expect(screen.getByTestId(FEES_VALUE)).toHaveTextContent('$0.50');
      expect(
        screen.queryByTestId(`${FEES_ROW}-member-chip`),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(`${FEES_VALUE}-original`),
      ).not.toBeOnTheScreen();
    });

    it('keeps the VIP badge and strike-through for a VIP discount', () => {
      mockRewardsDiscount = 20;
      (usePerpsOrderFees as jest.Mock).mockReturnValue({
        ...memberFees,
        totalFee: 3.2,
        undiscountedTotalFee: 3.54,
        feeSource: 'rewards',
      });

      render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

      const { FEES_ROW } = PerpsFlipPositionConfirmSheetSelectorsIDs;
      expect(screen.getByTestId('rewards-vip-badge')).toBeOnTheScreen();
      expect(
        screen.queryByTestId(`${FEES_ROW}-member-chip`),
      ).not.toBeOnTheScreen();
    });

    it('opens the fee breakdown inline and the Orange explainer from it', () => {
      mockRewardsDiscount = 41;
      (usePerpsOrderFees as jest.Mock).mockReturnValue(memberFees);

      render(<PerpsFlipPositionConfirmSheet position={mockLongPosition} />);

      fireEvent.press(
        screen.getByTestId(PerpsFlipPositionConfirmSheetSelectorsIDs.FEES_ROW),
      );
      expect(screen.getByTestId('inline-fees-info')).toBeOnTheScreen();
      expect(screen.getByText('subscription:0.00059')).toBeOnTheScreen();
      expect(screen.queryByText('Flip Position')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('inline-fees-orange'));
      expect(screen.getByTestId('inline-orange-info')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('inline-orange-info'));
      expect(screen.getByTestId('inline-fees-info')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('inline-fees-back'));
      expect(screen.getByText('Flip Position')).toBeOnTheScreen();
    });
  });
});
