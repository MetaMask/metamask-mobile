import React from 'react';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import MoneyActivityItemView from '../MoneyActivityItem/MoneyActivityItem';
import CardActivityItem from '../CardActivityItem/CardActivityItem';

export interface MoneyActivityRowProps {
  item: MoneyActivityItem;
  moneyAddress: string | undefined;
  /** Press handler for on-chain rows; card rows are never pressable. */
  onPress?: (transactionId: string) => void;
  showNetworkBadge?: boolean;
}

/**
 * Renders one {@link MoneyActivityItem}, dispatching on its source `kind`.
 * Keeps the union's branch in one place so the list and full-activity views
 * stay agnostic to where a row came from.
 */
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
