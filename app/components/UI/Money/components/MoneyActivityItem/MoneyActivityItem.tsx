import React from 'react';
import { useSelector } from 'react-redux';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import ActivityRowView from './ActivityRowView';

export interface MoneyActivityItemProps {
  tx: TransactionMeta;
  moneyAddress: string | undefined;
  onPress?: (transaction: TransactionMeta) => void;
  /** When true, shows the chain network badge on the icon avatar. Defaults to false. */
  showNetworkBadge?: boolean;
}

const MoneyActivityItem = ({
  tx,
  moneyAddress,
  onPress,
  showNetworkBadge = false,
}: MoneyActivityItemProps) => {
  const display = useMoneyTransactionDisplayInfo(tx, moneyAddress);
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

  return (
    <ActivityRowView
      id={tx.id}
      display={display}
      chainId={tx.chainId}
      onPress={activityDetailsEnabled ? () => onPress?.(tx) : undefined}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default MoneyActivityItem;
