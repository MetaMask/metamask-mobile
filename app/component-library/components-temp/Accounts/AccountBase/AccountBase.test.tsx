import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountBase from './AccountBase';
import {
  TEST_ACCOUNT_ADDRESS,
  BADGE_PROPS,
} from '../AccountBalance/AccountBalance.constants';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';

describe('AccountBase', () => {
  it('renders AccountBase with network badge when badgeProps.src is provided', () => {
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

    expect(screen.getByTestId('account-base')).toBeOnTheScreen();
    expect(screen.getByTestId('account-base-network-badge')).toBeOnTheScreen();
  });

  it('renders without network badge when badgeProps.src is missing', () => {
    render(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={TEST_ACCOUNT_ADDRESS}
        badgeProps={{ name: 'Ethereum' }}
        avatarAccountType={AvatarAccountType.Maskicon}
      />,
    );

    expect(screen.getByTestId('account-base')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('account-base-network-badge'),
    ).not.toBeOnTheScreen();
  });
});
