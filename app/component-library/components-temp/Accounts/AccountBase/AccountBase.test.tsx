import React from 'react';
import { render } from '@testing-library/react-native';
import { AccountBaseProps } from './AccountBase.types';
import AccountBase from './AccountBase';
import {
  TEST_ACCOUNT_ADDRESS,
  BADGE_PROPS,
} from '../AccountBalance/AccountBalance.constants';

describe('AccountBase', () => {
  it('should render AccountBase', () => {
    const { toJSON } = render<AccountBaseProps>(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={TEST_ACCOUNT_ADDRESS}
        badgeProps={BADGE_PROPS}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
