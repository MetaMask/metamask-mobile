import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { renderFiat } from '../../../../util/number';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import styleSheet from './AggregatedPercentage.styles';
import { useStyles } from '../../../hooks';

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
  const { styles } = useStyles(styleSheet, {});

  const currentCurrency = useSelector(selectCurrentCurrency);
  const DECIMALS_TO_SHOW = 2;

  const totalBalance = ethFiat + tokenFiat;
  const totalBalance1dAgo = ethFiat1dAgo + tokenFiat1dAgo;

  const amountChange = totalBalance - totalBalance1dAgo;

  const percentageChange =
    ((totalBalance - totalBalance1dAgo) / totalBalance1dAgo) * 100 || 0;

  let percentageTextColor = TextColor.Default;

  if (percentageChange === 0) {
    percentageTextColor = TextColor.Default;
  } else if (percentageChange > 0) {
    percentageTextColor = TextColor.Success;
  } else {
    percentageTextColor = TextColor.Error;
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
      <Text color={percentageTextColor} variant={TextVariant.BodyMDMedium}>
        {formattedValuePrice}
      </Text>
      <Text color={percentageTextColor} variant={TextVariant.BodyMDMedium}>
        {formattedPercentage}
      </Text>
    </View>
  );
};

export default AggregatedPercentage;
