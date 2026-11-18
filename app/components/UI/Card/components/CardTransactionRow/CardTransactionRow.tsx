import React, { useCallback, useMemo } from 'react';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import ActivityRowView from '../../../Money/components/MoneyActivityItem/ActivityRowView';
import {
  cardTransactionDisplayInfo,
  cardTransactionListDisplayInfo,
} from '../../utils/cardTransactionDisplayInfo';

export interface CardTransactionRowProps {
  transaction: CardTransaction;
  onPress?: (tx: CardTransaction) => void;
  privacyMode?: boolean;
  /**
   * Money activity list: show only the USD billing amount. The Card history
   * list keeps the merchant-currency line.
   */
  usdBillingOnly?: boolean;
}

const CardTransactionRow = ({
  transaction,
  onPress,
  privacyMode,
  usdBillingOnly = false,
}: CardTransactionRowProps) => {
  const display = useMemo(
    () =>
      usdBillingOnly
        ? cardTransactionListDisplayInfo(transaction)
        : cardTransactionDisplayInfo(transaction),
    [transaction, usdBillingOnly],
  );

  const handlePress = useCallback(() => {
    onPress?.(transaction);
  }, [onPress, transaction]);

  return (
    <ActivityRowView
      id={transaction.id}
      display={display}
      privacyMode={privacyMode}
      onPress={onPress ? handlePress : undefined}
    />
  );
};

export default React.memo(CardTransactionRow);
