/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewProps } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../hooks/useStyles';

import styleSheet from './BalanceChangeRow.styles';
import { BalanceChange } from '../types';
import AmountPill from '../AmountPill/AmountPill';
import AssetPill from '../AssetPill/AssetPill';

interface BalanceChangeRowProperties extends ViewProps {
  label?: string;
  balanceChange: BalanceChange;
}

const BalanceChangeRow: React.FC<BalanceChangeRowProperties> = ({
  label,
  balanceChange,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { asset, amount } = balanceChange;
  return (
    <View style={styles.container}>
      {label && (
        <Text
          testID="balance-change-row-label"
          variant={TextVariant.BodyMDMedium}
        >
          {label}
        </Text>
      )}
      <View style={styles.pillContainer}>
        <View style={styles.pills}>
          <AmountPill
            asset={asset}
            amount={amount}
            testID="balance-change-row-amount-pill"
          />
          <AssetPill asset={asset} testID="balance-change-row-asset-pill" />
        </View>
      </View>
    </View>
  );
};

export default BalanceChangeRow;
