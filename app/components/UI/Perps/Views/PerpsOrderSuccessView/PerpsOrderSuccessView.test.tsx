import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsOrderSuccessView from './PerpsOrderSuccessView';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000', muted: '#999999' },
      success: { default: '#00C781' },
      error: { default: '#D73A49' },
    },
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key, params) => {
    const translations: Record<string, string> = {
      'perps.order.success.title': 'Order Placed Successfully',
      'perps.order.success.subtitle': 'Your %{direction} %{asset} order has been placed',
      'perps.order.success.asset': 'Asset',
      'perps.order.success.direction': 'Direction',
      'perps.order.success.amount': 'Amount',
      'perps.order.leverage': 'Leverage',
      'perps.order.take_profit': 'Take Profit',
      'perps.order.stop_loss': 'Stop Loss',
      'perps.order.success.orderId': 'Order ID',
      'perps.order.success.viewPositions': 'View Positions',
      'perps.order.success.backToPerps': 'Back to Trading',
    };
    let result = translations[key] || key;
    // Simple template interpolation
    if (params) {
      Object.keys(params).forEach((param) => {
        result = result.replace(`%{${param}}`, params[param]);
      });
    }
    return result;
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((price) => `$${price}`),
}));

describe('PerpsOrderSuccessView', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  const defaultRoute = {
    params: {
      asset: 'ETH',
      direction: 'long',
      size: '1000',
      leverage: 5,
      takeProfitPrice: '3500',
      stopLossPrice: '2800',
      orderId: '0x1234567890abcdef',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });
    (useRoute as jest.Mock).mockReturnValue(defaultRoute);
  });

  it('should render correctly with all order details', () => {
    const { getByText } = render(<PerpsOrderSuccessView />);

    // Check title and subtitle
    expect(getByText('Order Placed Successfully')).toBeDefined();
    expect(getByText('Your long ETH order has been placed')).toBeDefined();

    // Check order details
    expect(getByText('Asset')).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
    expect(getByText('Direction')).toBeDefined();
    expect(getByText('long')).toBeDefined();
    expect(getByText('Amount')).toBeDefined();
    expect(getByText('$1000')).toBeDefined();
    expect(getByText('Leverage')).toBeDefined();
    expect(getByText('5x')).toBeDefined();

    // Check conditional fields
    expect(getByText('Take Profit')).toBeDefined();
    expect(getByText('$3500')).toBeDefined();
    expect(getByText('Stop Loss')).toBeDefined();
    expect(getByText('$2800')).toBeDefined();
    expect(getByText('Order ID')).toBeDefined();
    expect(getByText('0x123456...')).toBeDefined();
  });

  it('should render correctly for short position', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        asset: 'BTC',
        direction: 'short',
        size: '500',
        leverage: 3,
      },
    });

    const { getByText } = render(<PerpsOrderSuccessView />);

    expect(getByText('Your short BTC order has been placed')).toBeDefined();
    expect(getByText('short')).toBeDefined();
  });

  it('should render without optional fields', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        asset: 'SOL',
        direction: 'long',
        size: '200',
        leverage: 2,
      },
    });

    const { queryByText } = render(<PerpsOrderSuccessView />);

    // Optional fields should not be rendered
    expect(queryByText('Take Profit')).toBeNull();
    expect(queryByText('Stop Loss')).toBeNull();
    expect(queryByText('Order ID')).toBeNull();
  });

  it('should handle view positions button press', () => {
    const { getByText } = render(<PerpsOrderSuccessView />);

    const viewPositionsButton = getByText('View Positions');
    fireEvent.press(viewPositionsButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.POSITIONS);
  });

  it('should handle back to trading button press', () => {
    const { getByText } = render(<PerpsOrderSuccessView />);

    const backButton = getByText('Back to Trading');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TRADING_VIEW);
  });

  it('should render with default values when route params are missing', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: undefined });

    const { getByText } = render(<PerpsOrderSuccessView />);

    // Should use default values
    expect(getByText('BTC')).toBeDefined();
    expect(getByText('long')).toBeDefined();
    expect(getByText('$400')).toBeDefined();
    expect(getByText('10x')).toBeDefined();
  });

  it('should render success icon', () => {
    const { getByText } = render(<PerpsOrderSuccessView />);

    // Check for the checkmark icon
    expect(getByText('✓')).toBeDefined();
  });
});