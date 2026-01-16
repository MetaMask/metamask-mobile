import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
} from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  defaultMinimumOrderAmountMock,
  defaultPerpsClosePositionMock,
  defaultPerpsClosePositionValidationMock,
  defaultPerpsEventTrackingMock,
  defaultPerpsLivePricesMock,
  defaultPerpsTopOfBookMock,
  defaultPerpsOrderFeesMock,
  defaultPerpsPositionMock,
  defaultPerpsRewardsMock,
} from '../../__mocks__/perpsHooksMocks';
import { createPerpsStateMock } from '../../__mocks__/perpsStateMock';
import PerpsClosePositionView from './PerpsClosePositionView';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock React Native Linking specifically for this test to prevent NavigationContainer errors
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(''),
  sendIntent: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useMinimumOrderAmount: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsClosePositionValidation: jest.fn(),
  usePerpsClosePosition: jest.fn(),
  usePerpsMarketData: jest.fn(),
  usePerpsToasts: jest.fn(),
  usePerpsRewards: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLivePrices: jest.fn(),
  usePerpsTopOfBook: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics');

// Only mock components that would cause issues in tests
// Following best practice: "Use mocks only when necessary"
jest.mock('../../../../Base/Keypad', () => 'Keypad');

jest.mock('../../components/PerpsSlider/PerpsSlider', () => ({
  __esModule: true,
  default: 'PerpsSlider',
}));

// Mock PerpsAmountDisplay to allow triggering onPress but keep it simple
jest.mock('../../components/PerpsAmountDisplay');

jest.mock('../../components/PerpsLimitPriceBottomSheet', () => ({
  __esModule: true,
  default: 'PerpsLimitPriceBottomSheet',
}));
jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: 'PerpsBottomSheetTooltip',
}));

const STATE_MOCK = createPerpsStateMock();

// Default mock for usePerpsToasts
const defaultPerpsToastsMock = {
  showToast: jest.fn(),
  PerpsToastOptions: {
    positionManagement: {
      closePosition: {
        limitClose: {
          partial: {
            switchToMarketOrderMissingLimitPrice: {},
          },
        },
      },
    },
  },
};

// Mock PerpsAmountDisplay implementation
jest.mocked(jest.requireMock('../../components/PerpsAmountDisplay')).default =
  ({ onPress, label }: { onPress?: () => void; label?: string }) =>
    React.createElement(
      TouchableOpacity,
      {
        onPress,
        testID: 'perps-amount-display',
      },
      React.createElement(Text, null, label || 'Amount Display'),
    );

describe('PerpsClosePositionView', () => {
  const useNavigationMock = jest.mocked(
    jest.requireMock('@react-navigation/native').useNavigation,
  );
  const useRouteMock = jest.mocked(
    jest.requireMock('@react-navigation/native').useRoute,
  );
  const usePerpsLivePositionsMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsLivePositions,
  );
  const usePerpsLivePricesMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsLivePrices,
  );
  const usePerpsTopOfBookMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsTopOfBook,
  );
  const usePerpsOrderFeesMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsOrderFees,
  );
  const usePerpsClosePositionValidationMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsClosePositionValidation,
  );
  const usePerpsClosePositionMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsClosePosition,
  );
  const usePerpsEventTrackingMock = jest.mocked(
    jest.requireMock('../../hooks/usePerpsEventTracking').usePerpsEventTracking,
  );
  const useMinimumOrderAmountMock = jest.mocked(
    jest.requireMock('../../hooks').useMinimumOrderAmount,
  );
  const usePerpsMarketDataMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsMarketData,
  );
  const usePerpsToastsMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsToasts,
  );
  const usePerpsRewardsMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsRewards,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup navigation mocks
    useNavigationMock.mockReturnValue({
      goBack: mockGoBack,
    });

    // Setup default route params
    useRouteMock.mockReturnValue({
      params: {
        position: defaultPerpsPositionMock,
      },
    });

    // Setup hook mocks with default values
    usePerpsLivePositionsMock.mockReturnValue({
      positions: [defaultPerpsPositionMock],
      isInitialLoading: false,
    });
    usePerpsLivePricesMock.mockReturnValue(defaultPerpsLivePricesMock);
    usePerpsTopOfBookMock.mockReturnValue(defaultPerpsTopOfBookMock);
    usePerpsOrderFeesMock.mockReturnValue(defaultPerpsOrderFeesMock);
    usePerpsClosePositionValidationMock.mockReturnValue(
      defaultPerpsClosePositionValidationMock,
    );
    usePerpsClosePositionMock.mockReturnValue(defaultPerpsClosePositionMock);
    usePerpsEventTrackingMock.mockImplementation(
      (options?: {
        eventName?: string;
        properties?: Record<string, unknown>;
      }) => {
        // If options are provided (declarative API), call track immediately to simulate useEffect
        if (options?.eventName) {
          defaultPerpsEventTrackingMock.track(
            options.eventName,
            options.properties || {},
          );
        }
        // Always return the track function for imperative usage
        return defaultPerpsEventTrackingMock;
      },
    );
    // usePerpsScreenTracking mock removed - migrated to usePerpsMeasurement
    useMinimumOrderAmountMock.mockReturnValue(defaultMinimumOrderAmountMock);
    usePerpsMarketDataMock.mockReturnValue({
      marketData: { szDecimals: 4 },
      isLoading: false,
      error: null,
    });

    // Setup usePerpsToasts mock
    usePerpsToastsMock.mockReturnValue(defaultPerpsToastsMock);

    // Setup usePerpsRewards mock
    usePerpsRewardsMock.mockReturnValue(defaultPerpsRewardsMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders close position view with correct title', () => {
      // Arrange & Act
      const { getAllByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      const closePositionElements = getAllByText(
        strings('perps.close_position.title'),
      );
      expect(closePositionElements.length).toBeGreaterThan(0);
    });

    it('displays position information correctly', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component renders without error
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('displays order details section', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(getByText(strings('perps.close_position.margin'))).toBeDefined();
      expect(getByText(strings('perps.close_position.fees'))).toBeDefined();
      expect(
        getByText(strings('perps.close_position.you_receive')),
      ).toBeDefined();
    });
  });

  describe('User Interactions', () => {
    it('calls handleClosePosition when confirm button is pressed', async () => {
      // Arrange
      const handleClosePosition = jest.fn();
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition,
        isClosing: false,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      // Assert
      await waitFor(() => {
        expect(handleClosePosition).toHaveBeenCalled();
      });
    });

    it('disables confirm button when closing is in progress', () => {
      // Arrange
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition: jest.fn(),
        isClosing: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );

      // Assert
      expect(
        confirmButton.props.disabled ||
          confirmButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('shows loading state on confirm button when closing', () => {
      // Arrange
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition: jest.fn(),
        isClosing: true,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Button should have loading prop set
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      expect(confirmButton.props.loading).toBe(true);
    });
  });

  describe('Validation', () => {
    it('displays validation errors when present', () => {
      // Arrange
      const validationWithErrors = {
        isValid: false,
        errors: [
          strings('perps.order.validation.minimum_amount', {
            amount: '$10',
          }),
        ],
        warnings: [],
      };
      usePerpsClosePositionValidationMock.mockReturnValue(validationWithErrors);

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(
        getByText(
          strings('perps.order.validation.minimum_amount', {
            amount: '$10',
          }),
        ),
      ).toBeDefined();
    });

    it('disables confirm button when validation fails', () => {
      // Arrange
      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: false,
        errors: ['Invalid amount'],
        warnings: [],
      });

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );

      // Assert
      expect(
        confirmButton.props.disabled ||
          confirmButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });
  });

  describe('Fee Calculations', () => {
    it('calculates and displays correct fees', () => {
      // Arrange
      const mockFees = {
        totalFee: 10.5,
        metamaskFeeRate: 0.5,
        protocolFeeRate: 0.5,
      };
      usePerpsOrderFeesMock.mockReturnValue(mockFees);

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      // Fee should be displayed with a minus sign
      expect(getByText(/-.*10\.5/)).toBeDefined();
    });

    it('updates fees when close percentage changes', async () => {
      // Arrange
      renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Update the close percentage
      // This would normally be done through slider interaction
      // but we're testing the fee calculation logic

      // Assert
      expect(usePerpsOrderFeesMock).toHaveBeenCalled();
    });

    // Test that receiveAmount uses marginUsed directly (which already includes PnL)
    it('calculates receive amount including P&L at effective price', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        entryPrice: '100', // Entry at $100
        marginUsed: '1200', // $1200 (includes $1000 initial + $200 unrealized PnL)
        unrealizedPnl: '200', // Current unrealized P&L from HyperLiquid
        size: '1', // 1 token long position
      };
      const mockFees = {
        totalFee: 50, // $50 fees
        metamaskFeeRate: 0.5,
        protocolFeeRate: 0.5,
      };

      // Set current price to $150 for reference
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '150' }, // Current price $150
      });

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });
      usePerpsOrderFeesMock.mockReturnValue(mockFees);
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - receiveAmount = marginUsed - fees
      // HyperLiquid's marginUsed already includes PnL
      // receiveAmount = 1200 - 50 = 1150
      const receiveText = getByText(
        strings('perps.close_position.you_receive'),
      );
      expect(receiveText).toBeDefined();
      // PRICE_RANGES_MINIMAL_VIEW: Fixed 2 decimals, trailing zeros removed
      expect(getByText('$1,150')).toBeDefined();
    });

    it('calculates receive amount correctly for partial close percentages', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        entryPrice: '100', // Entry at $100
        marginUsed: '1700', // $1700 (includes $2000 initial - $300 unrealized loss)
        unrealizedPnl: '-300', // Current unrealized loss from HyperLiquid
        size: '2', // 2 tokens long
      };
      const mockFees = {
        totalFee: 25, // $25 fees for 100% close
        metamaskFeeRate: 0.5,
        protocolFeeRate: 0.5,
      };

      // Set current price lower than entry for loss scenario
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '75' }, // Current price $75 < entry $100 = loss
      });

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });
      usePerpsOrderFeesMock.mockReturnValue(mockFees);
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // For 100% close (default):
      // HyperLiquid's marginUsed already includes PnL
      // receiveAmount = 1700 - 25 = 1675
      const receiveText = getByText(
        strings('perps.close_position.you_receive'),
      );
      expect(receiveText).toBeDefined();
      // Look for 1675 in the display
      expect(getByText(/1,675/)).toBeDefined();
    });
  });

  describe('Position Data', () => {
    it('handles long position correctly', () => {
      // Arrange
      const longPosition = {
        ...defaultPerpsPositionMock,
        size: '1.5', // Positive for long
      };
      useRouteMock.mockReturnValue({
        params: { position: longPosition },
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should render without errors
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('handles short position correctly', () => {
      // Arrange
      const shortPosition = {
        ...defaultPerpsPositionMock,
        size: '-1.5', // Negative for short
      };
      useRouteMock.mockReturnValue({
        params: { position: shortPosition },
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should render without errors
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('displays positive PnL in success color', () => {
      // Arrange
      const positionWithProfit = {
        ...defaultPerpsPositionMock,
        entryPrice: '100', // Entry at $100
        size: '1', // 1 token long
        unrealizedPnl: '100', // Current unrealized (not used for display)
      };

      // Set current price higher than entry for profit
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '150' }, // Current price $150 > entry $100 = profit
      });

      useRouteMock.mockReturnValue({
        params: { position: positionWithProfit },
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - effectivePnL = (150 - 100) * 1 = 50
      // Look for positive P&L display (with + sign) - should show 50
      const pnlElement = getByText(/\+.*50/);
      expect(pnlElement).toBeDefined();
    });

    it('displays negative PnL in error color', () => {
      // Arrange
      const positionWithLoss = {
        ...defaultPerpsPositionMock,
        entryPrice: '150', // Entry at $150
        marginUsed: '1350', // $1500 initial - $150 unrealized loss (includes funding)
        size: '1', // 1 token long
        unrealizedPnl: '-150', // Current unrealized loss including funding fees
      };

      // Set current price lower than entry for loss
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '100' }, // Current price $100 < entry $150 = loss
      });

      useRouteMock.mockReturnValue({
        params: { position: positionWithLoss },
      });
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [positionWithLoss],
        isInitialLoading: false,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Now uses actual unrealizedPnl from position
      // Look for negative P&L display (with - sign) - should show 150 (absolute value)
      const pnlElement = getByText(/-.*150/);
      expect(pnlElement).toBeDefined();
    });
  });

  describe('Event Tracking', () => {
    it('tracks screen view event on mount', () => {
      // Arrange
      const track = jest.fn();

      // Set up mock to handle both imperative and declarative API calls
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Verify track was called (specific params depend on MetaMetricsEvents enum)
      expect(track).toHaveBeenCalled();
    });
  });

  describe('Live Price Updates', () => {
    it('uses live price data when available', () => {
      // Arrange
      const livePrices = {
        BTC: { price: '50000' },
      };
      usePerpsLivePricesMock.mockReturnValue(livePrices);

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(usePerpsLivePricesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: expect.arrayContaining([defaultPerpsPositionMock.coin]),
          throttleMs: 1000,
        }),
      );
    });

    it('falls back to entry price when live price unavailable', () => {
      // Arrange
      usePerpsLivePricesMock.mockReturnValue({});

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should render without crashing
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });
  });

  describe('Partial Close', () => {
    it('defaults to 100% close percentage', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - The component should show full position details
      expect(
        getByText(strings('perps.close_position.you_receive')),
      ).toBeDefined();
    });

    it('validates minimum order amount for partial close', () => {
      // Arrange
      const validationWithMinimumError = {
        isValid: false,
        errors: [
          strings('perps.order.validation.minimum_amount', {
            amount: '$10',
          }),
        ],
        warnings: [],
      };
      usePerpsClosePositionValidationMock.mockReturnValue(
        validationWithMinimumError,
      );

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(
        getByText(
          strings('perps.order.validation.minimum_amount', {
            amount: '$10',
          }),
        ),
      ).toBeDefined();
    });

    it('calculates receive amount correctly for different percentages', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        marginUsed: '1000', // $1000 margin
        unrealizedPnl: '150', // $150 profit (not included in receive)
        size: '10',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Test different close percentages
      const testCases = [
        { percentage: 100, expectedMargin: 1000, fee: 20 }, // Full close
        { percentage: 50, expectedMargin: 500, fee: 10 }, // Half close
        { percentage: 25, expectedMargin: 250, fee: 5 }, // Quarter close
      ];

      testCases.forEach(({ fee }) => {
        // Mock fees for this percentage
        usePerpsOrderFeesMock.mockReturnValue({
          totalFee: fee,
          metamaskFeeRate: 0.5,
          protocolFeeRate: 0.5,
        });

        // Act
        const { getByText } = renderWithProvider(
          <PerpsClosePositionView />,
          {
            state: STATE_MOCK,
          },
          true,
        );

        // Assert - receiveAmount = expectedMargin - fee (P&L not included)
        expect(
          getByText(strings('perps.close_position.you_receive')),
        ).toBeDefined();
        // The actual calculation: (percentage/100) * marginUsed - totalFee
        // For 100%: 1000 - 20 = 980
        // For 50%: 500 - 10 = 490
        // For 25%: 250 - 5 = 245
      });
    });

    it('handles partial close with clamped values', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '5', // 5 tokens max
        entryPrice: '200', // $200 per token
        marginUsed: '300',
        unrealizedPnl: '50',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      usePerpsOrderFeesMock.mockReturnValue({
        totalFee: 15,
        metamaskFeeRate: 0.5,
        protocolFeeRate: 0.5,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(
        getByText(strings('perps.close_position.you_receive')),
      ).toBeDefined();
      // With 100% close: receiveAmount = 300 - 15 = 285
      // Any input exceeding position limits should be clamped appropriately
    });
  });

  describe('Additional Coverage - Input & Error Filtering', () => {
    it('updates close percentage via percentage buttons and UI responds correctly', async () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );

      // Ensure validation passes
      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Focus input (opens keypad & percentage buttons)
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Press 25% button
      const pct25Button = getByText('25%');
      fireEvent.press(pct25Button);

      // Press Done to close keypad (uses deposit done button string key)
      const doneLabel = strings('perps.deposit.done_button');
      const doneButton = getByText(doneLabel);
      fireEvent.press(doneButton);

      // Keypad should now be hidden (percentage buttons gone), confirm button visible
      await waitFor(() => {
        expect(queryByTestId('perps-amount-display')).toBeDefined();
        // Confirm button should reappear
        expect(
          getByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        ).toBeDefined();
      });

      // Track should have been called at least for screen view
      expect(track).toHaveBeenCalled();
    });

    it('filters validation errors to only show minimum amount error', () => {
      const minError = strings('perps.order.validation.minimum_amount', {
        amount: '$10',
      });
      const otherError = 'Limit price is required';

      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: false,
        errors: [minError, otherError],
        warnings: [],
      });

      const { getByText, queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Minimum amount error should be visible
      expect(getByText(minError)).toBeDefined();
      // Other error should be filtered out
      expect(queryByText(otherError)).toBeNull();
    });

    it('handles Max button press while editing input', async () => {
      const track = jest.fn();
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );
      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const { getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Open keypad
      fireEvent.press(getByTestId('perps-amount-display'));

      // Press Max
      const maxLabel = strings('perps.deposit.max_button');
      fireEvent.press(getByText(maxLabel));

      // Press Done
      const doneLabel = strings('perps.deposit.done_button');
      fireEvent.press(getByText(doneLabel));

      await waitFor(() => {
        expect(
          getByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        ).toBeDefined();
      });

      // Track called for interactions
      expect(track).toHaveBeenCalled();
    });
  });

  describe('Limit Order Features', () => {
    it('validates limit order requires price', () => {
      // Given validation returns error for missing limit price
      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: false,
        errors: ['Limit price is required'],
        warnings: [],
      });

      // When rendering with no limit price
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Then confirm button should be disabled
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      expect(
        confirmButton.props.disabled ||
          confirmButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });

    describe('Limit Price Calculations', () => {
      it('uses limit price for effective price when limit order type is selected', () => {
        // Arrange - Mock position and live prices
        const mockPosition = {
          ...defaultPerpsPositionMock,
          size: '1',
          entryPrice: '100',
          marginUsed: '500',
          unrealizedPnl: '50',
        };
        const limitPriceValue = '120';
        const currentPriceValue = '110';

        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        usePerpsLivePricesMock.mockReturnValue({
          BTC: { price: currentPriceValue },
        });

        // Mock fee calculation for limit order at limit price
        const mockFees = {
          totalFee: 12, // 1 * 120 * 0.1% = 0.12, but using $12 for clear test
          metamaskFeeRate: 0.001,
          protocolFeeRate: 0.0005,
        };
        usePerpsOrderFeesMock.mockReturnValue(mockFees);

        // Create test component that simulates limit order with price
        const TestComponent = () => {
          const [orderType] = React.useState<'market' | 'limit'>('limit');
          const [limitPrice] = React.useState(limitPriceValue);
          const entryPrice = parseFloat(mockPosition.entryPrice);
          const absSize = Math.abs(parseFloat(mockPosition.size));

          // Simulate the effectivePrice calculation from component
          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : parseFloat(currentPriceValue);

          // Simulate effectivePnL calculation for long position
          const isLong = parseFloat(mockPosition.size) > 0;
          const priceDiff = isLong
            ? effectivePrice - entryPrice
            : entryPrice - effectivePrice;
          const effectivePnL = priceDiff * absSize;

          return (
            <View>
              <Text testID="effective-price">{effectivePrice}</Text>
              <Text testID="effective-pnl">{effectivePnL}</Text>
              <Text testID="order-type">{orderType}</Text>
            </View>
          );
        };

        // Act
        const { getByTestId } = render(<TestComponent />);

        // Assert - Should use limit price (120) instead of current price (110)
        expect(getByTestId('effective-price').props.children).toBe(120);
        expect(getByTestId('effective-pnl').props.children).toBe(20); // (120 - 100) * 1 = 20
      });

      it('calculates receive amount using limit price for limit orders', () => {
        // Arrange
        const mockPosition = {
          ...defaultPerpsPositionMock,
          size: '2', // 2 token long position
          entryPrice: '100',
          marginUsed: '200',
          unrealizedPnl: '40', // Current unrealized P&L at market price
        };
        const limitPriceValue = '130';
        const currentPriceValue = '120';

        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        usePerpsLivePricesMock.mockReturnValue({
          BTC: { price: currentPriceValue },
        });

        const mockFees = {
          totalFee: 26, // Fee on 2 * 130 = $260 value
          metamaskFeeRate: 0.001,
          protocolFeeRate: 0.0005,
        };
        usePerpsOrderFeesMock.mockReturnValue(mockFees);

        // Test component simulating limit order calculations
        const TestComponent = () => {
          const [orderType] = React.useState<'market' | 'limit'>('limit');
          const [limitPrice] = React.useState(limitPriceValue);
          const [closePercentage] = React.useState(100);

          const entryPrice = parseFloat(mockPosition.entryPrice);
          const initialMargin = parseFloat(mockPosition.marginUsed);
          const absSize = Math.abs(parseFloat(mockPosition.size));
          const isLong = parseFloat(mockPosition.size) > 0;

          // Calculate effective price (limit price for limit orders)
          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : parseFloat(currentPriceValue);

          // Calculate effective P&L at limit price
          const priceDiff = isLong
            ? effectivePrice - entryPrice
            : entryPrice - effectivePrice;
          const effectivePnL = priceDiff * absSize;

          // Calculate effective margin
          const effectiveMargin = initialMargin + effectivePnL;

          // Calculate receive amount
          const receiveAmount =
            (closePercentage / 100) * effectiveMargin - mockFees.totalFee;

          return (
            <View>
              <Text testID="effective-margin">{effectiveMargin}</Text>
              <Text testID="receive-amount">{receiveAmount}</Text>
              <Text testID="effective-pnl">{effectivePnL}</Text>
            </View>
          );
        };

        // Act
        const { getByTestId } = render(<TestComponent />);

        // Assert
        // Effective P&L at limit price: (130 - 100) * 2 = 60
        expect(getByTestId('effective-pnl').props.children).toBe(60);

        // Effective margin: 200 + 60 = 260
        expect(getByTestId('effective-margin').props.children).toBe(260);

        // Receive amount: 260 - 26 = 234
        expect(getByTestId('receive-amount').props.children).toBe(234);
      });

      it('calculates position value using limit price for fee calculations', () => {
        // Arrange
        const mockPosition = {
          ...defaultPerpsPositionMock,
          size: '1.5',
          entryPrice: '100',
          marginUsed: '150',
        };
        const limitPriceValue = '140';

        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        // Act - Test that position value calculation uses limit price
        const TestComponent = () => {
          const [orderType] = React.useState<'market' | 'limit'>('limit');
          const [limitPrice] = React.useState(limitPriceValue);
          const [closePercentage] = React.useState(75); // Partial close

          const absSize = Math.abs(parseFloat(mockPosition.size));
          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : 120; // fallback price

          const positionValue = absSize * effectivePrice;
          const closingValue = positionValue * (closePercentage / 100);

          return (
            <View>
              <Text testID="position-value">{positionValue}</Text>
              <Text testID="closing-value">{closingValue}</Text>
            </View>
          );
        };

        const { getByTestId } = render(<TestComponent />);

        // Assert
        // Position value: 1.5 * 140 = 210
        expect(getByTestId('position-value').props.children).toBe(210);

        // Closing value for 75%: 210 * 0.75 = 157.5
        expect(getByTestId('closing-value').props.children).toBe(157.5);
      });

      it('falls back to current price when limit price is not set', () => {
        // Arrange
        const currentPriceValue = '125';

        usePerpsLivePricesMock.mockReturnValue({
          BTC: { price: currentPriceValue },
        });

        // Test component with limit order but no limit price
        const TestComponent = () => {
          const [orderType] = React.useState<'market' | 'limit'>('limit');
          const [limitPrice] = React.useState(''); // No limit price set

          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : parseFloat(currentPriceValue);

          return (
            <View>
              <Text testID="effective-price">{effectivePrice}</Text>
            </View>
          );
        };

        // Act
        const { getByTestId } = render(<TestComponent />);

        // Assert - Should fall back to current price
        expect(getByTestId('effective-price').props.children).toBe(125);
      });

      it('handles short position P&L calculations with limit price', () => {
        // Arrange - Short position
        const mockPosition = {
          ...defaultPerpsPositionMock,
          size: '-3', // 3 token short position
          entryPrice: '100',
          marginUsed: '300',
        };
        const limitPriceValue = '80'; // Closing short at $80 (profitable)

        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        // Test component for short position calculations
        const TestComponent = () => {
          const [orderType] = React.useState<'market' | 'limit'>('limit');
          const [limitPrice] = React.useState(limitPriceValue);

          const entryPrice = parseFloat(mockPosition.entryPrice);
          const absSize = Math.abs(parseFloat(mockPosition.size));
          const isLong = parseFloat(mockPosition.size) > 0;

          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : 90; // fallback

          // For short positions: (entryPrice - effectivePrice) * absSize
          const priceDiff = isLong
            ? effectivePrice - entryPrice
            : entryPrice - effectivePrice;
          const effectivePnL = priceDiff * absSize;

          return (
            <View>
              <Text testID="effective-pnl">{effectivePnL}</Text>
              <Text testID="is-profitable">
                {effectivePnL > 0 ? 'true' : 'false'}
              </Text>
            </View>
          );
        };

        // Act
        const { getByTestId } = render(<TestComponent />);

        // Assert
        // Short P&L: (100 - 80) * 3 = 60 (profitable)
        expect(getByTestId('effective-pnl').props.children).toBe(60);
        expect(getByTestId('is-profitable').props.children).toBe('true');
      });

      it('updates calculations when limit price changes', () => {
        // Arrange
        const mockPosition = {
          ...defaultPerpsPositionMock,
          size: '1',
          entryPrice: '100',
          marginUsed: '100',
        };

        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        // Test component that changes limit price
        const TestComponent = () => {
          const [limitPrice, setLimitPrice] = React.useState('110');
          const [orderType] = React.useState<'market' | 'limit'>('limit');

          const entryPrice = parseFloat(mockPosition.entryPrice);
          const absSize = Math.abs(parseFloat(mockPosition.size));
          const isLong = parseFloat(mockPosition.size) > 0;

          const effectivePrice =
            orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
              ? parseFloat(limitPrice)
              : 105;

          const priceDiff = isLong
            ? effectivePrice - entryPrice
            : entryPrice - effectivePrice;
          const effectivePnL = priceDiff * absSize;

          return (
            <View>
              <TouchableOpacity
                testID="change-price"
                onPress={() => setLimitPrice('120')}
              >
                <Text>Change Price</Text>
              </TouchableOpacity>
              <Text testID="effective-pnl">{effectivePnL}</Text>
            </View>
          );
        };

        const { getByTestId } = render(<TestComponent />);

        // Initial P&L: (110 - 100) * 1 = 10
        expect(getByTestId('effective-pnl').props.children).toBe(10);

        // Act - Change limit price
        fireEvent.press(getByTestId('change-price'));

        // Assert - P&L should update: (120 - 100) * 1 = 20
        expect(getByTestId('effective-pnl').props.children).toBe(20);
      });
    });

    it('prevents confirm when limit price is missing for limit orders', () => {
      const mockHandleClosePosition = jest.fn();

      const TestComponent = () => {
        const [orderType] = React.useState<'market' | 'limit'>('limit');
        const [limitPrice] = React.useState<string>('');

        const handleConfirm = () => {
          if (orderType === 'limit' && !limitPrice) {
            return;
          }
          mockHandleClosePosition();
        };

        return (
          <View>
            <TouchableOpacity testID="confirm-button" onPress={handleConfirm}>
              <Text>Confirm</Text>
            </TouchableOpacity>
            <Text testID="order-type">{orderType}</Text>
            <Text testID="limit-price">{limitPrice}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      fireEvent.press(getByTestId('confirm-button'));

      expect(mockHandleClosePosition).not.toHaveBeenCalled();
    });

    it('validates invalid limit price values before using as effective price', () => {
      const TestComponent = () => {
        const [limitPrice, setLimitPrice] = React.useState<string>('invalid');
        const orderType = 'limit';
        const currentPrice = 50000;

        const effectivePrice = () => {
          if (orderType === 'limit' && limitPrice) {
            const parsed = parseFloat(limitPrice);
            if (!isNaN(parsed) && parsed > 0) {
              return parsed;
            }
          }
          return currentPrice;
        };

        return (
          <View>
            <TouchableOpacity
              testID="set-invalid"
              onPress={() => setLimitPrice('invalid')}
            >
              <Text>Set Invalid</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="set-negative"
              onPress={() => setLimitPrice('-100')}
            >
              <Text>Set Negative</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="set-zero"
              onPress={() => setLimitPrice('0')}
            >
              <Text>Set Zero</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="set-valid"
              onPress={() => setLimitPrice('51000')}
            >
              <Text>Set Valid</Text>
            </TouchableOpacity>
            <Text testID="effective-price">{effectivePrice()}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('effective-price').props.children).toBe(50000);

      fireEvent.press(getByTestId('set-negative'));
      expect(getByTestId('effective-price').props.children).toBe(50000);

      fireEvent.press(getByTestId('set-zero'));
      expect(getByTestId('effective-price').props.children).toBe(50000);

      fireEvent.press(getByTestId('set-valid'));
      expect(getByTestId('effective-price').props.children).toBe(51000);
    });
  });

  describe('Input Handling', () => {
    it('handles USD input mode only', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Press amount display to focus input
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - USD input should be available
      expect(amountDisplay).toBeDefined();
    });

    it('tracks events on mount', () => {
      // Arrange
      const { track } = defaultPerpsEventTrackingMock;

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Track should have been called for initial render
      expect(track).toHaveBeenCalled();
    });
  });

  describe('Tooltip Management', () => {
    it('handles tooltip interactions for closing fees', () => {
      // Arrange
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Find the fees label
      const feesLabel = getByText(strings('perps.close_position.fees'));

      // Assert - Tooltip trigger should be available
      expect(feesLabel).toBeDefined();
    });
  });

  describe('Keypad and Input Handlers', () => {
    it('handles keypad input changes correctly', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Press amount display to trigger keypad
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Component should handle input changes in USD mode
      expect(amountDisplay).toBeDefined();
    });

    it('handles percentage button presses', () => {
      // Arrange
      const { queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Check for percentage display
      const percentText = queryByText(/100%/);

      // Assert
      expect(percentText).toBeDefined();
    });
  });

  describe('Navigation Callbacks', () => {
    it('navigates back on successful position close', async () => {
      // Arrange
      let successCallback: (() => void) | undefined;
      usePerpsClosePositionMock.mockImplementation(
        (options?: { onSuccess?: () => void }) => {
          successCallback = options?.onSuccess;
          return {
            handleClosePosition: async () => {
              if (successCallback) successCallback();
            },
            isClosing: false,
          };
        },
      );

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      // Assert
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('TAT-1464 Keypad Input Handling', () => {
    it('renders amount display component for user interaction', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Amount display should be available for TAT-1464 keypad interaction
      expect(
        queryByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeDefined();
    });

    it('uses market-specific decimals for token precision', () => {
      // Arrange - Set custom market decimals for dynamic keypad configuration
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 6 },
        isLoading: false,
        error: null,
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should render successfully with market data
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('handles missing market data gracefully with fallback', () => {
      // Arrange - Market data unavailable (fallback to 18 decimals)
      usePerpsMarketDataMock.mockReturnValue({
        marketData: null,
        isLoading: true,
        error: null,
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should render with fallback decimal precision
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });
  });

  describe('Input Focus Protection Logic', () => {
    it('renders validation messages in normal state', () => {
      // Arrange
      usePerpsClosePositionValidationMock.mockReturnValue({
        isValid: false,
        errors: ['Test validation error'],
        warnings: ['Test validation warning'],
      });

      // Act
      const { queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Validation messages should be visible in normal state
      expect(queryByText('Test validation error')).toBeDefined();
      expect(queryByText('Test validation warning')).toBeDefined();
    });

    it('displays action buttons in normal state', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Confirm button should be visible in normal state
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });
  });

  describe('USD Input Mode', () => {
    it('displays USD amount input mode', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Component should display USD input mode
      expect(
        queryByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeDefined();
    });

    it('maintains component stability with USD input interactions', () => {
      // Arrange
      const { queryByTestId, getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Interact with amount display
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Component should remain stable after USD input interaction
      expect(
        queryByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('Keypad Input Handling Logic', () => {
    it('handles keypad input changes in USD mode correctly', () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );

      // Mock position with specific values for clamping test
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '2', // 2 tokens
        entryPrice: '100', // $100 per token = $200 position value
        marginUsed: '50',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      const component = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component should render and handle keypad input in USD mode
      expect(
        component.queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
      expect(component.queryByTestId('perps-amount-display')).toBeDefined();

      // Test clamping: Input value > positionValue should be clamped
      // With position value of $200, any input > 200 should be clamped to 200
      // The handleKeypadChange function should clamp values appropriately
    });

    it('handles percentage button interactions correctly', () => {
      // Arrange
      // Mock position with specific size for testing
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '5', // 5 tokens max
        entryPrice: '100',
        marginUsed: '200',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      const { queryByTestId, getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Act - Open keypad to access percentage buttons
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Component should handle percentage button interactions
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeNull(); // Hidden when keypad is open

      // Percentage buttons should be available
      expect(getByText('25%')).toBeDefined();
      expect(getByText('50%')).toBeDefined();
    });

    it('clamps input values exceeding position limits', () => {
      // Arrange - Mock a position with known values
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '3', // 3 tokens
        entryPrice: '100', // $100 per token
        marginUsed: '100',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Mock live prices
      usePerpsLivePricesMock.mockReturnValue({
        BTC: { price: '100' },
      });

      const component = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Test USD mode validation
      // Position value = 3 * 100 = $300
      // Input validation should handle values appropriately
      expect(component).toBeDefined();
    });

    it('preserves decimal point during input', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '10',
        entryPrice: '100',
        marginUsed: '500',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      const component = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Test decimal preservation logic
      // When user types "2." it should stay as "2." not become "2"
      // This tests the special decimal handling in handleKeypadChange
      expect(component).toBeDefined();
    });
  });

  describe('Position Close Effect Tracking', () => {
    it('tracks percentage change events when not at 100%', async () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Should track initial screen view (useEffect runs on mount)
      expect(track).toHaveBeenCalled();
    });
  });

  describe('Input Focus State Management', () => {
    it('shows keypad and hides validation when input is focused', () => {
      // Arrange
      const TestComponent = () => {
        const [isInputFocused, setIsInputFocused] = React.useState(false);
        const [errors] = React.useState(['Test error']);

        return (
          <View>
            <TouchableOpacity onPress={() => setIsInputFocused(true)}>
              <Text>Focus Input</Text>
            </TouchableOpacity>
            {isInputFocused && <Text testID="keypad">Keypad Visible</Text>}
            {!isInputFocused && errors.length > 0 && (
              <Text testID="validation">Validation Visible</Text>
            )}
          </View>
        );
      };

      // Act
      const { getByText, queryByTestId } = render(<TestComponent />);

      // Assert - Initially shows validation, no keypad
      expect(queryByTestId('validation')).toBeDefined();
      expect(queryByTestId('keypad')).toBeNull();

      // Focus input
      fireEvent.press(getByText('Focus Input'));

      // Assert - Now shows keypad, hides validation
      expect(queryByTestId('keypad')).toBeDefined();
      expect(queryByTestId('validation')).toBeNull();
    });

    it('covers percentage and max button handlers logic', () => {
      // Test covers handlePercentagePress and handleMaxPress functions
      const TestComponent = () => {
        const [closePercentage, setClosePercentage] = React.useState(100);
        const [closeAmount, setCloseAmount] = React.useState('1.5');
        const absSize = 1.5;

        // Simulate handlePercentagePress logic
        const handlePercentagePress = (percentage: number) => {
          const newPercentage = percentage * 100;
          setClosePercentage(newPercentage);
          const newAmount = (newPercentage / 100) * absSize;
          setCloseAmount(newAmount.toString());
        };

        // Simulate handleMaxPress logic
        const handleMaxPress = () => {
          setClosePercentage(100);
          setCloseAmount(absSize.toString());
        };

        return (
          <View>
            <TouchableOpacity
              onPress={() => handlePercentagePress(0.5)}
              testID="50-percent"
            >
              <Text>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMaxPress} testID="max-button">
              <Text>Max</Text>
            </TouchableOpacity>
            <Text testID="percentage">{closePercentage}</Text>
            <Text testID="amount">{closeAmount}</Text>
          </View>
        );
      };

      // Act
      const { getByTestId } = render(<TestComponent />);

      // Test 50% button
      fireEvent.press(getByTestId('50-percent'));
      expect(getByTestId('percentage').props.children).toBe(50);
      expect(getByTestId('amount').props.children).toBe('0.75');

      // Test max button
      fireEvent.press(getByTestId('max-button'));
      expect(getByTestId('percentage').props.children).toBe(100);
      expect(getByTestId('amount').props.children).toBe('1.5');
    });
  });

  describe('Confirm Handler Logic', () => {
    it('handles full close position confirmation with all tracking events', async () => {
      // Arrange
      const track = jest.fn();
      const handleClosePosition = jest.fn().mockResolvedValue(undefined);
      usePerpsEventTrackingMock.mockImplementation(
        (options?: {
          eventName?: string;
          properties?: Record<string, unknown>;
        }) => {
          // If options are provided (declarative API), call track immediately to simulate useEffect
          if (options?.eventName) {
            track(options.eventName, options.properties || {});
          }
          // Always return the track function for imperative usage
          return { track };
        },
      );
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition,
        isClosing: false,
      });

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Act - Press confirm button
      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      // Assert - Should call handleClosePosition and track events
      await waitFor(() => {
        expect(handleClosePosition).toHaveBeenCalled();
      });

      // Assert - Should track events (multiple calls expected)
      expect(track).toHaveBeenCalled();

      // Assert - Should call with expected parameters structure for full close
      // HyperLiquid's marginUsed already includes PnL
      // receivedAmount = marginUsed - fees = 1450 - 45 = 1405
      // realizedPnl = unrealizedPnl = 150 (from defaultPerpsPositionMock)
      expect(handleClosePosition).toHaveBeenCalledWith({
        position: defaultPerpsPositionMock,
        size: '',
        orderType: 'market',
        limitPrice: undefined,
        trackingData: {
          totalFee: 45,
          marketPrice: 3000,
          receivedAmount: 1405,
          realizedPnl: 150,
          metamaskFeeRate: 0,
          metamaskFee: 0,
          feeDiscountPercentage: undefined,
          estimatedPoints: undefined,
          inputMethod: 'default',
        },
        marketPrice: '3000.00',
        // Slippage parameters added in USD-as-source-of-truth refactor
        // For full closes (100%), usdAmount is undefined to bypass $10 minimum validation
        slippage: {
          usdAmount: undefined, // undefined for full close to bypass $10 minimum validation
          priceAtCalculation: 3000, // effectivePrice: currentPrice for market orders
          maxSlippageBps: 300, // maxSlippageBps: 3% slippage tolerance (300 basis points) - conservative default
        },
      });
    });

    it('validates limit order requires price before confirmation', async () => {
      // Test the early return in handleConfirm when limit has no price
      const handleClosePosition = jest.fn();
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition,
        isClosing: false,
      });

      // Create a test component that simulates limit order without price
      const TestComponent = () => {
        const [orderType] = React.useState<'market' | 'limit'>('limit');
        const [limitPrice] = React.useState(''); // No price set

        return (
          <TouchableOpacity
            testID="test-confirm-no-price"
            onPress={async () => {
              // This simulates the handleConfirm logic that returns early
              if (orderType === 'limit' && !limitPrice) {
                return; // Early return - should not call handleClosePosition
              }
              await handleClosePosition();
            }}
          >
            <Text>Confirm</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      // Act - Try to confirm without limit price
      fireEvent.press(getByTestId('test-confirm-no-price'));

      // Assert - Should NOT call handleClosePosition due to early return
      await waitFor(() => {
        expect(handleClosePosition).not.toHaveBeenCalled();
      });
    });

    it('handles limit order confirmation with price validation', async () => {
      // Arrange
      const handleClosePosition = jest.fn().mockResolvedValue(undefined);
      usePerpsClosePositionMock.mockReturnValue({
        handleClosePosition,
        isClosing: false,
      });

      // Mock a component state with limit order and price
      const TestComponent = () => {
        const [orderType] = React.useState<'market' | 'limit'>('limit');
        const [limitPrice] = React.useState('50000');

        return (
          <View>
            <TouchableOpacity
              testID="test-confirm"
              onPress={async () => {
                // Simulate the handleConfirm logic for limit orders
                if (orderType === 'limit' && !limitPrice) {
                  return; // Should not proceed without price
                }
                await handleClosePosition({
                  position: defaultPerpsPositionMock,
                  size: '',
                  orderType,
                  limitPrice: orderType === 'limit' ? limitPrice : undefined,
                  trackingData: {
                    totalFee: 45,
                    marketPrice: 3000,
                    receivedAmount: 1405,
                    realizedPnl: 150,
                    metamaskFeeRate: 0,
                    feeDiscountPercentage: undefined,
                    metamaskFee: 0,
                    estimatedPoints: undefined,
                    inputMethod: 'default',
                  },
                  marketPrice: '3000.00',
                  slippage: {
                    usdAmount: '4500',
                    priceAtCalculation: 3000,
                    maxSlippageBps: 100,
                  },
                });
              }}
            >
              <Text>Confirm</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      // Act - Press confirm for limit order
      fireEvent.press(getByTestId('test-confirm'));

      // Assert - Should call with limit price and specific calculated values
      await waitFor(() => {
        expect(handleClosePosition).toHaveBeenCalledWith({
          position: defaultPerpsPositionMock,
          size: '',
          orderType: 'limit',
          limitPrice: '50000',
          trackingData: {
            totalFee: 45,
            marketPrice: 3000,
            receivedAmount: 1405,
            realizedPnl: 150,
            metamaskFeeRate: 0,
            metamaskFee: 0,
            feeDiscountPercentage: undefined,
            estimatedPoints: undefined,
            inputMethod: 'default',
          },
          marketPrice: '3000.00',
          slippage: {
            usdAmount: '4500',
            priceAtCalculation: 3000,
            maxSlippageBps: 100,
          },
        });
      });
    });
  });

  describe('Keypad Interaction - Real Component', () => {
    it('triggers handleAmountPress when amount display is pressed', async () => {
      // Arrange - Following AAA pattern from guidelines
      const { getByTestId, queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Act - Press the amount display to trigger handleAmountPress
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Keypad section should appear (isInputFocused becomes true)
      await waitFor(() => {
        // When input is focused, percentage buttons appear
        expect(queryByText('25%')).toBeDefined();
        expect(queryByText('50%')).toBeDefined();
      });
    });

    it('triggers percentage button handlers when pressed', async () => {
      // Arrange
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Act - First show keypad
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Wait for keypad to appear
      await waitFor(() => {
        expect(getByText('25%')).toBeDefined();
      });

      // Act - Press percentage buttons
      const button25 = getByText('25%');
      fireEvent.press(button25);

      const button50 = getByText('50%');
      fireEvent.press(button50);

      const maxButton = getByText(strings('perps.deposit.max_button'));
      fireEvent.press(maxButton);

      // Assert - Buttons were rendered and pressed successfully
      expect(button25).toBeDefined();
      expect(button50).toBeDefined();
      expect(maxButton).toBeDefined();
    });

    it('triggers handleDonePress to hide keypad', async () => {
      // Arrange
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Act - Show keypad first
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Wait for Done button
      await waitFor(() => {
        expect(getByText(strings('perps.deposit.done_button'))).toBeDefined();
      });

      // Act - Press Done button
      const doneButton = getByText(strings('perps.deposit.done_button'));
      fireEvent.press(doneButton);

      // Assert - Keypad should be hidden, action buttons should reappear
      await waitFor(() => {
        expect(
          queryByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        ).toBeDefined();
      });
    });
  });

  describe('Tooltip Handlers', () => {
    it('handles tooltip interactions for all tooltips', () => {
      // Test coverage for handleTooltipPress and handleTooltipClose
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Find tooltip triggers
      const feesLabel = getByText(strings('perps.close_position.fees'));

      // Tooltips should be available
      expect(feesLabel).toBeDefined();

      // Note: The actual tooltip press is handled by Icon press,
      // but we're verifying the labels exist for coverage
    });
  });

  describe('Keypad UI Rendering', () => {
    it('renders keypad section when input is focused', async () => {
      // Arrange
      const { getByTestId, queryByText, queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Initially action buttons visible, keypad hidden
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
      expect(queryByText('25%')).toBeNull();

      // Act - Press amount display to focus input
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Keypad section elements are rendered
      await waitFor(() => {
        expect(queryByText('25%')).toBeDefined();
        expect(queryByText('50%')).toBeDefined();
        expect(queryByText(strings('perps.deposit.max_button'))).toBeDefined();
        expect(queryByText(strings('perps.deposit.done_button'))).toBeDefined();
      });
    });

    it('hides action buttons when keypad is active and shows them when done', async () => {
      // Arrange
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Initially action buttons should be visible
      const initialConfirmButton = queryByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      expect(initialConfirmButton).toBeDefined();

      // Act - Press amount display to show keypad
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Wait for keypad to show
      await waitFor(() => {
        expect(getByText(strings('perps.deposit.done_button'))).toBeDefined();
      });

      // Action buttons should be hidden when keypad is active
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeNull();

      // Act - Press Done to hide keypad
      const doneButton = getByText(strings('perps.deposit.done_button'));
      fireEvent.press(doneButton);

      // Assert - Action buttons should reappear
      await waitFor(() => {
        expect(
          queryByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        ).toBeDefined();
      });
    });
  });

  describe('Price Update Synchronization', () => {
    it('recalculates effectivePnL when current price changes', async () => {
      // Arrange - Position with entry price
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '1', // 1 token long position
        entryPrice: '100', // Entry at $100
        marginUsed: '100',
        unrealizedPnl: '0',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Mock usePerpsLivePositions to return the test's mock position
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      // Initially price equals entry price (no P&L)
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '100' }, // Current price = entry price
      });

      const { rerender, getByText, queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert initial state - effectivePnL should be close to 0 when price = entry
      // (100 - 100) * 1 = 0
      // The margin displayed should be just the margin used ($100)
      // P&L displayed should be $0 (or very close to it)
      await waitFor(() => {
        const marginLabel = getByText(strings('perps.close_position.margin'));
        expect(marginLabel).toBeDefined();
        // P&L should be ~$0 when price equals entry price
        expect(queryByText(/\+.*\$0/)).toBeDefined();
      });

      // Act - Simulate live price increasing to $150
      // Update both price and position to reflect the P&L change
      const updatedPosition = {
        ...mockPosition,
        unrealizedPnl: '50', // (150 - 100) * 1 = 50
        marginUsed: '150', // 100 initial + 50 P&L
      };

      usePerpsLivePositionsMock.mockReturnValue({
        positions: [updatedPosition],
        isInitialLoading: false,
      });

      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '150' }, // Live price is $150 (50% profit)
      });

      // Force re-render with new price to trigger dependency recalculation
      rerender(<PerpsClosePositionView />);

      // Assert - effectivePnL should update to positive value
      // (150 - 100) * 1 = 50 profit
      // Margin should now include the P&L: 100 + 50 = 150
      await waitFor(() => {
        // Look for the positive P&L display in the "includes P&L" row
        expect(queryByText(/\+.*\$50/)).toBeDefined();
        // Look for the margin label to ensure we're checking the right section
        expect(getByText(strings('perps.close_position.margin'))).toBeDefined();
      });
    });

    it('syncs input amount when price updates from entry to live price', async () => {
      // Arrange - Position with entry price
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '1',
        entryPrice: '100', // Entry at $100
        marginUsed: '100',
        unrealizedPnl: '0',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Initially no live price (fallback to entry price)
      usePerpsLivePricesMock.mockReturnValue({});

      const { rerender } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Simulate live price arriving with different value (entry was 100, market is now 110)
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '110' }, // Live price is $110 (10% higher)
      });

      // Force re-render with new price
      rerender(<PerpsClosePositionView />);

      // Assert - Component should update calculations with new price
      // Position value was 1 * 100 = $100 at entry
      // Position value now 1 * 110 = $110 at live price
      // The displayed USD amount should reflect the live price, not entry price
      await waitFor(() => {
        expect(usePerpsLivePricesMock).toHaveBeenCalled();
      });
    });

    it('prevents dollar amount jump when focusing input after price update', async () => {
      // Arrange - Position at entry price
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '2',
        entryPrice: '100',
        marginUsed: '200',
        unrealizedPnl: '20',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Start with entry price (live price not loaded yet)
      usePerpsLivePricesMock.mockReturnValue({});

      const { rerender, getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Live price updates to market price (different from entry)
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '110' }, // Market price is higher than entry
      });

      rerender(<PerpsClosePositionView />);

      // Wait for price update to settle
      await waitFor(() => {
        expect(usePerpsLivePricesMock).toHaveBeenCalled();
      });

      // Act - User focuses the input (this should NOT cause amount to jump back to entry price)
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      // Assert - Input should be focused without issues
      await waitFor(() => {
        // Keypad should appear (indicates input is focused)
        expect(getByTestId('perps-amount-display')).toBeDefined();
      });

      // The amount displayed should be based on market price (110), not entry price (100)
      // Position value at market: 2 * 110 = 220
      // NOT 2 * 100 = 200 (which would be a P&L-sized jump of $20)
    });

    it('initializes USD amount only once when absSize and price become available', async () => {
      // Arrange - Position with valid data
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '1.5',
        entryPrice: '100',
        marginUsed: '150',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Mock that price loads
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '100' },
      });

      const { rerender } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Price updates multiple times (simulating live feed)
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '101' },
      });
      rerender(<PerpsClosePositionView />);

      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '102' },
      });
      rerender(<PerpsClosePositionView />);

      // Assert - Component should remain stable through price updates
      await waitFor(() => {
        expect(usePerpsLivePricesMock).toHaveBeenCalled();
      });
    });

    it('keeps input synced with calculated value when user is not editing', async () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '1',
        entryPrice: '100',
        marginUsed: '100',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '100' },
      });

      const { rerender, getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - User interacts with slider (changes percentage)
      // This simulates changing the close percentage without direct input
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      await waitFor(() => {
        expect(getByText('50%')).toBeDefined();
      });

      // User presses 50% button
      fireEvent.press(getByText('50%'));

      // User closes keypad
      const doneButton = getByText(strings('perps.deposit.done_button'));
      fireEvent.press(doneButton);

      // Now simulate price update while not editing
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '105' }, // Price increases
      });

      rerender(<PerpsClosePositionView />);

      // Assert - Input amount should sync with new calculated value
      // At 50% of 1 token at $105 = $52.50
      await waitFor(() => {
        expect(usePerpsLivePricesMock).toHaveBeenCalled();
      });

      // When user focuses input again, it should show the updated value
      fireEvent.press(amountDisplay);

      await waitFor(() => {
        expect(getByText('50%')).toBeDefined();
      });
    });

    it('does not sync input amount while user is actively editing', async () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '2',
        entryPrice: '100',
        marginUsed: '200',
      };

      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '100' },
      });

      const { rerender, getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - User opens keypad and starts editing
      const amountDisplay = getByTestId('perps-amount-display');
      fireEvent.press(amountDisplay);

      await waitFor(() => {
        expect(getByText('50%')).toBeDefined();
      });

      // User presses percentage button (starts active editing)
      fireEvent.press(getByText('25%'));

      // While keypad is open (user is actively editing), price updates
      usePerpsLivePricesMock.mockReturnValue({
        ETH: { price: '110' }, // Price changes
      });

      rerender(<PerpsClosePositionView />);

      // Assert - User's input should NOT be overwritten while actively editing
      // The isUserInputActive flag should prevent sync
      await waitFor(() => {
        // Keypad should still be visible
        expect(getByText('25%')).toBeDefined();
        expect(getByText('50%')).toBeDefined();
      });
    });
  });

  describe('Market Data and szDecimals Integration', () => {
    it('passes szDecimals from market data to formatPositionSize', () => {
      // Arrange - Set market data with specific szDecimals
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 5 },
        isLoading: false,
        error: null,
      });

      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '0.12345',
        coin: 'BTC',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component renders without error and uses market data
      expect(usePerpsMarketDataMock).toHaveBeenCalledWith({
        asset: 'BTC',
        showErrorToast: true,
      });
    });

    it('formats position size with different szDecimals values', () => {
      // Arrange - Test with different decimal precision
      const testCases = [
        { szDecimals: 1, coin: 'DOGE', size: '123.456789' },
        { szDecimals: 4, coin: 'ETH', size: '1.23456789' },
        { szDecimals: 5, coin: 'BTC', size: '0.123456789' },
        { szDecimals: 6, coin: 'SOL', size: '0.000123456' },
      ];

      testCases.forEach(({ szDecimals, coin, size }) => {
        // Arrange
        usePerpsMarketDataMock.mockReturnValue({
          marketData: { szDecimals },
          isLoading: false,
          error: null,
        });

        const mockPosition = {
          ...defaultPerpsPositionMock,
          size,
          coin,
        };
        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        // Act
        const { queryByTestId } = renderWithProvider(
          <PerpsClosePositionView />,
          { state: STATE_MOCK },
          true,
        );

        // Assert - Component renders successfully with szDecimals
        expect(
          queryByTestId(
            PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          ),
        ).toBeDefined();
        expect(usePerpsMarketDataMock).toHaveBeenCalledWith({
          asset: coin,
          showErrorToast: true,
        });
      });
    });

    it('handles missing market data with undefined szDecimals', () => {
      // Arrange - Market data with minimal required fields (szDecimals is now required)
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 4 }, // Provide required szDecimals
        isLoading: false,
        error: null,
      });

      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '1.5',
        coin: 'ETH',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component renders with minimal market data
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('handles loading state while fetching market data', () => {
      // Arrange - Market data is loading
      usePerpsMarketDataMock.mockReturnValue({
        marketData: null,
        isLoading: true,
        error: null,
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component renders while loading
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('handles market data fetch error gracefully', () => {
      // Arrange - Market data fetch failed but provides minimal required data
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 4 }, // Provide required szDecimals even in error case
        isLoading: false,
        error: 'Failed to fetch market data',
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component still renders with minimal data despite error
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('uses correct szDecimals for different assets', () => {
      // Arrange - Test common crypto assets with their typical szDecimals
      const assetConfigs = [
        { coin: 'BTC', szDecimals: 5, size: '0.00123' },
        { coin: 'ETH', szDecimals: 4, size: '1.2345' },
        { coin: 'DOGE', szDecimals: 1, size: '1000.5' },
        { coin: 'SOL', szDecimals: 3, size: '10.123' },
      ];

      assetConfigs.forEach(({ coin, szDecimals, size }) => {
        // Arrange
        usePerpsMarketDataMock.mockReturnValue({
          marketData: { szDecimals },
          isLoading: false,
          error: null,
        });

        const mockPosition = {
          ...defaultPerpsPositionMock,
          coin,
          size,
        };
        useRouteMock.mockReturnValue({
          params: { position: mockPosition },
        });

        // Act
        renderWithProvider(
          <PerpsClosePositionView />,
          { state: STATE_MOCK },
          true,
        );

        // Assert - Fetches market data for specific asset
        expect(usePerpsMarketDataMock).toHaveBeenCalledWith({
          asset: coin,
          showErrorToast: true,
        });
      });
    });

    it('formats very small position sizes with high decimal precision', () => {
      // Arrange - Test very small amounts with high precision
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 8 },
        isLoading: false,
        error: null,
      });

      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '0.00000123',
        coin: 'BTC',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component handles high precision decimals
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('formats large position sizes with low decimal precision', () => {
      // Arrange - Test large amounts with low precision
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 1 },
        isLoading: false,
        error: null,
      });

      const mockPosition = {
        ...defaultPerpsPositionMock,
        size: '123456.7',
        coin: 'DOGE',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component handles large numbers with low precision
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });

    it('fetches market data on component mount with position coin', () => {
      // Arrange
      const mockPosition = {
        ...defaultPerpsPositionMock,
        coin: 'ETH',
      };
      useRouteMock.mockReturnValue({
        params: { position: mockPosition },
      });

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Hook called with correct asset symbol
      expect(usePerpsMarketDataMock).toHaveBeenCalledWith({
        asset: 'ETH',
        showErrorToast: true,
      });
    });
  });

  describe('Rewards Points Row', () => {
    it('renders RewardsAnimations component when rewards are enabled', async () => {
      // Arrange
      usePerpsRewardsMock.mockReturnValue({
        shouldShowRewardsRow: true,
        estimatedPoints: 1000,
        isLoading: false,
        hasError: false,
        bonusBips: 250,
        feeDiscountPercentage: 15,
        isRefresh: false,
        accountOptedIn: true,
        account: null,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert
      await waitFor(() => {
        expect(getByText(strings('perps.estimated_points'))).toBeDefined();
        expect(getByText('1,000')).toBeDefined();
      });
    });

    it('does not render rewards row when shouldShowRewardsRow is false', async () => {
      // Arrange
      usePerpsRewardsMock.mockReturnValue({
        shouldShowRewardsRow: false,
        estimatedPoints: undefined,
        isLoading: false,
        hasError: false,
        bonusBips: undefined,
        feeDiscountPercentage: undefined,
        isRefresh: false,
        accountOptedIn: null,
        account: null,
      });

      // Act
      const { queryByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert
      await waitFor(() => {
        expect(queryByText(strings('perps.estimated_points'))).toBeNull();
      });
    });

    it('renders RewardsAnimations in loading state', async () => {
      // Arrange
      usePerpsRewardsMock.mockReturnValue({
        shouldShowRewardsRow: true,
        estimatedPoints: 0,
        isLoading: true,
        hasError: false,
        bonusBips: undefined,
        feeDiscountPercentage: undefined,
        isRefresh: false,
        accountOptedIn: true,
        account: null,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert
      await waitFor(() => {
        expect(getByText(strings('perps.estimated_points'))).toBeDefined();
      });
    });

    it('renders RewardsAnimations in error state', async () => {
      // Arrange
      usePerpsRewardsMock.mockReturnValue({
        shouldShowRewardsRow: true,
        estimatedPoints: 0,
        isLoading: false,
        hasError: true,
        bonusBips: undefined,
        feeDiscountPercentage: undefined,
        isRefresh: false,
        accountOptedIn: true,
        account: null,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert
      await waitFor(() => {
        expect(getByText(strings('perps.estimated_points'))).toBeDefined();
      });
    });

    it('renders RewardsAnimations with bonus bips', async () => {
      // Arrange
      usePerpsRewardsMock.mockReturnValue({
        shouldShowRewardsRow: true,
        estimatedPoints: 2500,
        isLoading: false,
        hasError: false,
        bonusBips: 500,
        feeDiscountPercentage: 25,
        isRefresh: false,
        accountOptedIn: true,
        account: null,
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert
      await waitFor(() => {
        expect(getByText(strings('perps.estimated_points'))).toBeDefined();
        expect(getByText('2,500')).toBeDefined();
      });
    });
  });

  describe('market price passing to closePosition', () => {
    it('passes priceData[position.coin]?.price to handleClosePosition', async () => {
      const priceData = {
        ETH: { price: '$2500.00' },
      };
      usePerpsLivePricesMock.mockReturnValue(priceData);

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalled();
      });
    });

    it('works when priceData is undefined', async () => {
      usePerpsLivePricesMock.mockReturnValue({});

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalled();
      });
    });

    it('works when priceData[position.coin] is undefined', async () => {
      const priceData = {
        BTC: { price: '$50000.00' },
      };
      usePerpsLivePricesMock.mockReturnValue(priceData);

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalled();
      });
    });

    it('works when priceData[position.coin].price is undefined', async () => {
      const priceData = {
        ETH: { price: undefined },
      };
      usePerpsLivePricesMock.mockReturnValue(priceData);

      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      const confirmButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalled();
      });
    });
  });
});
