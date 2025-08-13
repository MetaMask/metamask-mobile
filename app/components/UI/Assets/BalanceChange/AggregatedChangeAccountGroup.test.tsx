import React from 'react';
import { render } from '@testing-library/react-native';
import AccountGroupBalanceChange from './AccountGroupBalanceChange';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './constants';

describe('AccountGroupBalanceChange', () => {
  it('renders positive amount and percent with prefix', () => {
    const { getByTestId } = render(
      <AccountGroupBalanceChange
        privacyMode={false}
        amountChangeInUserCurrency={12.34}
        percentChange={5.67}
        userCurrency={'usd'}
      />,
    );

    const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
    const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
    expect(value).toBeDefined();
    expect(percent).toBeDefined();
    expect(String(percent.props.children)).toMatch(/^\(\+/);
    expect(String(value.props.children)).toContain('+');
  });

  it('renders negative amount and percent with minus prefix', () => {
    const { getByTestId } = render(
      <AccountGroupBalanceChange
        privacyMode={false}
        amountChangeInUserCurrency={-1.23}
        percentChange={-0.99}
        userCurrency={'usd'}
      />,
    );

    const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
    const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
    expect(String(percent.props.children)).toMatch(/^\(-/);
    expect(String(value.props.children)).toContain('-');
  });
});
