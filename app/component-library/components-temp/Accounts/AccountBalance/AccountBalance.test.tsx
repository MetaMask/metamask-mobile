import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountBalance from './AccountBalance';
import {
  ACCOUNT_BALANCE_TEST_ID,
  BADGE_PROPS,
} from './AccountBalance.constants';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';

describe('AccountBalance', () => {
  it('should render AccountBalance', () => {
    render(
      <AccountBalance
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={ACCOUNT_BALANCE_TEST_ID}
        badgeProps={BADGE_PROPS}
        avatarAccountType={AvatarAccountType.Maskicon}
      />,
    );
    expect(screen.getByTestId('account-balance')).toBeTruthy();
  });
});
