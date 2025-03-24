import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import CurrencyToggle from '../../Stake/components/CurrencySwitch';
import type { Colors } from '../../../../util/theme/models';
import { useTheme } from '../../../../util/theme';

interface InputDisplayProps {
  isOverMaximum: {
    isOverMaximumEth: boolean;
    isOverMaximumToken: boolean;
  };
  balanceText: string;
  balanceValue: string;
  isNonZeroAmount: boolean;
  isFiat: boolean;
  ticker: string;
  amountToken: string;
  amountFiatNumber: string;
  currentCurrency: string;
  handleCurrencySwitch: () => void;
  currencyToggleValue: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    inputContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    amountRow: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
  });

const InputDisplay = ({
  isOverMaximum,
  balanceText,
  balanceValue,
  isFiat,
  ticker,
  amountToken,
  amountFiatNumber,
  currentCurrency,
  handleCurrencySwitch,
  currencyToggleValue,
}: InputDisplayProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const getBalanceText = () => {
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', { ticker });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }
    return `${balanceText}: ${balanceValue}`;
  };

  return (
    <View style={styles.inputContainer}>
      <View>
        <Text
          variant={TextVariant.BodySM}
          color={
            isOverMaximum.isOverMaximumToken || isOverMaximum.isOverMaximumEth
              ? TextColor.Error
              : undefined
          }
        >
          {getBalanceText()}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Text color={TextColor.Default} variant={TextVariant.DisplayMD}>
          {isFiat ? amountFiatNumber : amountToken}
        </Text>
        <Text color={TextColor.Muted} variant={TextVariant.DisplayMD}>
          {isFiat ? currentCurrency.toUpperCase() : ticker}
        </Text>
      </View>
      <View>
        <CurrencyToggle
          onPress={handleCurrencySwitch}
          value={currencyToggleValue}
        />
      </View>
    </View>
  );
};

export default InputDisplay;
