import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PaymentMethodListItem from './PaymentMethodListItem';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { PaymentMethod } from '@metamask/ramps-controller';

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

const mockPaymentMethod: PaymentMethod = {
  id: '/payments/debit-credit-card',
  paymentType: 'debit-credit-card',
  name: 'Debit or Credit',
  score: 90,
  icon: 'card',
  disclaimer: "Credit card purchases may incur your bank's cash advance fees.",
  delay: [5, 10],
  pendingOrderDescription: 'Card purchases may take a few minutes to complete.',
};

const mockPaymentMethodWithoutDelay: PaymentMethod = {
  ...mockPaymentMethod,
  delay: undefined,
};

describe('PaymentMethodListItem', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment method name', () => {
    const { getByText } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethod} />,
    );

    expect(getByText('Debit or Credit')).toBeOnTheScreen();
  });

  it('renders delay text when delay array is provided', () => {
    const { getByText } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethod} />,
    );

    expect(getByText('5 - 10 mins')).toBeOnTheScreen();
  });

  it('does not render delay text when not available', () => {
    const { queryByText } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethodWithoutDelay} />,
    );

    expect(queryByText('5 - 10 mins')).not.toBeOnTheScreen();
  });

  it('renders quote amounts', () => {
    const { getByText } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethod} />,
    );

    expect(getByText('0.10596 ETH')).toBeOnTheScreen();
    expect(getByText('~ $499.97')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = renderWithTheme(
      <PaymentMethodListItem
        paymentMethod={mockPaymentMethod}
        onPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText('Debit or Credit'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders as selected when isSelected is true', () => {
    const { toJSON } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethod} isSelected />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(
      <PaymentMethodListItem paymentMethod={mockPaymentMethod} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
