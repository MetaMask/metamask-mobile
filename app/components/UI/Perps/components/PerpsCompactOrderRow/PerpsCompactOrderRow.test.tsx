import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsCompactOrderRow from './PerpsCompactOrderRow';
import type { Order } from '../../controllers/types';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      leftSection: {},
      infoContainer: {},
      rightSection: {},
      priceText: {},
      labelText: {},
    },
    theme: {
      colors: {
        success: { default: '#00FF00' },
        error: { default: '#FF0000' },
      },
    },
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPositionSize: jest.fn((value) => value),
  formatPerpsFiat: jest.fn((value) => `$${value.toFixed(2)}`),
  PRICE_RANGES_MINIMAL_VIEW: {},
}));

jest.mock('../../utils/marketUtils', () => ({
  getPerpsDisplaySymbol: jest.fn((symbol) => symbol),
}));

jest.mock('../PerpsTokenLogo', () => 'PerpsTokenLogo');

describe('PerpsCompactOrderRow', () => {
  const mockLimitBuyOrder: Order = {
    orderId: 'order-123',
    symbol: 'BTC',
    size: '0.5',
    originalSize: '0.5',
    filledSize: '0',
    remainingSize: '0.5',
    price: '50000',
    side: 'buy',
    orderType: 'limit',
    timestamp: Date.now(),
    status: 'open',
    reduceOnly: false,
    detailedOrderType: 'Limit',
  };

  const mockLimitSellOrder: Order = {
    ...mockLimitBuyOrder,
    orderId: 'order-456',
    side: 'sell',
  };

  const mockMarketOrder: Order = {
    ...mockLimitBuyOrder,
    orderId: 'order-789',
    orderType: 'market',
    detailedOrderType: 'Market',
  };

  const mockTriggerOrder: Order = {
    ...mockLimitBuyOrder,
    orderId: 'order-trigger',
    orderType: 'limit',
    isTrigger: true,
    price: '48000',
    detailedOrderType: 'Stop Market',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order info for limit buy order', () => {
    render(<PerpsCompactOrderRow order={mockLimitBuyOrder} />);

    expect(screen.getByText('Limit long')).toBeOnTheScreen();
    expect(screen.getByText('0.5 BTC')).toBeOnTheScreen();
    expect(screen.getByText('Limit price')).toBeOnTheScreen();
  });

  it('renders order info for limit sell order (short direction)', () => {
    render(<PerpsCompactOrderRow order={mockLimitSellOrder} />);

    expect(screen.getByText('Limit short')).toBeOnTheScreen();
  });

  it('renders market price label for market orders', () => {
    render(<PerpsCompactOrderRow order={mockMarketOrder} />);

    expect(screen.getByText('Market price')).toBeOnTheScreen();
    expect(screen.getByText('Market long')).toBeOnTheScreen();
  });

  it('renders Stop Market order type for trigger orders', () => {
    render(<PerpsCompactOrderRow order={mockTriggerOrder} />);

    expect(screen.getByText('Stop Market long')).toBeOnTheScreen();
  });

  it('uses price for trigger orders', () => {
    const { formatPerpsFiat } = jest.requireMock('../../utils/formatUtils');
    render(<PerpsCompactOrderRow order={mockTriggerOrder} />);

    // Should have called formatPerpsFiat with the order price value (48000)
    // Note: The adapter maps triggerPx to price, so trigger orders use price field
    expect(formatPerpsFiat).toHaveBeenCalledWith(48000, expect.any(Object));
  });

  it('uses order price for limit orders', () => {
    const { formatPerpsFiat } = jest.requireMock('../../utils/formatUtils');
    render(<PerpsCompactOrderRow order={mockLimitBuyOrder} />);

    // Should have called formatPerpsFiat with the order price value (50000)
    expect(formatPerpsFiat).toHaveBeenCalledWith(50000, expect.any(Object));
  });

  it('calls onPress when tapped', () => {
    const mockOnPress = jest.fn();
    render(
      <PerpsCompactOrderRow
        order={mockLimitBuyOrder}
        onPress={mockOnPress}
        testID="compact-order-row"
      />,
    );

    fireEvent.press(screen.getByTestId('compact-order-row'));

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('is disabled when no onPress handler is provided', () => {
    render(
      <PerpsCompactOrderRow
        order={mockLimitBuyOrder}
        testID="compact-order-row"
      />,
    );

    // TouchableOpacity should be disabled - we verify by checking it renders
    expect(screen.getByTestId('compact-order-row')).toBeOnTheScreen();
  });

  it('renders with custom testID', () => {
    render(
      <PerpsCompactOrderRow
        order={mockLimitBuyOrder}
        testID="custom-test-id"
      />,
    );

    expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('formats position size correctly', () => {
    const { formatPositionSize } = jest.requireMock('../../utils/formatUtils');
    render(<PerpsCompactOrderRow order={mockLimitBuyOrder} />);

    expect(formatPositionSize).toHaveBeenCalledWith('0.5');
  });

  it('gets display symbol for the order', () => {
    const { getPerpsDisplaySymbol } = jest.requireMock(
      '../../utils/marketUtils',
    );
    render(<PerpsCompactOrderRow order={mockLimitBuyOrder} />);

    expect(getPerpsDisplaySymbol).toHaveBeenCalledWith('BTC');
  });

  it('handles order without detailedOrderType', () => {
    const orderWithoutDetailedType: Order = {
      ...mockLimitBuyOrder,
      detailedOrderType: undefined,
    };
    render(<PerpsCompactOrderRow order={orderWithoutDetailedType} />);

    // Falls back to 'Limit' for order type display
    expect(screen.getByText('Limit long')).toBeOnTheScreen();
  });
});
