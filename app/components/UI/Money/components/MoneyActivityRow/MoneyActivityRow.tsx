import React from 'react';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import MoneyActivityItemView from '../MoneyActivityItem/MoneyActivityItem';
import CardActivityItem from '../CardActivityItem/CardActivityItem';
import CashbackActivityItem from '../CashbackActivityItem/CashbackActivityItem';
import { TransactionMeta } from '@metamask/transaction-controller';

export interface MoneyActivityRowProps {
  item: MoneyActivityItem;
  moneyAddress: string | undefined;
  /** Press handler for on-chain rows; card rows are never pressable. */
  onPress?: (transaction: TransactionMeta) => void;
  showNetworkBadge?: boolean;
}

const MoneyActivityRow = ({
  item,
  moneyAddress,
  onPress,
  showNetworkBadge,
}: MoneyActivityRowProps) => {
  if (item.kind === 'card') {
    return (
      <CardActivityItem card={item.tx} showNetworkBadge={showNetworkBadge} />
    );
  }
  if (item.kind === 'cashback') {
    return (
      <CashbackActivityItem
        cashback={item.tx}
        showNetworkBadge={showNetworkBadge}
      />
    );
  }
  return (
    <MoneyActivityItemView
      tx={item.tx}
      moneyAddress={moneyAddress}
      onPress={onPress}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default MoneyActivityRow;
