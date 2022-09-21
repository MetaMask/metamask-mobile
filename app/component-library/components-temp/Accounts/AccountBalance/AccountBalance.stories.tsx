// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, number } from '@storybook/addon-knobs';
import {
  ACCOUNT_BALANCE,
  ACCOUNT_BALANCE_LABEL,
  ACCOUNT_NATIVE_CURRENCY,
  ACCOUNT_NETWORK,
  ACCOUNT_TYPE,
  TEST_ACCOUNT_ADDRESS,
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
  UNKNOWN_ACCOUNT_NETWORK,
} from './AccountBalance.constants';
import {
  AvatarProps,
  AvatarVariants,
} from '../../../components/Avatars/Avatar.types';
import {
  BadgeProps,
  BadgeVariants,
} from '../../../components/Badges/Badge/Badge.types';
import { AvatarAccountType } from '../../../components/Avatars/AvatarAccount';

// Internal dependencies.
import AccountBalance from './AccountBalance';

const avatarProps: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};
const accountNetwork = text('accountNetwork', ACCOUNT_NETWORK);
const unknownAccountNetwork = text(
  'unknownAccountNetwork',
  UNKNOWN_ACCOUNT_NETWORK,
);
const accountType = text('accountType', ACCOUNT_TYPE);
const accountBalance = number('accountBalance', ACCOUNT_BALANCE);
const accountNativeCurrency = text(
  'accountNativeCurrency',
  ACCOUNT_NATIVE_CURRENCY,
);
const accountBalanceLabel = text('accountBalanceLabel', ACCOUNT_BALANCE_LABEL);

const badgeProps: BadgeProps = {
  variant: BadgeVariants.Network,
  name: TEST_NETWORK_NAME,
  imageSource: TEST_REMOTE_IMAGE_SOURCE,
};

const unknownBadgeProps = {
  variant: BadgeVariants.Network,
};

storiesOf('Component Library / AccountBalance', module)
  .add('Default', () => (
    <AccountBalance
      accountNetwork={accountNetwork}
      accountType={accountType}
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountBalanceLabel={accountBalanceLabel}
      avatarProps={avatarProps}
      badgeProps={badgeProps}
    />
  ))
  .add('Unknown Network', () => (
    <AccountBalance
      accountNetwork={unknownAccountNetwork}
      accountType={accountType}
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountBalanceLabel={accountBalanceLabel}
      avatarProps={avatarProps}
      badgeProps={unknownBadgeProps}
    />
  ));
