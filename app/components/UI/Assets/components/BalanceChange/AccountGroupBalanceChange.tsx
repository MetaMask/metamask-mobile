import React, { useMemo } from 'react';
import { View } from 'react-native';
import SensitiveText from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import styleSheet from './AccountGroupBalanceChange.styles';
import { useStyles } from '../../../../../component-library/hooks';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './constants';
import {
  getFormattedAmountChange,
  getFormattedPercentageChange,
  getPercentageTextColor,
} from '../../../../../component-library/components-temp/Price/AggregatedPercentage/utils';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';

interface AccountGroupBalanceChangeProps {
  amountChangeInUserCurrency: number;
  percentChange: number;
  userCurrency: string;
}

const AccountGroupBalanceChange = ({
  amountChangeInUserCurrency,
  percentChange,
  userCurrency,
}: AccountGroupBalanceChangeProps) => {
  const { styles } = useStyles(styleSheet, {});
  const amountText = useMemo(
    () => getFormattedAmountChange(amountChangeInUserCurrency, userCurrency),
    [amountChangeInUserCurrency, userCurrency],
  );

  const privacyMode = useSelector(selectPrivacyMode);
  const percentText = useMemo(
    () => getFormattedPercentageChange(percentChange, 'en-US'),
    [percentChange],
  );
  const percentageTextColor = getPercentageTextColor(
    Boolean(privacyMode),
    percentChange,
  );

  return (
    <View style={styles.wrapper}>
      <SensitiveText
        isHidden={Boolean(privacyMode)}
        length="10"
        color={percentageTextColor}
        variant={TextVariant.BodyMDMedium}
        testID={FORMATTED_VALUE_PRICE_TEST_ID}
      >
        {amountText}
      </SensitiveText>
      <SensitiveText
        isHidden={Boolean(privacyMode)}
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

export default AccountGroupBalanceChange;
