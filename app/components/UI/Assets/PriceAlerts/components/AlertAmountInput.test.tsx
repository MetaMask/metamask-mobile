import React from 'react';
import { Pressable, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import AlertAmountInput from './AlertAmountInput';
import {
  getAlertAmountCursorTestId,
  getAlertAmountTestId,
} from './AlertAmountInput.testIds';

const TEST_ID = 'alert-amount-input';

describe('AlertAmountInput', () => {
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
    expect(getByTestId(getAlertAmountCursorTestId(TEST_ID))).toBeOnTheScreen();
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
    expect(getByTestId(getAlertAmountTestId(TEST_ID))).toHaveProp(
      'accessible',
      true,
    );
    expect(getByTestId('interactive-prefix')).toHaveProp('accessible', true);
  });
});
