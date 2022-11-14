// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { SAMPLE_BADGE_PROPS } from '../../../components/Badges/Badge/Badge.constants';
import { TEST_ACCOUNT_ADDRESS } from '../AccountBalance/AccountBalance.constants';

// Internal dependencies.
import { AccountBaseProps } from './AccountBase.types';
import AccountBase from './AccountBase';

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
        badgeProps={SAMPLE_BADGE_PROPS}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-base',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
