import React from 'react';
import { fontStyles } from '../../../../styles/common';
import Text from '../../../../component-library/components/Texts/Text';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    balancePositiveStyle: {
      color: colors.success.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    balanceNegativeStyle: {
      color: colors.error.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
  });

const PercentageChange = ({ value }: { value: number | null | undefined }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const percentageStyle =
    value && value >= 0
      ? styles.balancePositiveStyle
      : styles.balanceNegativeStyle;

  const isValidAmount = (amount: number | null | undefined): boolean =>
    amount !== null && amount !== undefined && !Number.isNaN(amount);

  const formattedValue = isValidAmount(value)
    ? `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(2)}%`
    : '';

  return (
    <View>
      <Text style={percentageStyle}>{formattedValue}</Text>
    </View>
  );
};

export default PercentageChange;
