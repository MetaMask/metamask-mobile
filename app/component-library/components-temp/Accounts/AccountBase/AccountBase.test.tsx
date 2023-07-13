import React from 'react';
import { shallow } from 'enzyme';
import { AccountBaseProps } from './AccountBase.types';
import AccountBase from './AccountBase';
import {
  TEST_ACCOUNT_ADDRESS,
  BADGE_PROPS,
} from '../AccountBalance/AccountBalance.constants';

describe('AccountBase', () => {
  it('should render AccountBase', () => {
    const wrapper = shallow<AccountBaseProps>(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={TEST_ACCOUNT_ADDRESS}
        badgeProps={BADGE_PROPS}
        useBlockieIcon={false}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-base',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
