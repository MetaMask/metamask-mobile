import React from 'react';
import Text from '../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import styleSheet from './PercentageChange.styles';
import { useStyles } from '../../../hooks';

const PercentageChange = ({ value }: { value: number | null | undefined }) => {
  const { styles } = useStyles(styleSheet, {});

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
