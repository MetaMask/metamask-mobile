/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewProps } from 'react-native';

import Text, {
  TextVariant,
} from '@component-library/components/Texts/Text';
import { useStyles } from '@components/hooks/useStyles';
import { BalanceChange } from '@components/UI/SimulationDetails/types';
import AmountPill from '@components/UI/SimulationDetails/AmountPill/AmountPill';
import AssetPill from '@components/UI/SimulationDetails/AssetPill/AssetPill';
import { IndividualFiatDisplay } from '@components/UI/SimulationDetails/FiatDisplay/FiatDisplay';
import styleSheet from './BalanceChangeRow.styles';

interface BalanceChangeRowProperties extends ViewProps {
  label?: string;
  showFiat?: boolean;
  balanceChange: BalanceChange;
}

const BalanceChangeRow: React.FC<BalanceChangeRowProperties> = ({
  label,
  balanceChange,
  showFiat,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { asset, amount, fiatAmount } = balanceChange;
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
        {showFiat && (
          <IndividualFiatDisplay
            testID="balance-change-row-fiat-display"
            fiatAmount={fiatAmount}
          />
        )}
      </View>
    </View>
  );
};

export default BalanceChangeRow;
