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
import { PerpsCloseAllPositionsViewSelectorsIDs } from '../../Perps.testIds';

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

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

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
      timestamp: 1700000000000, // fixed epoch ms – 2023-11-14T22:13:20.000Z
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
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.TITLE),
    ).toBeOnTheScreen();
  });

  it('renders empty state when no positions', () => {
    // Arrange
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    // Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
  });

  it('renders close all positions view with positions', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.TITLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
  });

  it('renders loading state when closing', () => {
    // Arrange
    mockUsePerpsCloseAllPositions.mockReturnValue({
      ...mockCloseAllHook,
      isClosing: true,
    });

    // Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.CLOSING_STATE),
    ).toBeOnTheScreen();
  });

  it('displays footer buttons with correct labels', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.KEEP_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.CLOSE_ALL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows closing label on close button when in progress', () => {
    // Arrange
    mockUsePerpsCloseAllPositions.mockReturnValue({
      ...mockCloseAllHook,
      isClosing: true,
    });

    // Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.CLOSE_ALL_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.CLOSING_STATE),
    ).toBeOnTheScreen();
  });

  it('renders with empty positions gracefully', () => {
    // Arrange
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    // Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
  });

  it('renders PerpsCloseSummary when not closing', () => {
    // Arrange & Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
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
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalled();
  });

  it('handles false accountOptedIn value', () => {
    // Arrange
    mockUsePerpsRewardAccountOptedIn.mockReturnValue({
      accountOptedIn: false,
      account: null,
    });

    // Act
    const { getByTestId } = render(<PerpsCloseAllPositionsView />);

    // Assert
    expect(
      getByTestId(PerpsCloseAllPositionsViewSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(mockUsePerpsRewardAccountOptedIn).toHaveBeenCalled();
  });
});
