import React from 'react';
import { fontStyles } from '../../../../styles/common';
import Text from '../../../../component-library/components/Texts/Text';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { renderFiat } from '../../../../util/number';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    balanceZeroStyle: {
      color: colors.text.default,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
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

const isValidAmount = (amount: number | null | undefined): boolean =>
  amount !== null && amount !== undefined && !Number.isNaN(amount);

const AggregatedPercentage = ({
  ethFiat,
  tokenFiat,
  tokenFiat1dAgo,
  ethFiat1dAgo,
}: {
  ethFiat: number;
  tokenFiat: number;
  tokenFiat1dAgo: number;
  ethFiat1dAgo: number;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const DECIMALS_TO_SHOW = 2;

  const totalBalance = ethFiat + tokenFiat;
  const totalBalance1dAgo = ethFiat1dAgo + tokenFiat1dAgo;

  const amountChange = totalBalance - totalBalance1dAgo;

  const percentageChange =
    ((totalBalance - totalBalance1dAgo) / totalBalance1dAgo) * 100 || 0;

  let percentageStyle = styles.balanceZeroStyle;

  if (percentageChange === 0) {
    percentageStyle = styles.balanceZeroStyle;
  } else if (percentageChange > 0) {
    percentageStyle = styles.balancePositiveStyle;
  } else {
    percentageStyle = styles.balanceNegativeStyle;
  }

  const formattedPercentage = isValidAmount(percentageChange)
    ? `(${(percentageChange as number) >= 0 ? '+' : ''}${(
        percentageChange as number
      ).toFixed(2)}%)`
    : '';

  const formattedValuePrice = isValidAmount(amountChange)
    ? `${(amountChange as number) >= 0 ? '+' : ''}${renderFiat(
        amountChange,
        currentCurrency,
        DECIMALS_TO_SHOW,
      )} `
    : '';

  return (
    <View style={styles.wrapper}>
      <Text style={percentageStyle}>{formattedValuePrice}</Text>
      <Text style={percentageStyle}>{formattedPercentage}</Text>
    </View>
  );
};

export default AggregatedPercentage;
