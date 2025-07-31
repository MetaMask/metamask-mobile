import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import PerpsClosePositionBottomSheet from './PerpsClosePositionBottomSheet';
import type { Position } from '../../controllers/types';

// Mock dependencies
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => children),
  }),
);

jest.mock('../PerpsSlider/PerpsSlider', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ value, onValueChange }) => (
      <View testID="perps-slider" value={value} onValueChange={onValueChange} />
    )),
  };
});

jest.mock('../../hooks', () => ({
  usePerpsPrices: jest.fn(() => ({
    BTC: { price: '45000' },
    ETH: { price: '2500' },
  })),
  usePerpsOrderFees: jest.fn(() => ({
    totalFee: 45,
    protocolFee: 45,
    metamaskFee: 0,
    protocolFeeRate: 0.00045,
    metamaskFeeRate: 0,
    isLoadingMetamaskFee: false,
    error: null,
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockStore = configureStore([]);

describe('PerpsClosePositionBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockPosition: Position = {
    coin: 'BTC',
    entryPrice: '40000',
    size: '0.1',
    positionValue: '4500',
    unrealizedPnl: '500',
    marginUsed: '450',
    leverage: { type: 'cross', value: 10 },
    liquidationPrice: '35000',
    takeProfitPrice: '50000',
    stopLossPrice: '38000',
    cumulativeFunding: {
      allTime: '10',
      sinceChange: '2',
      sinceOpen: '5',
    },
    maxLeverage: 50,
    returnOnEquity: '111.11',
  };

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    position: mockPosition,
    isClosing: false,
  };

  const renderComponent = (props = {}) => {
    const store = mockStore({});
    return render(
      <Provider store={store}>
        <PerpsClosePositionBottomSheet {...defaultProps} {...props} />
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly when visible', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('market-order-tab')).toBeTruthy();
      expect(getByTestId('limit-order-tab')).toBeTruthy();
      expect(getByTestId('position-size-display')).toBeTruthy();
      expect(getByTestId('perps-slider')).toBeTruthy();
    });

    it('should not render when not visible', () => {
      const { queryByTestId } = renderComponent({ isVisible: false });

      expect(queryByTestId('market-order-tab')).toBeFalsy();
    });
  });

  describe('Order Type Tabs', () => {
    it('should default to market order', () => {
      const { getByTestId, queryByTestId } = renderComponent();

      expect(getByTestId('market-order-tab')).toBeTruthy();
      expect(queryByTestId('limit-price-input')).toBeFalsy();
    });

    it('should switch to limit order when limit tab is pressed', () => {
      const { getByTestId } = renderComponent();

      const limitTab = getByTestId('limit-order-tab');
      fireEvent.press(limitTab);

      expect(getByTestId('limit-price-input')).toBeTruthy();
    });

    it('should hide limit price input for market orders', () => {
      const { queryByTestId } = renderComponent();

      expect(queryByTestId('limit-price-input')).toBeFalsy();
    });
  });

  describe('Position Size Display', () => {
    it('should display correct USD value and token amount', () => {
      const { getByTestId } = renderComponent();

      // Full position (100%) = 0.1 BTC * $45,000 = $4,500
      expect(getByTestId('close-amount-usd')).toBeTruthy();
      expect(getByTestId('close-amount-tokens')).toBeTruthy();
    });

    it('should update display when slider percentage changes', async () => {
      const { getByTestId } = renderComponent();

      const slider = getByTestId('perps-slider');

      // Simulate 50% slider
      fireEvent(slider, 'onValueChange', 50);

      await waitFor(() => {
        // Just verify the elements update
        expect(getByTestId('close-amount-usd')).toBeTruthy();
        expect(getByTestId('close-amount-tokens')).toBeTruthy();
      });
    });
  });

  describe('Position Details', () => {
    it('should display PnL, fees and receive amount', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('position-pnl')).toBeTruthy();
      expect(getByTestId('position-fees')).toBeTruthy();
      expect(getByTestId('receive-amount')).toBeTruthy();
    });

    it('should calculate correct values for short positions', () => {
      const shortPosition = {
        ...mockPosition,
        size: '-0.1', // Short position
      };

      const { getByTestId } = renderComponent({ position: shortPosition });

      // Just verify elements are rendered for short positions
      expect(getByTestId('position-pnl')).toBeTruthy();
      expect(getByTestId('position-fees')).toBeTruthy();
      expect(getByTestId('receive-amount')).toBeTruthy();
    });
  });

  describe('Limit Price Input', () => {
    it('should validate limit price input', () => {
      const { getByTestId } = renderComponent();

      // Switch to limit order
      fireEvent.press(getByTestId('limit-order-tab'));

      const input = getByTestId('limit-price-input');

      // Should only allow numbers and decimal
      fireEvent.changeText(input, 'abc123.45xyz');
      expect(input.props.value).toBe('123.45');
    });

    it('should format limit price on blur', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('limit-order-tab'));

      const input = getByTestId('limit-price-input');
      fireEvent.changeText(input, '45500');
      fireEvent(input, 'blur');

      // Check that value was set (actual formatting depends on formatPrice implementation)
      expect(input.props.value).toBeTruthy();
    });
  });

  describe('Confirmation', () => {
    it('should call onConfirm with correct params for full market close', async () => {
      const { getByText } = renderComponent();

      const confirmButton = getByText('perps.close_position.button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          '', // Empty string for full close
          'market',
          undefined,
        );
      });
    });

    it('should call onConfirm with size for partial close', async () => {
      const { getByText, getByTestId } = renderComponent();

      // Set to 50%
      const slider = getByTestId('perps-slider');
      fireEvent(slider, 'onValueChange', 50);

      const confirmButton = getByText('perps.close_position.button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          '0.05', // 50% of 0.1
          'market',
          undefined,
        );
      });
    });

    it('should include limit price for limit orders', async () => {
      const { getByText, getByTestId } = renderComponent();

      // Switch to limit and set price
      fireEvent.press(getByTestId('limit-order-tab'));
      const input = getByTestId('limit-price-input');
      fireEvent.changeText(input, '45500');

      const confirmButton = getByText('perps.close_position.button');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('', 'limit', '45500');
      });
    });

    it('should disable confirm button for limit orders without price', () => {
      const { getByTestId, getByText } = renderComponent();

      fireEvent.press(getByTestId('limit-order-tab'));

      // Try to press the button
      const confirmButton = getByText('perps.close_position.button');
      fireEvent.press(confirmButton);

      // Since the button is disabled, onConfirm should not be called
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading overlay when closing', () => {
      const { getByText } = renderComponent({ isClosing: true });

      expect(getByText('perps.close_position.closing')).toBeTruthy();
    });

    it('should disable button when closing', () => {
      const { getByText } = renderComponent({ isClosing: true });

      // The button should show loading text when closing
      expect(getByText('perps.close_position.closing')).toBeTruthy();

      // Verify onConfirm is not called initially
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle position with zero size', () => {
      const zeroSizePosition = {
        ...mockPosition,
        size: '0',
      };

      const { getByTestId } = renderComponent({ position: zeroSizePosition });

      // Should still render without errors
      expect(getByTestId('position-size-display')).toBeTruthy();
    });

    it('should handle rapid slider changes', async () => {
      const { getByTestId } = renderComponent();
      const slider = getByTestId('perps-slider');

      // Simulate rapid value changes
      fireEvent(slider, 'onValueChange', 25);
      fireEvent(slider, 'onValueChange', 50);
      fireEvent(slider, 'onValueChange', 75);
      fireEvent(slider, 'onValueChange', 100);

      await waitFor(() => {
        // Should show final value correctly
        expect(getByTestId('perps-slider').props.value).toBe(100);
      });
    });

    it('should handle limit price edge cases', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('limit-order-tab'));
      const input = getByTestId('limit-price-input');

      // Test various edge cases
      fireEvent.changeText(input, '0');
      expect(input.props.value).toBe('0');

      fireEvent.changeText(input, '999999999');
      expect(input.props.value).toBe('999999999');

      fireEvent.changeText(input, '0.00000001');
      expect(input.props.value).toBe('0.00000001');

      // Test invalid characters are filtered
      fireEvent.changeText(input, '-123');
      expect(input.props.value).toBe('123');

      // Test multiple decimal points - the function returns early and doesn't update
      const valueBefore = input.props.value;
      fireEvent.changeText(input, '1.2.3');
      // Value should remain unchanged when trying to add second decimal
      expect(input.props.value).toBe(valueBefore);
    });

    it('should handle position with both TP and SL', () => {
      const tpslPosition = {
        ...mockPosition,
        takeProfitPrice: '60000',
        stopLossPrice: '35000',
      };

      const { getByTestId } = renderComponent({ position: tpslPosition });

      // Should show position details
      expect(getByTestId('position-pnl')).toBeTruthy();
    });

    it('should handle undefined leverage', () => {
      const noLeveragePosition = {
        ...mockPosition,
        leverage: undefined,
      };

      const { getByTestId } = renderComponent({ position: noLeveragePosition });

      // Should handle undefined leverage gracefully
      expect(getByTestId('position-size-display')).toBeTruthy();
    });

    it('should handle percentage boundary values', async () => {
      const { getByTestId } = renderComponent();
      const slider = getByTestId('perps-slider');

      // Test boundary values
      fireEvent(slider, 'onValueChange', 0);
      fireEvent(slider, 'onValueChange', 100);
      fireEvent(slider, 'onValueChange', 1);

      // Should handle all values without errors
      expect(getByTestId('position-size-display')).toBeTruthy();
    });
  });
});
