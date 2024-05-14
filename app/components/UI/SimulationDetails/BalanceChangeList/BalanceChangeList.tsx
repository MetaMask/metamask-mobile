/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { View, ViewProps } from 'react-native';

import { useStyles } from '../../../hooks/useStyles';
import styleSheet from './BalanceChangeList.styles';
import { sortBalanceChanges } from '../sortBalanceChanges';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { BalanceChange } from '../types';

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

  if (sortedBalanceChanges.length === 0) {
    return null;
  }

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
        />
      ))}
    </View>
  );
};

export default BalanceChangeList;
