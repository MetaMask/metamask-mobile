import React from 'react';
import { shallow } from 'enzyme';
import { AccountBalanceProps } from './AccountBalance.types';
import AccountBalance from './AccountBalance';
import {
  ACCOUNT_BALANCE_TEST_ID,
  BADGE_PROPS,
} from './AccountBalance.constants';

describe('AccountBalance', () => {
  it('should render AccountBalance', () => {
    const wrapper = shallow<AccountBalanceProps>(
      <AccountBalance
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={ACCOUNT_BALANCE_TEST_ID}
        badgeProps={BADGE_PROPS}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-balance',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
