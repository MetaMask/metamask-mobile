import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import PaymentMethodRow from './payment-method-row';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const baseProps = {
  id: 'usdc',
  icon: <Text testID="icon">USDC-icon</Text>,
  title: 'USDC',
};

describe('PaymentMethodRow', () => {
  it('renders title and icon with derived testID', () => {
    const { getByTestId } = render(<PaymentMethodRow {...baseProps} />);

    expect(getByTestId('payment-method-row-usdc')).toBeOnTheScreen();
    expect(getByTestId('payment-method-row-usdc-title')).toHaveTextContent(
      'USDC',
    );
    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  it('renders subtitle when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} subtitle="$500.00 available" />,
    );

    expect(getByTestId('payment-method-row-usdc-subtitle')).toHaveTextContent(
      '$500.00 available',
    );
  });

  it('renders Last used tag when isLastUsed is true', () => {
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} isLastUsed />,
    );

    expect(
      getByTestId('payment-method-row-usdc-last-used-tag'),
    ).toBeOnTheScreen();
  });

  it('does not render Last used tag when isLastUsed is false', () => {
    const { queryByTestId } = render(<PaymentMethodRow {...baseProps} />);

    expect(
      queryByTestId('payment-method-row-usdc-last-used-tag'),
    ).not.toBeOnTheScreen();
  });

  it('renders checkmark when trailingElement is "checkmark"', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="checkmark" />,
    );

    expect(getByTestId('payment-method-row-checkmark')).toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-chevron')).not.toBeOnTheScreen();
  });

  it('renders chevron when trailingElement is "chevron"', () => {
    const { getByTestId, queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="chevron" />,
    );

    expect(getByTestId('payment-method-row-chevron')).toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-checkmark')).not.toBeOnTheScreen();
  });

  it('renders nothing trailing when trailingElement is "none"', () => {
    const { queryByTestId } = render(
      <PaymentMethodRow {...baseProps} trailingElement="none" />,
    );

    expect(queryByTestId('payment-method-row-checkmark')).not.toBeOnTheScreen();
    expect(queryByTestId('payment-method-row-chevron')).not.toBeOnTheScreen();
  });

  it('renders custom ReactNode trailing element when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow
        {...baseProps}
        trailingElement={<Text testID="custom-trailing">Add</Text>}
      />,
    );

    expect(getByTestId('custom-trailing')).toHaveTextContent('Add');
  });

  it('invokes onPress when row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} onPress={onPress} />,
    );

    fireEvent.press(getByTestId('payment-method-row-usdc'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} onPress={onPress} disabled />,
    );

    fireEvent.press(getByTestId('payment-method-row-usdc'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(
      <PaymentMethodRow {...baseProps} testID="custom-test-id" />,
    );

    expect(getByTestId('custom-test-id')).toBeOnTheScreen();
  });
});
