import React from 'react';
import { View } from 'react-native';
import SensitiveText from '../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import styleSheet from './AggregatedPercentage.styles';
import { useStyles } from '../../../hooks';
import {
  FORMATTED_VALUE_PRICE_TEST_ID,
  FORMATTED_PERCENTAGE_TEST_ID,
} from './AggregatedPercentage.constants';
import { getFormattedAmountChange, getPercentageTextColor } from './utils';

interface AggregatedPortfolioChangeProps {
  privacyMode?: boolean;
  amountChangeInUserCurrency: number;
  percentChange: number;
  userCurrency: string;
}

const AggregatedPortfolioChange = ({
  privacyMode = false,
  amountChangeInUserCurrency,
  percentChange,
  userCurrency,
}: AggregatedPortfolioChangeProps) => {
  const { styles } = useStyles(styleSheet, {});
  const amountText = getFormattedAmountChange(
    amountChangeInUserCurrency,
    userCurrency,
  );
  const percPrefix = percentChange >= 0 ? '+' : '';
  const percentText = `(${percPrefix}${percentChange.toFixed(2)}%)`;
  const percentageTextColor = getPercentageTextColor(
    privacyMode,
    percentChange,
  );

  return (
    <View style={styles.wrapper}>
      <SensitiveText
        isHidden={privacyMode}
        length="10"
        color={percentageTextColor}
        variant={TextVariant.BodyMDMedium}
        testID={FORMATTED_VALUE_PRICE_TEST_ID}
      >
        {amountText}
      </SensitiveText>
      <SensitiveText
        isHidden={privacyMode}
        length="10"
        color={percentageTextColor}
        variant={TextVariant.BodyMDMedium}
        testID={FORMATTED_PERCENTAGE_TEST_ID}
      >
        {percentText}
      </SensitiveText>
    </View>
  );
};

export default AggregatedPortfolioChange;
