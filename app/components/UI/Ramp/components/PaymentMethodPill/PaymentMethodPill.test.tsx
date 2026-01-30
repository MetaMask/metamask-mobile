import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PaymentMethodPill from './PaymentMethodPill';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('PaymentMethodPill', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label text', () => {
    const { getByText } = renderWithTheme(
      <PaymentMethodPill label="Debit card" />,
    );

    expect(getByText('Debit card')).toBeOnTheScreen();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <PaymentMethodPill label="Debit card" testID="custom-test-id" />,
    );

    expect(getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <PaymentMethodPill label="Debit card" onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId('payment-method-pill'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress handler', () => {
    const { getByTestId } = renderWithTheme(
      <PaymentMethodPill label="Debit card" />,
    );

    expect(getByTestId('payment-method-pill')).toBeOnTheScreen();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(
      <PaymentMethodPill label="Debit card" />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
