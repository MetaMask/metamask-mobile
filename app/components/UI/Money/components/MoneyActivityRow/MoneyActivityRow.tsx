import React from 'react';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import MoneyActivityItemView from '../MoneyActivityItem/MoneyActivityItem';
import AccountsApiActivityItem from '../AccountsApiActivityItem/AccountsApiActivityItem';
import { TransactionMeta } from '@metamask/transaction-controller';

export interface MoneyActivityRowProps {
  item: MoneyActivityItem;
  moneyAddress: string | undefined;
  /** Press handler for on-chain rows; Accounts-API rows handle their own. */
  onPress?: (transaction: TransactionMeta) => void;
  showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
}

const MoneyActivityRow = ({
  item,
  moneyAddress,
  onPress,
  showNetworkBadge,
  privacyMode,
}: MoneyActivityRowProps) => {
  if (item.kind === 'accountsApi') {
    return (
      <AccountsApiActivityItem
        activity={item.tx}
        showNetworkBadge={showNetworkBadge}
        privacyMode={privacyMode}
      />
    );
  }
  return (
    <MoneyActivityItemView
      tx={item.tx}
      moneyAddress={moneyAddress}
      onPress={onPress}
      showNetworkBadge={showNetworkBadge}
      privacyMode={privacyMode}
    />
  );
};

export default React.memo(MoneyActivityRow);
