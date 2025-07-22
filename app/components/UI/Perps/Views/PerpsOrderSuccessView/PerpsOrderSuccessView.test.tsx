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
  strings: jest.fn((key) => key),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((price) => price),
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

  it('should render without crashing', () => {
    const component = render(<PerpsOrderSuccessView />);
    expect(component).toBeDefined();
  });

  it('should navigate to positions on button press', () => {
    const { getAllByRole } = render(<PerpsOrderSuccessView />);

    // First button should be View Positions
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.POSITIONS);
  });

  it('should navigate to trading view on second button press', () => {
    const { getAllByRole } = render(<PerpsOrderSuccessView />);

    // Second button should be Back to Trading
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[1]);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TRADING_VIEW);
  });

  it('should handle missing route params', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: undefined });

    const component = render(<PerpsOrderSuccessView />);
    expect(component).toBeDefined();
  });
});
