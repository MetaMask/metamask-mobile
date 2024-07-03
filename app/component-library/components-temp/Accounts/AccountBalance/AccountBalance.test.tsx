import React from 'react';
import { render } from '@testing-library/react-native';
import AccountBalance from './AccountBalance';
import {
  ACCOUNT_BALANCE_TEST_ID,
  BADGE_PROPS,
} from './AccountBalance.constants';

describe('AccountBalance', () => {
  it('should render AccountBalance', () => {
    const { getByTestId } = render(
      <AccountBalance
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={ACCOUNT_BALANCE_TEST_ID}
        badgeProps={BADGE_PROPS}
        useBlockieIcon={false}
      />,
    );
    const singleSelectComponent = getByTestId('account-balance');
    expect(singleSelectComponent).toBeTruthy();
  });
});
