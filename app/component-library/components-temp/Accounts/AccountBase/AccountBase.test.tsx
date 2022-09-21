import React from 'react';
import { shallow } from 'enzyme';
import { AccountBaseProps } from './AccountBase.types';
import AccountBase from './AccountBase';

describe('AccountBase', () => {
  it('should render AccountBase', () => {
    const wrapper = shallow<AccountBaseProps>(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountType={''}
        accountBalanceLabel={''}
        avatarProps={undefined}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === 'account-base',
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
