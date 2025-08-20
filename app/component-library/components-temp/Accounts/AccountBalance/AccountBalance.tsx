import React from 'react';

import Card from '../../../components/Cards/Card';
import AccountBase from '../AccountBase/AccountBase';
import { ACCOUNT_BALANCE_TEST_ID } from './AccountBalance.constants';
import styles from './AccountBalance.styles';
import { AccountBalanceProps } from './AccountBalance.types';

const AccountBalance = ({
  accountBalance,
  accountTokenBalance,
  accountNativeCurrency,
  accountNetwork,
  accountName,
  accountTypeLabel,
  accountBalanceLabel,
  accountAddress,
  badgeProps,
  avatarStyle,
}: AccountBalanceProps) => (
  <Card style={styles.container} testID={ACCOUNT_BALANCE_TEST_ID}>
    <AccountBase
      accountBalance={accountBalance}
      accountTokenBalance={accountTokenBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountNetwork={accountNetwork}
      accountName={accountName}
      accountTypeLabel={accountTypeLabel}
      accountBalanceLabel={accountBalanceLabel}
      accountAddress={accountAddress}
      badgeProps={badgeProps}
      avatarStyle={avatarStyle}
    />
  </Card>
);

export default AccountBalance;
