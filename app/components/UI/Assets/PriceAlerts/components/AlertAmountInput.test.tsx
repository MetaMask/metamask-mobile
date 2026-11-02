import React from 'react';
import { Pressable, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import AlertAmountInput from './AlertAmountInput';

const TEST_ID = 'alert-amount-input';

describe('AlertAmountInput', () => {
  it('centers and constrains the full amount row', () => {
    const { getByTestId } = render(
      <AlertAmountInput hasInput testID={TEST_ID} text="123.45" />,
    );

    expect(getByTestId(TEST_ID)).toHaveStyle({
      justifyContent: 'center',
      maxWidth: '100%',
      width: '100%',
    });
  });

  it('animates the complete high-precision value after it changes', () => {
    const value = '0.000000000000011';
    const { getByTestId, rerender } = render(
      <AlertAmountInput hasInput testID={TEST_ID} text={value} />,
    );

    expect(getByTestId(`${TEST_ID}-amount`)).toHaveTextContent(value);

    rerender(
      <AlertAmountInput hasInput testID={TEST_ID} text="0.000000000000012" />,
    );

    expect(getByTestId(`${TEST_ID}-amount`)).toHaveProp('layout');
  });

  it('renders the prefix, cursor, and suffix in the amount row', () => {
    const { getByTestId } = render(
      <AlertAmountInput
        hasInput
        prefix={<Text testID="amount-prefix">$</Text>}
        suffix={<Text testID="amount-suffix">%</Text>}
        testID={TEST_ID}
        text="42"
      />,
    );

    expect(getByTestId('amount-prefix')).toHaveTextContent('$');
    expect(getByTestId(`${TEST_ID}-cursor`)).toBeOnTheScreen();
    expect(getByTestId('amount-suffix')).toHaveTextContent('%');
  });

  it('keeps interactive prefixes separate from the accessible amount', () => {
    const { getByTestId } = render(
      <AlertAmountInput
        hasInput
        prefix={<Pressable accessible testID="interactive-prefix" />}
        testID={TEST_ID}
        text="42"
      />,
    );

    expect(getByTestId(TEST_ID)).toHaveProp('accessible', false);
    expect(getByTestId(`${TEST_ID}-amount`)).toHaveProp('accessible', true);
    expect(getByTestId('interactive-prefix')).toHaveProp('accessible', true);
  });
});
