import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PaymentMethodSelector from './PaymentMethodSelector';
import { Image } from 'react-native';
import { render as renderComponent } from '@testing-library/react-native/build/pure';

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      icon: { default: '#000' },
      border: { muted: '#ccc' },
    },
  }),
}));

const mockProps = {
  name: 'Debit or Credit',
  label: 'Update payment method',
  icon: <Image source={{ uri: 'https://example.com/icon.png' }} />,
  paymentMethodIcons: [
    'https://on-ramp-content.api.cx.metamask.io/assets/Visa-regular@3x.png',
    'https://on-ramp-content.api.cx.metamask.io/assets/Mastercard-regular@3x.png',
  ],
};

describe('PaymentMethodSelector', () => {
  it('renders correctly', () => {
    renderComponent(<PaymentMethodSelector {...mockProps} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    render(<PaymentMethodSelector {...mockProps} onPress={mockOnPress} />);
    fireEvent.press(screen.getByText(mockProps.name));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
