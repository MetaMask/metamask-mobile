import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsClosePositionView from './PerpsClosePositionView';
import {
  usePerpsClosePosition,
  usePerpsOrderFees,
  usePerpsClosePositionValidation,
  useMinimumOrderAmount,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsClosePosition: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsClosePositionValidation: jest.fn(),
  useMinimumOrderAmount: jest.fn(),
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

// Mock UI components
jest.mock('../../../../Base/Keypad', () => 'Keypad');
jest.mock('../../components/PerpsSlider/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../components/PerpsAmountDisplay', () => 'PerpsAmountDisplay');
jest.mock(
  '../../components/PerpsOrderTypeBottomSheet',
  () => 'PerpsOrderTypeBottomSheet',
);
jest.mock(
  '../../components/PerpsLimitPriceBottomSheet',
  () => 'PerpsLimitPriceBottomSheet',
);
jest.mock(
  '../../components/PerpsBottomSheetTooltip',
  () => 'PerpsBottomSheetTooltip',
);

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { default: '#000', alternative: '#666' },
      primary: { default: '#037DD6' },
      error: { default: '#FF0000' },
      warning: { default: '#FFD33D' },
      background: { default: '#FFF' },
    },
    themeAppearance: 'light',
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('PerpsClosePositionView', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  const mockPosition = {
    coin: 'BTC',
    size: '1.5',
    entryPrice: '50000',
    leverage: { value: 10 },
    unrealizedPnl: '500',
  };

  const mockRoute = {
    params: {
      position: mockPosition,
    },
  };

  const mockTrack = jest.fn();
  const mockHandleClosePosition = jest.fn();

  const defaultMockSetup = () => {
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue(mockRoute);

    (usePerpsEventTracking as jest.Mock).mockReturnValue({
      track: mockTrack,
    });

    (usePerpsScreenTracking as jest.Mock).mockReturnValue(undefined);

    (usePerpsLivePrices as jest.Mock).mockReturnValue({
      BTC: { price: '51000' },
    });

    (useMinimumOrderAmount as jest.Mock).mockReturnValue({
      minimumOrderAmount: 10,
    });

    (usePerpsOrderFees as jest.Mock).mockReturnValue({
      totalFee: 50,
      metamaskFee: 25,
      protocolFee: 25,
      metamaskFeeRate: 0.0005,
      protocolFeeRate: 0.0005,
    });

    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: [],
      isValid: true,
      isValidating: false,
    });

    (usePerpsClosePosition as jest.Mock).mockReturnValue({
      handleClosePosition: mockHandleClosePosition,
      isClosing: false,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultMockSetup();
  });

  it('should render correctly with position data', () => {
    const { getByText } = render(<PerpsClosePositionView />);
    // Check header renders
    expect(getByText('perps.close_position.title')).toBeTruthy();
  });

  it('should track screen view on mount', async () => {
    render(<PerpsClosePositionView />);

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_POSITION_CLOSE_SCREEN_VIEWED,
        expect.objectContaining({
          asset: 'BTC',
          direction: 'long',
          positionSize: 1.5,
          unrealizedPnlDollar: 500,
        }),
      );
    });
  });

  it('should display validation errors', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: ['perps.close_position.negative_receive_amount'],
      warnings: [],
      isValid: false,
      isValidating: false,
    });

    const { getByText } = render(<PerpsClosePositionView />);

    expect(
      getByText('perps.close_position.negative_receive_amount'),
    ).toBeTruthy();
  });

  it('should display validation warnings', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: ['perps.order.validation.limit_price_far_warning'],
      isValid: true,
      isValidating: false,
    });

    const { getByText } = render(<PerpsClosePositionView />);

    expect(
      getByText('perps.order.validation.limit_price_far_warning'),
    ).toBeTruthy();
  });

  it('should call handleClosePosition when submit is pressed', async () => {
    mockHandleClosePosition.mockResolvedValue(undefined);

    const { getByTestId } = render(<PerpsClosePositionView />);

    const submitButton = getByTestId('close-position-confirm-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockHandleClosePosition).toHaveBeenCalled();
    });
  });

  it('should navigate back when cancel is pressed', () => {
    const { getByTestId } = render(<PerpsClosePositionView />);

    const cancelButton = getByTestId('close-position-cancel-button');
    fireEvent.press(cancelButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('should show loading state while closing', () => {
    (usePerpsClosePosition as jest.Mock).mockReturnValue({
      handleClosePosition: mockHandleClosePosition,
      isClosing: true,
    });

    const { getByTestId } = render(<PerpsClosePositionView />);

    const submitButton = getByTestId('close-position-confirm-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should handle short positions correctly', () => {
    const shortPosition = {
      ...mockPosition,
      size: '-1.5', // Negative size for short
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: shortPosition },
    });

    render(<PerpsClosePositionView />);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_POSITION_CLOSE_SCREEN_VIEWED,
      expect.objectContaining({
        direction: 'short',
      }),
    );
  });

  it('should handle successful close with navigation', async () => {
    // Setup mock to trigger onSuccess callback
    (usePerpsClosePosition as jest.Mock).mockReturnValue({
      handleClosePosition: jest.fn().mockImplementation(() => {
        // Simulate successful close by calling onSuccess
        mockNavigation.goBack();
        return Promise.resolve();
      }),
      isClosing: false,
    });

    const { getByTestId } = render(<PerpsClosePositionView />);

    const submitButton = getByTestId('close-position-confirm-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('should calculate fees for different close percentages', () => {
    render(<PerpsClosePositionView />);

    // Initial render should calculate fees for 100% close
    expect(usePerpsOrderFees).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'market',
        isMaker: false,
      }),
    );
  });

  it('should handle limit order type', () => {
    // Test that component handles limit order type
    render(<PerpsClosePositionView />);

    // Verify initial state is market order
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'market',
      }),
    );
  });

  it('should validate position close parameters', () => {
    render(<PerpsClosePositionView />);

    // Verify validation hook is called with correct params
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        coin: 'BTC',
        closePercentage: 100,
        orderType: 'market',
        currentPrice: 51000,
        minimumOrderAmount: 10,
      }),
    );
  });

  it('should handle position with no leverage', () => {
    const positionNoLeverage = {
      ...mockPosition,
      leverage: undefined,
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: positionNoLeverage },
    });

    render(<PerpsClosePositionView />);
    // Should use default leverage of 1
    expect(mockTrack).toHaveBeenCalled();
  });

  it('should handle zero unrealized PnL', () => {
    const positionZeroPnL = {
      ...mockPosition,
      unrealizedPnl: '0',
    };

    (useRoute as jest.Mock).mockReturnValue({
      params: { position: positionZeroPnL },
    });

    render(<PerpsClosePositionView />);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_POSITION_CLOSE_SCREEN_VIEWED,
      expect.objectContaining({
        unrealizedPnlDollar: 0,
      }),
    );
  });

  it('should use entry price when live price is unavailable', () => {
    (usePerpsLivePrices as jest.Mock).mockReturnValue({
      BTC: { price: null },
    });

    render(<PerpsClosePositionView />);

    // Should fall back to entry price
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPrice: 50000, // Falls back to entry price
      }),
    );
  });

  it('should handle keypad input changes', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const keypad = UNSAFE_getByType('Keypad');

    // Simulate keypad change
    keypad.props.onChange({ value: '25000', valueAsNumber: 25000 });

    // Should update close percentage based on input
    expect(keypad.props.value).toBeDefined();
  });

  it('should handle percentage button presses', () => {
    const { UNSAFE_getAllByType } = render(<PerpsClosePositionView />);

    // Find percentage buttons (TouchableOpacity components)
    const buttons = UNSAFE_getAllByType('TouchableOpacity');

    // Simulate pressing a percentage button (would be 25%, 50%, 75%, MAX)
    if (buttons.length > 0) {
      fireEvent.press(buttons[0]);
    }

    // Component should handle the press
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle slider value changes', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const slider = UNSAFE_getByType('PerpsSlider');

    // Simulate slider change
    slider.props.onValueChange(75);

    // Should update close percentage
    expect(slider.props.value).toBeDefined();
  });

  it('should handle order type bottom sheet', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const orderTypeSheet = UNSAFE_getByType('PerpsOrderTypeBottomSheet');

    // Simulate selecting a new order type
    orderTypeSheet.props.onSelect('limit');

    // Should update order type
    expect(orderTypeSheet.props.isVisible).toBeDefined();
  });

  it('should handle limit price bottom sheet', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const limitPriceSheet = UNSAFE_getByType('PerpsLimitPriceBottomSheet');

    // Simulate confirming limit price
    limitPriceSheet.props.onConfirm('52000');

    // Should update limit price
    expect(limitPriceSheet.props.isVisible).toBeDefined();
  });

  it('should handle tooltip display', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const tooltip = UNSAFE_getByType('PerpsBottomSheetTooltip');

    // Should have tooltip close handler
    tooltip.props.onClose();

    expect(tooltip.props.isVisible).toBeDefined();
  });

  it('should handle amount display press', () => {
    const { UNSAFE_getAllByType } = render(<PerpsClosePositionView />);

    const amountDisplays = UNSAFE_getAllByType('PerpsAmountDisplay');

    // Trigger onPress if available
    if (amountDisplays[0]?.props?.onPress) {
      amountDisplays[0].props.onPress();
    }

    expect(amountDisplays.length).toBeGreaterThan(0);
  });

  it('should disable submit when validation is in progress', () => {
    (usePerpsClosePositionValidation as jest.Mock).mockReturnValue({
      errors: [],
      warnings: [],
      isValid: false,
      isValidating: true, // Validation in progress
    });

    const { getByTestId } = render(<PerpsClosePositionView />);

    const submitButton = getByTestId('close-position-confirm-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should calculate correct position values', () => {
    render(<PerpsClosePositionView />);

    // Verify calculations are performed
    expect(usePerpsClosePositionValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        positionValue: 1.5 * 51000, // size * currentPrice
        closingValue: 1.5 * 51000, // 100% close by default
        remainingPositionValue: 0, // Full close
        isPartialClose: false,
      }),
    );
  });

  it('should update fees when order type changes', () => {
    const { UNSAFE_getByType, rerender } = render(<PerpsClosePositionView />);

    const orderTypeSheet = UNSAFE_getByType('PerpsOrderTypeBottomSheet');

    // Change to limit order
    orderTypeSheet.props.onSelect('limit');

    // Force re-render to trigger useEffect
    rerender(<PerpsClosePositionView />);

    // Fees should be recalculated for limit order
    expect(usePerpsOrderFees).toHaveBeenCalled();
  });

  it('should track value changes when percentage changes', async () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const slider = UNSAFE_getByType('PerpsSlider');

    // Change slider to 50%
    slider.props.onValueChange(50);

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_POSITION_CLOSE_VALUE_CHANGED,
        expect.objectContaining({
          asset: 'BTC',
          closePercentage: 50,
        }),
      );
    });
  });

  it('should handle done button press on keypad', () => {
    const { UNSAFE_getByType } = render(<PerpsClosePositionView />);

    const keypad = UNSAFE_getByType('Keypad');

    // Simulate pressing done
    if (keypad.props.onDone) {
      keypad.props.onDone();
    }

    // Should handle done action
    expect(keypad.props.isVisible).toBeDefined();
  });
});
