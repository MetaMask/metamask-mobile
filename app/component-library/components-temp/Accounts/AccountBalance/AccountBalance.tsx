import React from 'react';
import { AccountBalanceProps } from './AccountBalance.types';
import CellDisplayContainer from '../../../components/Cells/Cell/foundation/CellDisplayContainer';
import AccountBase from '../AccountBase/AccountBase';
import { ACCOUNT_BALANCE_TEST_ID } from './AccountBalance.constants';
import styles from './AccountBalance.styles';

const AvatarBalance = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountType,
  accountBalanceLabel,
  avatarProps,
  badgeProps,
}: AccountBalanceProps) => (
  <CellDisplayContainer
    style={styles.container}
    testID={ACCOUNT_BALANCE_TEST_ID}
  >
    <AccountBase
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountNetwork={accountNetwork}
      accountType={accountType}
      accountBalanceLabel={accountBalanceLabel}
      avatarProps={avatarProps}
      badgeProps={badgeProps}
    />
  </CellDisplayContainer>
);

export default AvatarBalance;
