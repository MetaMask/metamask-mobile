import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import PaymentMethodPill from './PaymentMethodPill';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

jest.mock('../../Aggregator/components/PaymentMethodIcon', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const Mock = (props: { paymentMethodType?: string }) =>
    ReactActual.createElement(
      View,
      { testID: 'mock-payment-method-icon' },
      ReactActual.createElement(Text, null, props.paymentMethodType ?? ''),
    );
  return { __esModule: true, default: Mock };
});

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

  it('renders generic card when paymentType is unknown', () => {
    const { queryByTestId } = renderWithTheme(
      <PaymentMethodPill
        label="Pay"
        paymentMethod={{
          paymentType: 'future-payment-method',
        }}
      />,
    );

    expect(queryByTestId('mock-payment-method-icon')).toBeNull();
  });

  it('renders PaymentMethodIcon when paymentMethod has paymentType', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <PaymentMethodPill
        label="Apple Pay"
        paymentMethod={{
          paymentType: PaymentType.ApplePay,
        }}
      />,
    );

    expect(getByText('Apple Pay')).toBeOnTheScreen();
    expect(getByTestId('mock-payment-method-icon')).toBeOnTheScreen();
    expect(getByText(PaymentType.ApplePay)).toBeOnTheScreen();
  });

  describe('when isLoading is true', () => {
    it('renders a non-interactive View instead of TouchableOpacity', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderWithTheme(
        <PaymentMethodPill
          label="Select payment method"
          onPress={mockOnPress}
          isLoading
        />,
      );

      fireEvent.press(getByTestId('payment-method-pill'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not render label text', () => {
      const { queryByText } = renderWithTheme(
        <PaymentMethodPill label="Select payment method" isLoading />,
      );

      expect(queryByText('Select payment method')).toBeNull();
    });

    it('does not render arrow icon', () => {
      const { toJSON } = renderWithTheme(
        <PaymentMethodPill label="Select payment method" isLoading />,
      );
      const json = JSON.stringify(toJSON());

      expect(json).not.toContain('ArrowDown');
    });

    it('applies loadingContainer style with centered content', () => {
      const { getByTestId } = renderWithTheme(
        <PaymentMethodPill label="Select payment method" isLoading />,
      );
      const pill = getByTestId('payment-method-pill');

      expect(pill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            justifyContent: 'center',
            minWidth: 120,
          }),
        ]),
      );
    });

    it('matches snapshot when loading', () => {
      const { toJSON } = renderWithTheme(
        <PaymentMethodPill label="Select payment method" isLoading />,
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
