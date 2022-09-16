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
} from './AccountBalance.constants';
import {
  AvatarProps,
  AvatarVariants,
} from '../../../components/Avatars/Avatar.types';
import { AvatarAccountType } from '../../../components/Avatars/AvatarAccount';

// Internal dependencies.
import AccountBalance from './AccountBalance';

storiesOf('Component Library / Account', module).add('With balance', () => {
  let avatarProps: AvatarProps;
  avatarProps = {
    variant: AvatarVariants.Account,
    accountAddress: TEST_ACCOUNT_ADDRESS,
    type: AvatarAccountType.JazzIcon,
  };
  const accountNetwork = text('accountNetwork', ACCOUNT_NETWORK);
  const accountType = text('accountType', ACCOUNT_TYPE);
  const accountBalance = number('accountBalance', ACCOUNT_BALANCE);
  const accountNativeCurrency = text(
    'accountNativeCurrency',
    ACCOUNT_NATIVE_CURRENCY,
  );
  const accountBalanceLabel = text(
    'accountBalanceLabel',
    ACCOUNT_BALANCE_LABEL,
  );

  return (
    <AccountBalance
      accountNetwork={accountNetwork}
      accountType={accountType}
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountBalanceLabel={accountBalanceLabel}
      avatarProps={avatarProps}
    />
  );
});
