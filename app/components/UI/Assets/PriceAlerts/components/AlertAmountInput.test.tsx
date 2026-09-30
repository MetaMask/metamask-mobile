import React from 'react';
import { Text } from 'react-native';
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

  it('uses native fit-to-width for the complete high-precision value', () => {
    const value = '0.000000000000011';
    const { getByTestId } = render(
      <AlertAmountInput hasInput testID={TEST_ID} text={value} />,
    );

    expect(getByTestId(`${TEST_ID}-amount`)).toHaveTextContent(value);
    expect(getByTestId(`${TEST_ID}-amount`)).toHaveProp(
      'adjustsFontSizeToFit',
      true,
    );
    expect(getByTestId(`${TEST_ID}-amount`)).toHaveProp('numberOfLines', 1);
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
});
