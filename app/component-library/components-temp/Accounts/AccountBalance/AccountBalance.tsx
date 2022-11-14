// Third party dependencies.
import React from 'react';

// External dependencies.
import Card from '../../../components/Cards/Card';
import AccountBase from '../AccountBase/AccountBase';

// Internal dependencies.
import { AccountBalanceProps } from './AccountBalance.types';
import { ACCOUNT_BALANCE_TEST_ID } from './AccountBalance.constants';
import styles from './AccountBalance.styles';

const AccountBalance = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountName,
  accountBalanceLabel,
  accountAddress,
  badgeProps,
}: AccountBalanceProps) => (
  <Card style={styles.container} testID={ACCOUNT_BALANCE_TEST_ID}>
    <AccountBase
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountNetwork={accountNetwork}
      accountName={accountName}
      accountBalanceLabel={accountBalanceLabel}
      accountAddress={accountAddress}
      badgeProps={badgeProps}
    />
  </Card>
);

export default AccountBalance;
