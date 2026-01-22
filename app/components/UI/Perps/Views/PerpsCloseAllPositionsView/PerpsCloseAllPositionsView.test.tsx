import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsCloseAllPositionsView from './PerpsCloseAllPositionsView';
import {
  usePerpsLivePositions,
  usePerpsCloseAllCalculations,
  usePerpsCloseAllPositions,
  usePerpsRewardAccountOptedIn,
} from '../../hooks';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn(), goBack: jest.fn() })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../hooks', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsCloseAllCalculations: jest.fn(),
  usePerpsCloseAllPositions: jest.fn(),
  usePerpsRewardAccountOptedIn: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({ showToast: jest.fn() })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      accent03: { normal: '#00ff00', dark: '#008800' },
      accent01: { light: '#ffcccc', dark: '#cc0000' },
      primary: { default: '#0000ff' },
      background: { default: '#ffffff' },
    },
  })),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual<typeof React>('react');
    return mockReact.forwardRef(
      (props: { children: React.ReactNode }, _ref) => <>{props.children}</>,
    );
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => 'BottomSheetHeader',
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) => (
        <View>
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              onPress={buttonProps.onPress}
              disabled={buttonProps.disabled}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      ButtonsAlignment: {
        Horizontal: 'Horizontal',
        Vertical: 'Vertical',
      },
    };
  },
);

jest.mock('../../components/PerpsCloseSummary', () => 'PerpsCloseSummary');

const mockUsePerpsLivePositions = usePerpsLivePositions as jest.MockedFunction<
  typeof usePerpsLivePositions
>;
const mockUsePerpsCloseAllCalculations =
  usePerpsCloseAllCalculations as jest.MockedFunction<
    typeof usePerpsCloseAllCalculations
  >;
const mockUsePerpsCloseAllPositions =
  usePerpsCloseAllPositions as jest.MockedFunction<
    typeof usePerpsCloseAllPositions
  >;
const mockUsePerpsRewardAccountOptedIn =
  usePerpsRewardAccountOptedIn as jest.MockedFunction<
    typeof usePerpsRewardAccountOptedIn
  >;

describe('PerpsCloseAllPositionsView', () => {
  const mockPositions = [
    {
      symbol: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      positionValue: '25000',
      unrealizedPnl: '100',
      marginUsed: '1000',
      leverage: { type: 'cross' as const, value: 25 },
      liquidationPrice: '48000',
      maxLeverage: 50,
      returnOnEquity: '10',
      cumulativeFunding: {
        allTime: '0',
        sinceOpen: '0',
        sinceChange: '0',
      },
      roi: '10',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      takeProfitCount: 0,
      stopLossCount: 0,
      marketPrice: '50200',
      timestamp: Date.now(),
    },
  ];

  const mockCalculations = {
    totalMargin: 1000,
    totalPnl: 100,
    totalFees: 10,
    receiveAmount: 1090,
    totalEstimatedPoints: 50,
    avgFeeDiscountPercentage: 5,
    avgBonusBips: 10,
    avgMetamaskFeeRate: 0.01,
    avgProtocolFeeRate: 0.00045,
    avgOriginalMetamaskFeeRate: 0.015,
    isLoading: false,
    isFetchingInBackground: false,
    hasError: false,
    shouldShowRewards: true,
  };

  const mockCloseAllHook = {
    isClosing: false,
    positionCount: 1,
    handleCloseAll: jest.fn(),
    handleKeepPositions: jest.fn(),
    error: null,
  };

  const mockRewardAccountOptedIn = {
    accountOptedIn: true,
    account: {
      id: 'test-account-id',
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Account',
      metadata: {
        name: 'Test Account',
        keyring: {
          type: 'HD Key Tree',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });
    mockUsePerpsCloseAllCalculations.mockReturnValue(mockCalculations);
    mockUsePerpsCloseAllPositions.mockReturnValue(mockCloseAllHook);
    mockUsePerpsRewardAccountOptedIn.mockReturnValue({
      accountOptedIn: true,
      account: mockRewardAccountOptedIn as unknown as InternalAccount,
    });
  });

  it('renders loading state when initially loading positions', () => {
    // Arrange
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: true,
    });

    // Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.title')).toBeTruthy();
  });

  it('renders empty state when no positions', () => {
    // Arrange
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    // Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.position.no_positions')).toBeTruthy();
  });

  it('renders close all positions view with positions', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.title')).toBeTruthy();
    expect(getByText('perps.close_all_modal.description')).toBeTruthy();
  });

  it('renders loading state when closing', () => {
    // Arrange
    mockUsePerpsCloseAllPositions.mockReturnValue({
      ...mockCloseAllHook,
      isClosing: true,
    });

    // Act
    const { getAllByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    const closingElements = getAllByText('perps.close_all_modal.closing');
    expect(closingElements.length).toBeGreaterThan(0);
  });

  it('displays footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.keep_positions')).toBeTruthy();
    expect(getByText('perps.close_all_modal.close_all')).toBeTruthy();
  });

  it('shows closing label on close button when in progress', () => {
    // Arrange
    mockUsePerpsCloseAllPositions.mockReturnValue({
      ...mockCloseAllHook,
      isClosing: true,
    });

    // Act
    const { getAllByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    const closingElements = getAllByText('perps.close_all_modal.closing');
    expect(closingElements.length).toBeGreaterThan(0);
  });

  it('renders with empty positions gracefully', () => {
    // Arrange
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    // Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.position.no_positions')).toBeTruthy();
  });

  it('renders PerpsCloseSummary when not closing', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.description')).toBeTruthy();
  });

  it('calls usePerpsRewardAccountOptedIn with totalEstimatedPoints', () => {
    // Arrange & Act
    render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalledWith(
      mockCalculations.totalEstimatedPoints,
    );
  });

  it('passes accountOptedIn and rewardsAccount to PerpsCloseSummary', () => {
    // Arrange
    const mockAccount = {
      id: 'test-account-id',
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Account',
      metadata: {
        name: 'Test Account',
        keyring: {
          type: 'HD Key Tree',
        },
      },
    };
    mockUsePerpsRewardAccountOptedIn.mockReturnValue({
      accountOptedIn: true,
      account: mockAccount as unknown as InternalAccount,
    });

    // Act
    render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalled();
  });

  it('handles null accountOptedIn value', () => {
    // Arrange
    mockUsePerpsRewardAccountOptedIn.mockReturnValue({
      accountOptedIn: null,
      account: null,
    });

    // Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.description')).toBeTruthy();
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalled();
  });

  it('handles false accountOptedIn value', () => {
    // Arrange
    mockUsePerpsRewardAccountOptedIn.mockReturnValue({
      accountOptedIn: false,
      account: null,
    });

    // Act
    const { getByText } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(getByText('perps.close_all_modal.description')).toBeTruthy();
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalled();
  });
});
