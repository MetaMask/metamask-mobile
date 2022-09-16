import React from 'react';
import { shallow } from 'enzyme';
import { AccountBalanceProps } from './AccountBalance.types';
import AccountBalance from './AccountBalance';

describe('AccountBalance', () => {
  it('should render AccountBalance', () => {
    const wrapper = shallow<AccountBalanceProps>(
      <AccountBalance
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountType={''}
        accountBalanceLabel={''}
        avatarProps={undefined}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-balance',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
