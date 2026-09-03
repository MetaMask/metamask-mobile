import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountBase from './AccountBase';
import {
  TEST_ACCOUNT_ADDRESS,
  BADGE_PROPS,
} from '../AccountBalance/AccountBalance.constants';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';
import { BadgeVariant } from '../../../components/Badges/Badge';
import { BADGENETWORK_TEST_ID } from '../../../components/Badges/Badge/variants/BadgeNetwork/BadgeNetwork.constants';

describe('AccountBase', () => {
  it('renders network badge when badgeProps.imageSource is provided', () => {
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
    expect(screen.getByTestId(BADGENETWORK_TEST_ID)).toBeOnTheScreen();
  });

  it('renders without network badge when badgeProps.imageSource is missing', () => {
    render(
      <AccountBase
        accountBalance={0}
        accountNativeCurrency={''}
        accountNetwork={''}
        accountName={''}
        accountBalanceLabel={''}
        accountAddress={TEST_ACCOUNT_ADDRESS}
        badgeProps={{
          variant: BadgeVariant.Network,
          name: 'Ethereum',
        }}
        avatarAccountType={AvatarAccountType.Maskicon}
      />,
    );

    expect(screen.getByTestId('account-base')).toBeOnTheScreen();
    expect(screen.queryByTestId(BADGENETWORK_TEST_ID)).not.toBeOnTheScreen();
  });
});
