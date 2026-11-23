import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import CurrencyToggle from './CurrencySwitch';
import { backgroundState } from '../../../../util/test/initial-root-state';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('CurrencyToggle', () => {
  const mockProps = {
    onPress: jest.fn(),
    value: '200.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = mockProps) =>
    renderWithProvider(<CurrencyToggle {...props} />, {
      state: mockInitialState,
    });

  it('renders the currency value', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('currency-toggle')).toBeOnTheScreen();
    expect(getByText('200.00')).toBeOnTheScreen();
  });

  it('calls onPress when the toggle is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('currency-toggle'));

    expect(mockProps.onPress).toHaveBeenCalledTimes(1);
  });
});
