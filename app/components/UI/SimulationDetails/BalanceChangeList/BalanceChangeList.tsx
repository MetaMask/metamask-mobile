/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { View, ViewProps } from 'react-native';

import { useStyles } from '../../../hooks/useStyles';
import { sortBalanceChanges } from '../sortBalanceChanges';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { BalanceChange } from '../types';
import { TotalFiatDisplay } from '../FiatDisplay/FiatDisplay';
import styleSheet from './BalanceChangeList.styles';

interface BalanceChangeListProperties extends ViewProps {
  heading: string;
  balanceChanges: BalanceChange[];
}

const BalanceChangeList: React.FC<BalanceChangeListProperties> = ({
  heading,
  balanceChanges,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const sortedBalanceChanges = useMemo(
    () => sortBalanceChanges(balanceChanges),
    [balanceChanges],
  );

  const fiatAmounts = useMemo(
    () => sortedBalanceChanges.map((bc) => bc.fiatAmount),
    [sortedBalanceChanges],
  );

  const hasIncomingTokens = useMemo(
    () =>
      balanceChanges.some((balanceChange) => balanceChange.amount.isPositive()),
    [balanceChanges],
  );

  if (sortedBalanceChanges.length === 0) {
    return null;
  }

  const showFiatTotal = sortedBalanceChanges.length > 1;

  return (
    <View
      style={styles.container}
      testID="simulation-details-balance-change-list-container"
    >
      {sortedBalanceChanges.map((balanceChange, index) => (
        <BalanceChangeRow
          key={index}
          label={index === 0 ? heading : undefined}
          balanceChange={balanceChange}
          showFiat={!showFiatTotal}
          hasIncomingTokens={hasIncomingTokens}
        />
      ))}
      {showFiatTotal && (
        <View
          testID="simulation-details-balance-change-list-total-fiat-display-container"
          style={styles.totalFiatDisplayContainer}
        >
          <TotalFiatDisplay fiatAmounts={fiatAmounts} />
        </View>
      )}
    </View>
  );
};

export default BalanceChangeList;
