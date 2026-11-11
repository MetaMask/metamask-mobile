import React, { useCallback, useMemo } from 'react';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import ActivityRowView from '../../../Money/components/MoneyActivityItem/ActivityRowView';
import { cardTransactionDisplayInfo } from '../../utils/cardTransactionDisplayInfo';

export interface CardTransactionRowProps {
  transaction: CardTransaction;
  onPress?: (tx: CardTransaction) => void;
  privacyMode?: boolean;
}

const CardTransactionRow = ({
  transaction,
  onPress,
  privacyMode,
}: CardTransactionRowProps) => {
  const display = useMemo(
    () => cardTransactionDisplayInfo(transaction),
    [transaction],
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
