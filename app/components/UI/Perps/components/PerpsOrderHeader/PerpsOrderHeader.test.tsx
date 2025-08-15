import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsOrderHeader from './PerpsOrderHeader';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { alternative: '#F2F4F6' },
      border: { muted: '#D6D9DC' },
      text: { default: '#000000' },
      success: { default: '#00C781' },
      error: { default: '#D73A49' },
    },
  })),
}));

jest.mock('../../../Swaps/components/TokenIcon', () => 'TokenIcon');

jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((price) => `$${price.toFixed(2)}`),
  formatPercentage: jest.fn((percentage) => `${percentage.toFixed(2)}%`),
}));

// Mock ButtonIcon to make it easier to test
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ onPress }: { onPress: () => void }) => (
        <TouchableOpacity testID="back-button" onPress={onPress} />
      ),
      ButtonIconSizes: { Sm: 'sm' },
    };
  },
);

describe('PerpsOrderHeader', () => {
  const mockGoBack = jest.fn();
  const mockOnOrderTypePress = jest.fn();

  const defaultProps = {
    asset: 'ETH',
    price: 3000,
    priceChange: 2.5,
    orderType: 'market' as const,
    onOrderTypePress: mockOnOrderTypePress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
    });
  });

  it('should render without crashing', () => {
    const component = render(<PerpsOrderHeader {...defaultProps} />);
    expect(component).toBeDefined();
  });

  it('should handle navigation back', () => {
    const { getByTestId } = render(<PerpsOrderHeader {...defaultProps} />);
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should handle custom onBack callback', () => {
    const mockOnBack = jest.fn();
    const { getByTestId } = render(
      <PerpsOrderHeader {...defaultProps} onBack={mockOnBack} />,
    );
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    expect(mockOnBack).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('should render with invalid price', () => {
    const component = render(<PerpsOrderHeader {...defaultProps} price={0} />);
    expect(component).toBeDefined();
  });
});
