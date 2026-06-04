import React from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import ActivityRowView from './ActivityRowView';

export interface MoneyActivityItemProps {
  tx: TransactionMeta;
  moneyAddress: string | undefined;
  onPress?: (transactionId: string) => void;
  /** When true, shows the chain network badge on the icon avatar. Defaults to false. */
  showNetworkBadge?: boolean;
}

/**
 * An on-chain Money activity row, backed by a {@link TransactionMeta}. Card rows
 * use {@link CardActivityItem} instead; {@link MoneyActivityRow} dispatches
 * between the two on `MoneyActivityItem.kind`.
 */
const MoneyActivityItem = ({
  tx,
  moneyAddress,
  onPress,
  showNetworkBadge = false,
}: MoneyActivityItemProps) => {
  const display = useMoneyTransactionDisplayInfo(tx, moneyAddress);

  return (
    <ActivityRowView
      id={tx.id}
      display={display}
      isFailed={tx.status === TransactionStatus.failed}
      chainId={tx.chainId}
      onPress={onPress}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default MoneyActivityItem;
