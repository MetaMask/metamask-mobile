import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import SensitiveText from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as LegacyTextVariant } from '../../../../../component-library/components/Texts/Text';
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
  percentChange?: number;
  userCurrency: string;
  label?: string;
}

const AccountGroupBalanceChange = ({
  amountChangeInUserCurrency,
  percentChange,
  userCurrency,
  label,
}: AccountGroupBalanceChangeProps) => {
  const { styles } = useStyles(styleSheet, {});
  const amountText = useMemo(
    () => getFormattedAmountChange(amountChangeInUserCurrency, userCurrency),
    [amountChangeInUserCurrency, userCurrency],
  );

  const privacyMode = useSelector(selectPrivacyMode);
  const percentText = useMemo(
    () =>
      percentChange === undefined
        ? undefined
        : getFormattedPercentageChange(percentChange, 'en-US'),
    [percentChange],
  );
  const percentageTextColor = getPercentageTextColor(
    Boolean(privacyMode),
    percentChange ?? 0,
  );

  return (
    <View style={styles.wrapper}>
      <SensitiveText
        isHidden={Boolean(privacyMode)}
        length="10"
        color={percentageTextColor}
        variant={LegacyTextVariant.BodyMDMedium}
        testID={FORMATTED_VALUE_PRICE_TEST_ID}
      >
        {amountText}
      </SensitiveText>
      {percentText !== undefined ? (
        <SensitiveText
          isHidden={Boolean(privacyMode)}
          length="10"
          color={percentageTextColor}
          variant={LegacyTextVariant.BodyMDMedium}
          testID={FORMATTED_PERCENTAGE_TEST_ID}
        >
          {percentText}
        </SensitiveText>
      ) : null}
      {label ? (
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

export default AccountGroupBalanceChange;
