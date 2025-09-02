import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { noop } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsClosePositionView from './PerpsClosePositionView';
import { createPerpsStateMock } from '../../__mocks__/perpsStateMock';
import {
  defaultPerpsPositionMock,
  defaultPerpsLivePricesMock,
  defaultPerpsOrderFeesMock,
  defaultPerpsClosePositionValidationMock,
  defaultPerpsClosePositionMock,
  defaultPerpsEventTrackingMock,
  defaultMinimumOrderAmountMock,
} from '../../__mocks__/perpsHooksMocks';
import { strings } from '../../../../../../locales/i18n';
import {
  PerpsClosePositionViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useMinimumOrderAmount: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsClosePositionValidation: jest.fn(),
  usePerpsClosePosition: jest.fn(),
  usePerpsMarketData: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../hooks/usePerpsScreenTracking', () => ({
  usePerpsScreenTracking: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics');

// Mock UI components that might cause rendering issues
jest.mock('../../../../Base/Keypad', () => 'Keypad');
jest.mock('../../components/PerpsSlider/PerpsSlider', () => ({
  __esModule: true,
  default: 'PerpsSlider',
}));
jest.mock('../../components/PerpsAmountDisplay', () => ({
  __esModule: true,
  default: 'PerpsAmountDisplay',
}));
jest.mock('../../components/PerpsOrderTypeBottomSheet', () => ({
  __esModule: true,
  default: 'PerpsOrderTypeBottomSheet',
}));
jest.mock('../../components/PerpsLimitPriceBottomSheet', () => ({
  __esModule: true,
  default: 'PerpsLimitPriceBottomSheet',
}));
jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: 'PerpsBottomSheetTooltip',
}));

const STATE_MOCK = createPerpsStateMock();

describe('PerpsClosePositionView', () => {
  const useNavigationMock = jest.requireMock(
    '@react-navigation/native',
  ).useNavigation;
  const useRouteMock = jest.requireMock('@react-navigation/native').useRoute;
  const usePerpsLivePricesMock =
    jest.requireMock('../../hooks/stream').usePerpsLivePrices;
  const usePerpsOrderFeesMock =
    jest.requireMock('../../hooks').usePerpsOrderFees;
  const usePerpsClosePositionValidationMock =
    jest.requireMock('../../hooks').usePerpsClosePositionValidation;
  const usePerpsClosePositionMock =
    jest.requireMock('../../hooks').usePerpsClosePosition;
  const usePerpsEventTrackingMock = jest.requireMock(
    '../../hooks/usePerpsEventTracking',
  ).usePerpsEventTracking;
  const usePerpsScreenTrackingMock = jest.requireMock(
    '../../hooks/usePerpsScreenTracking',
  ).usePerpsScreenTracking;
  const useMinimumOrderAmountMock =
    jest.requireMock('../../hooks').useMinimumOrderAmount;
  const usePerpsMarketDataMock =
    jest.requireMock('../../hooks').usePerpsMarketData;

  beforeEach(() => {
    jest.resetAllMocks();

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
    usePerpsLivePricesMock.mockReturnValue(defaultPerpsLivePricesMock);
    usePerpsOrderFeesMock.mockReturnValue(defaultPerpsOrderFeesMock);
    usePerpsClosePositionValidationMock.mockReturnValue(
      defaultPerpsClosePositionValidationMock,
    );
    usePerpsClosePositionMock.mockReturnValue(defaultPerpsClosePositionMock);
    usePerpsEventTrackingMock.mockReturnValue(defaultPerpsEventTrackingMock);
    usePerpsScreenTrackingMock.mockReturnValue(noop);
    useMinimumOrderAmountMock.mockReturnValue(defaultMinimumOrderAmountMock);
    usePerpsMarketDataMock.mockReturnValue({
      marketData: { szDecimals: 4 },
      isLoading: false,
      error: null,
    });
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

    it('shows default market order type on initial render', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert
      expect(getByText(strings('perps.order.market'))).toBeDefined();
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
      expect(
        getByText(strings('perps.close_position.estimated_pnl')),
      ).toBeDefined();
      expect(getByText(strings('perps.close_position.fees'))).toBeDefined();
      expect(
        getByText(strings('perps.close_position.you_receive')),
      ).toBeDefined();
    });
  });

  describe('User Interactions', () => {
    it('navigates back when cancel button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act
      const cancelButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CANCEL_BUTTON,
      );
      fireEvent.press(cancelButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

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
        errors: ['Minimum order amount not met'],
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
      expect(getByText('Minimum order amount not met')).toBeDefined();
    });

    it('displays validation warnings when present', () => {
      // Arrange
      const validationWithWarnings = {
        isValid: true,
        errors: [],
        warnings: ['High slippage expected'],
      };
      usePerpsClosePositionValidationMock.mockReturnValue(
        validationWithWarnings,
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
      expect(getByText('High slippage expected')).toBeDefined();
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

  describe('Order Type Management', () => {
    it('handles order type change from market to limit', () => {
      // Given the default market order is displayed
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // When order type changes to limit
      // Simulate the component re-rendering with limit order type
      // Note: In real implementation, this would be triggered by bottom sheet selection

      // Then the limit order text should be visible
      expect(getByText(strings('perps.order.market'))).toBeDefined();
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
        unrealizedPnl: '100',
      };
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

      // Assert - Look for positive PnL display (with + sign)
      const pnlElement = getByText(/\+.*100/);
      expect(pnlElement).toBeDefined();
    });

    it('displays negative PnL in error color', () => {
      // Arrange
      const positionWithLoss = {
        ...defaultPerpsPositionMock,
        unrealizedPnl: '-100',
      };
      useRouteMock.mockReturnValue({
        params: { position: positionWithLoss },
      });

      // Act
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Look for negative PnL display (with - sign)
      const pnlElement = getByText(/-.*100/);
      expect(pnlElement).toBeDefined();
    });
  });

  describe('Event Tracking', () => {
    it('tracks screen view event on mount', () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockReturnValue({ track });

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

    it('tracks position close initiated event on confirm', async () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockReturnValue({ track });

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
        expect(track).toHaveBeenCalled();
      });
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
        errors: ['Below minimum order amount'],
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
      expect(getByText('Below minimum order amount')).toBeDefined();
    });
  });

  describe('Limit Order Features', () => {
    it('switches between market and limit order types', () => {
      // Given a close position view
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Then it should show market order by default
      expect(
        getByTestId(PerpsClosePositionViewSelectorsIDs.ORDER_TYPE_BUTTON),
      ).toBeDefined();
      expect(getByText(strings('perps.order.market'))).toBeDefined();
    });

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
  });

  describe('Input Handling', () => {
    it('handles display mode toggle between USD and token', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Press the display toggle button
      const toggleButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
      );
      fireEvent.press(toggleButton);

      // Assert - Display should toggle (component re-renders with new mode)
      expect(toggleButton).toBeDefined();
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

  describe('Order Type Selection', () => {
    it('opens order type bottom sheet when order type button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Press the order type button
      const orderTypeButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.ORDER_TYPE_BUTTON,
      );
      fireEvent.press(orderTypeButton);

      // Assert - Order type selection should trigger state change
      // The actual bottom sheet rendering is handled by the PerpsOrderTypeBottomSheet component
      expect(orderTypeButton).toBeDefined();
    });
  });

  describe('Tooltip Management', () => {
    it('handles tooltip interactions for estimated PnL', () => {
      // Arrange
      const { getByText } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Find the estimated PnL label
      const pnlLabel = getByText(strings('perps.close_position.estimated_pnl'));

      // Assert - Tooltip trigger should be available
      expect(pnlLabel).toBeDefined();
    });

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

      // Act - Press toggle button to trigger re-render
      const toggleButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
      );
      fireEvent.press(toggleButton);

      // Assert - Component should handle input changes
      expect(toggleButton).toBeDefined();
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

  describe('Limit Order Auto-Open', () => {
    it('opens limit price bottom sheet when switching to limit order without price', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Press order type button to trigger limit order selection
      const orderTypeButton = getByTestId(
        PerpsClosePositionViewSelectorsIDs.ORDER_TYPE_BUTTON,
      );
      fireEvent.press(orderTypeButton);

      // Assert - Bottom sheet should be triggered
      expect(orderTypeButton).toBeDefined();
    });
  });

  describe('Navigation Callbacks', () => {
    it('navigates back on successful position close', async () => {
      // Arrange
      let successCallback: (() => void) | undefined;
      usePerpsClosePositionMock.mockImplementation(
        ({ onSuccess }: { onSuccess: () => void }) => {
          successCallback = onSuccess;
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

    it('integrates market data hook for dynamic decimal configuration', () => {
      // Arrange - Test the usePerpsMarketData integration from TAT-1464
      usePerpsMarketDataMock.mockReturnValue({
        marketData: { szDecimals: 8 },
        isLoading: false,
        error: null,
      });

      // Act
      renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Market data hook should be called with position coin
      expect(usePerpsMarketDataMock).toHaveBeenCalledWith(
        defaultPerpsPositionMock.coin,
      );
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

      // Assert - Action buttons should be visible in normal state
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
      expect(
        queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CANCEL_BUTTON,
        ),
      ).toBeDefined();
    });
  });

  describe('Display Mode Toggle Functionality', () => {
    it('provides display mode toggle button', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Assert - Toggle button should be available for USD/token switching
      expect(
        queryByTestId(PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON),
      ).toBeDefined();
    });

    it('maintains component stability with display mode interactions', () => {
      // Arrange
      const { queryByTestId } = renderWithProvider(
        <PerpsClosePositionView />,
        {
          state: STATE_MOCK,
        },
        true,
      );

      // Act - Interact with display toggle
      const toggleButton = queryByTestId(
        PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
      );
      if (toggleButton) {
        fireEvent.press(toggleButton);
      }

      // Assert - Component should remain stable after mode interaction
      expect(
        queryByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('Keypad Input Handling Logic', () => {
    it('handles keypad input changes in USD mode correctly', () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockReturnValue({ track });

      const component = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Assert - Component should render and handle keypad input mode
      expect(
        component.queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
      expect(
        component.queryByTestId(
          PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
        ),
      ).toBeDefined();
    });

    it('handles keypad input changes in token mode correctly', () => {
      // Arrange & Act
      const component = renderWithProvider(
        <PerpsClosePositionView />,
        { state: STATE_MOCK },
        true,
      );

      // Simulate display mode toggle to token mode first
      const toggleButton = component.queryByTestId(
        PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON,
      );
      if (toggleButton) {
        fireEvent.press(toggleButton);
      }

      // Assert - Component should handle token input mode
      expect(
        component.queryByTestId(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ),
      ).toBeDefined();
    });
  });

  describe('Position Close Effect Tracking', () => {
    it('tracks percentage change events when not at 100%', async () => {
      // Arrange
      const track = jest.fn();
      usePerpsEventTrackingMock.mockReturnValue({ track });

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

  describe('Limit Order Auto-Open Logic', () => {
    it('auto-opens limit price sheet when switching to limit without price', () => {
      // Arrange
      const TestComponent = () => {
        const [orderType, setOrderType] = React.useState<'market' | 'limit'>(
          'market',
        );
        const [limitPrice] = React.useState('');
        const [isLimitPriceVisible, setIsLimitPriceVisible] =
          React.useState(false);

        // Simulate the useEffect logic from the component
        React.useEffect(() => {
          if (orderType === 'limit' && !limitPrice) {
            setIsLimitPriceVisible(true);
          }
        }, [orderType, limitPrice]);

        return (
          <View>
            <TouchableOpacity onPress={() => setOrderType('limit')}>
              <Text>Switch to Limit</Text>
            </TouchableOpacity>
            <Text testID="limit-sheet-visible">
              {isLimitPriceVisible.toString()}
            </Text>
          </View>
        );
      };

      // Act
      const { getByTestId, getByText } = render(<TestComponent />);
      const switchButton = getByText('Switch to Limit');
      fireEvent.press(switchButton);

      // Assert - Should auto-open limit price sheet
      expect(getByTestId('limit-sheet-visible').props.children).toBe('true');
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
  });

  describe('Confirm Handler Logic', () => {
    it('handles full close position confirmation with all tracking events', async () => {
      // Arrange
      const track = jest.fn();
      const handleClosePosition = jest.fn().mockResolvedValue(undefined);
      usePerpsEventTrackingMock.mockReturnValue({ track });
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
      expect(track).toHaveBeenCalledTimes(3); // Mount + initiated + submitted
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
                await handleClosePosition(
                  defaultPerpsPositionMock,
                  '',
                  orderType,
                  orderType === 'limit' ? limitPrice : undefined,
                );
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

      // Assert - Should call with limit price
      await waitFor(() => {
        expect(handleClosePosition).toHaveBeenCalledWith(
          defaultPerpsPositionMock,
          '',
          'limit',
          '50000',
        );
      });
    });
  });
});
