// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { SAMPLE_BADGE_PROPS } from '../../../components/Badges/Badge/Badge.constants';

// Internal dependencies.
import { AccountBalanceProps } from './AccountBalance.types';
import AccountBalance from './AccountBalance';
import { ACCOUNT_BALANCE_TEST_ID } from './AccountBalance.constants';

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
        badgeProps={SAMPLE_BADGE_PROPS}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-balance',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
