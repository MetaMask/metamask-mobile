import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PaymentMethodSelector from './PaymentMethodSelector';
import { Image } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const defaultState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../../../util/theme', () => ({
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
    'https://on-ramp-content-uat.api.cx.metamask.io/assets/Visa-regular@3x.png',
    'https://on-ramp-content-uat.api.cx.metamask.io/assets/Mastercard-regular@3x.png',
  ],
};

describe('PaymentMethodSelector', () => {
  it('renders correctly', () => {
    renderWithProvider(<PaymentMethodSelector {...mockProps} />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly if there are no icons', () => {
    renderWithProvider(
      <PaymentMethodSelector {...mockProps} paymentMethodIcons={undefined} />,
      {
        state: defaultState,
      },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <PaymentMethodSelector {...mockProps} onPress={mockOnPress} />,
      {
        state: defaultState,
      },
    );
    fireEvent.press(screen.getByText(mockProps.name));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading state correctly', () => {
    renderWithProvider(<PaymentMethodSelector {...mockProps} loading />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <PaymentMethodSelector {...mockProps} onPress={mockOnPress} loading />,
      {
        state: defaultState,
      },
    );

    const pressableElements = screen.root.findAllByType(TouchableOpacity);
    if (pressableElements.length > 0) {
      fireEvent.press(pressableElements[0]);
    }

    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
