import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import PerpsFlipPositionConfirmSheet from './PerpsFlipPositionConfirmSheet';
import type { Position } from '../../controllers/types';

const mockHandleFlipPosition = jest.fn();
let mockIsFlipping = false;

// Mock dependencies
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      success: { default: '#00FF00' },
      error: { default: '#FF0000' },
      border: { muted: '#CCCCCC' },
      background: { alternative: '#F5F5F5' },
    },
  }),
}));

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
  strings: jest.fn((key) => {
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
    };
    return translations[key] || key;
  }),
}));

jest.mock('../../hooks', () => ({
  usePerpsOrderFees: () => ({
    totalFee: 0.5,
    makerFee: 0.2,
    takerFee: 0.3,
    isLoadingMetamaskFee: false,
  }),
  usePerpsRewards: () => ({
    shouldShowRewardsRow: false,
    estimatedPoints: undefined,
    accountOptedIn: false,
    feeDiscountPercentage: 0,
    hasError: false,
    bonusBips: 0,
  }),
  usePerpsMeasurement: jest.fn(),
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

jest.mock('../../utils/marketUtils', () => ({
  getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
}));

jest.mock('../PerpsFeesDisplay', () => {
  const ReactModule = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return function MockPerpsFeesDisplay({
    formatFeeText,
  }: {
    formatFeeText: string;
  }) {
    return ReactModule.createElement(Text, null, formatFeeText);
  };
});

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

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        ({ children }: { children: React.ReactNode }, _ref: unknown) =>
          ReactModule.createElement(View, { testID: 'bottom-sheet' }, children),
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return ReactModule.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        children,
      );
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      ButtonsAlignment: { Horizontal: 'Horizontal' },
      default: function MockBottomSheetFooter({
        buttonPropsArray,
      }: {
        buttonPropsArray: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) {
        return ReactModule.createElement(
          View,
          { testID: 'bottom-sheet-footer' },
          buttonPropsArray.map(
            (
              button: {
                label: string;
                onPress: () => void;
                disabled?: boolean;
              },
              index: number,
            ) =>
              ReactModule.createElement(
                TouchableOpacity,
                {
                  key: index,
                  onPress: button.onPress,
                  disabled: button.disabled,
                  testID: `footer-button-${index}`,
                },
                ReactModule.createElement(Text, null, button.label),
              ),
          ),
        );
      },
    };
  },
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactModule = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockText({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) {
      return ReactModule.createElement(Text, { testID }, children);
    },
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: () => null,
  IconName: { Arrow2Right: 'Arrow2Right' },
  IconSize: { Md: 'Md' },
  IconColor: { Default: 'Default' },
}));

jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: { Lg: 'Lg' },
  ButtonVariants: { Primary: 'Primary', Secondary: 'Secondary' },
}));

describe('PerpsFlipPositionConfirmSheet', () => {
  const mockLongPosition: Position = {
    coin: 'ETH',
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
      expect(mockHandleFlipPosition).toHaveBeenCalledWith(mockLongPosition);
    });
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
});
