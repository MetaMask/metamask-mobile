import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountBase from './AccountBase';
import {
  TEST_ACCOUNT_ADDRESS,
  BADGE_PROPS,
} from '../AccountBalance/AccountBalance.constants';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';

describe('AccountBase', () => {
  it('should render AccountBase', () => {
    render(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={TEST_ACCOUNT_ADDRESS}
        badgeProps={BADGE_PROPS}
        avatarAccountType={AvatarAccountType.Maskicon}
      />,
    );
    expect(screen.getByTestId('account-base')).toBeTruthy();
  });
});
