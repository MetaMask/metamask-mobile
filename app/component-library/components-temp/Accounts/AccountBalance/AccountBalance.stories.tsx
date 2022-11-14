// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, number } from '@storybook/addon-knobs';

// External dependencies.
import { SAMPLE_BADGE_PROPS } from '../../../components/Badges/Badge/Badge.constants';
import {
  BadgeProps,
  BadgeVariants,
} from '../../../components/Badges/Badge/Badge.types';

// Internal dependencies.
import {
  ACCOUNT_BALANCE,
  ACCOUNT_BALANCE_LABEL,
  ACCOUNT_NATIVE_CURRENCY,
  ACCOUNT_NETWORK,
  ACCOUNT_NAME,
  TEST_ACCOUNT_ADDRESS,
  UNKNOWN_ACCOUNT_NETWORK,
} from './AccountBalance.constants';

// Internal dependencies.
import AccountBalance from './AccountBalance';

const accountNetwork = text('accountNetwork', ACCOUNT_NETWORK);
const unknownAccountNetwork = text(
  'unknownAccountNetwork',
  UNKNOWN_ACCOUNT_NETWORK,
);
const accountName = text('accountName', ACCOUNT_NAME);
const accountBalance = number('accountBalance', ACCOUNT_BALANCE);
const accountNativeCurrency = text(
  'accountNativeCurrency',
  ACCOUNT_NATIVE_CURRENCY,
);
const accountBalanceLabel = text('accountBalanceLabel', ACCOUNT_BALANCE_LABEL);

const unknownBadgeProps: BadgeProps = {
  variant: BadgeVariants.Network,
  networkProps: {},
};

storiesOf('Components Temp / AccountBalance', module)
  .add('Default', () => (
    <AccountBalance
      accountNetwork={accountNetwork}
      accountName={accountName}
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountBalanceLabel={accountBalanceLabel}
      accountAddress={TEST_ACCOUNT_ADDRESS}
      badgeProps={SAMPLE_BADGE_PROPS}
    />
  ))
  .add('Unknown Network', () => (
    <AccountBalance
      accountNetwork={unknownAccountNetwork}
      accountName={accountName}
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountBalanceLabel={accountBalanceLabel}
      accountAddress={TEST_ACCOUNT_ADDRESS}
      badgeProps={unknownBadgeProps}
    />
  ));
