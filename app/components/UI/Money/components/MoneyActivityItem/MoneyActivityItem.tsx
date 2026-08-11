import React, { useCallback } from 'react';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import ActivityRowView from './ActivityRowView';

export interface MoneyActivityItemProps {
  tx: TransactionMeta;
  moneyAddress: string | undefined;
  onPress?: (transaction: TransactionMeta) => void;
  /** When true, shows the chain network badge on the icon avatar. Defaults to false. */
  showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
}

const MoneyActivityItem = ({
  tx,
  moneyAddress,
  onPress,
  showNetworkBadge = false,
  privacyMode = false,
}: MoneyActivityItemProps) => {
  const display = useMoneyTransactionDisplayInfo(tx, moneyAddress);

  const handlePress = useCallback(() => onPress?.(tx), [onPress, tx]);

  return (
    <ActivityRowView
      id={tx.id}
      display={display}
      chainId={tx.chainId}
      onPress={onPress ? handlePress : undefined}
      showNetworkBadge={showNetworkBadge}
      privacyMode={privacyMode}
    />
  );
};

export default React.memo(MoneyActivityItem);
