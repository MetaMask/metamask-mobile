import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import CurrencyToggle from './CurrencySwitch';
import type { Colors } from '../../../../util/theme/models';
import { useTheme } from '../../../../util/theme';

interface InputDisplayProps {
  isOverMaximum: boolean;
  balanceText: string;
  balanceValue: string;
  isNonZeroAmount: boolean;
  isEth: boolean;
  amountEth: string;
  fiatAmount: string;
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
  isEth,
  amountEth,
  fiatAmount,
  currentCurrency,
  handleCurrencySwitch,
  currencyToggleValue,
}: InputDisplayProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.inputContainer}>
      <View>
        {isOverMaximum ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('stake.not_enough_eth')}
          </Text>
        ) : (
          <Text variant={TextVariant.BodySM}>
            {balanceText}
            {': '}
            {balanceValue}
          </Text>
        )}
      </View>
      <View style={styles.amountRow}>
        <Text color={TextColor.Default} variant={TextVariant.DisplayMD}>
          {isEth ? amountEth : fiatAmount}
        </Text>
        <Text color={TextColor.Muted} variant={TextVariant.DisplayMD}>
          {isEth ? 'ETH' : currentCurrency.toUpperCase()}
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
