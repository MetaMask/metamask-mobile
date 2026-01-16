import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AmountInput from './AmountInput';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const defaultState = {
  engine: {
    backgroundState,
  },
};

const mockProps = {
  label: 'Amount',
  amount: '100.50',
  currencyCode: 'USD',
  currencySymbol: '$',
};

describe('AmountInput', () => {
  it('renders correctly', () => {
    renderWithProvider(<AmountInput {...mockProps} />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with currency selector', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onCurrencyPress={mockOnCurrencyPress} />,
      {
        state: defaultState,
      },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(<AmountInput {...mockProps} onPress={mockOnPress} />, {
      state: defaultState,
    });
    fireEvent.press(screen.getByText('$100.50'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onCurrencyPress when currency is pressed', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onCurrencyPress={mockOnCurrencyPress} />,
      {
        state: defaultState,
      },
    );
    fireEvent.press(screen.getByText('USD'));
    expect(mockOnCurrencyPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading state correctly', () => {
    renderWithProvider(<AmountInput {...mockProps} loading />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading state correctly with currency selector', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput
        {...mockProps}
        onCurrencyPress={mockOnCurrencyPress}
        loading
      />,
      {
        state: defaultState,
      },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    renderWithProvider(
      <AmountInput {...mockProps} onPress={mockOnPress} loading />,
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

  it('does not call onCurrencyPress when loading', () => {
    const mockOnCurrencyPress = jest.fn();
    renderWithProvider(
      <AmountInput
        {...mockProps}
        onCurrencyPress={mockOnCurrencyPress}
        loading
      />,
      {
        state: defaultState,
      },
    );

    const pressableElements = screen.root.findAllByType(TouchableOpacity);
    pressableElements.forEach((pressableElement) => {
      fireEvent.press(pressableElement);
    });

    expect(mockOnCurrencyPress).not.toHaveBeenCalled();
  });
});
