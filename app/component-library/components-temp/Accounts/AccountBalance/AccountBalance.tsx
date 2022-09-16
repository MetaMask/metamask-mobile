import React from 'react';
import { AccountBalanceProps } from './AccountBalance.types';
import CellDisplayContainer from '../../../components/Cells/Cell/foundation/CellDisplayContainer';
import AccountBase from '../AccountBase/AccountBase';

const AvatarBalance = ({
  accountBalance,
  accountNativeCurrency,
  accountNetwork,
  accountType,
  accountBalanceLabel,
  avatarProps,
}: AccountBalanceProps) => (
  <CellDisplayContainer
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 10,
    }}
  >
    <AccountBase
      accountBalance={accountBalance}
      accountNativeCurrency={accountNativeCurrency}
      accountNetwork={accountNetwork}
      accountType={accountType}
      accountBalanceLabel={accountBalanceLabel}
      avatarProps={avatarProps}
    />
  </CellDisplayContainer>
);

export default AvatarBalance;
