import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { selectConversionRate } from '../../../../selectors/currencyRateController';
import { getCurrencySymbol } from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

// Defining the interface for props
interface StakeInputProps {
  currentCurrency: string;
  accounts: Record<string, { balance: string }>;
  selectedAddress: string;
  onCurrencySwitch: () => void;
  onNavigateToBuyOrSwaps: () => void;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    inputContainerWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    },
    inputContainer: {
      flexDirection: 'row',
    },
    inputCurrencyText: {
      fontSize: 44,
      color: colors.text.default,
      marginRight: 8,
    },
    textInput: {
      fontSize: 44,
      textAlign: 'center',
      color: colors.text.default,
    },
    actionSwitch: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      flexDirection: 'row',
      borderColor: colors.text.alternative,
      borderWidth: 1,
    },
    textSwitch: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    switchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    balanceWrapper: {
      marginVertical: 16,
    },
    balanceText: {
      fontSize: 12,
      textAlign: 'center',
      color: colors.text.default,
    },
    errorMessageWrapper: {
      marginVertical: 16,
    },
    errorBuyWrapper: {
      marginHorizontal: 24,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: colors.text.default,
      fontSize: 12,
      textAlign: 'center',
    },
    underline: {
      textDecorationLine: 'underline',
    },
  });

const StakeInput = ({
  currentCurrency = 'USD',
  accounts,
  selectedAddress,
  onCurrencySwitch,
  onNavigateToBuyOrSwaps,
}: StakeInputProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [inputValue, setInputValue] = useState<string>('');
  const [renderableInputValueConversion, setRenderableInputValueConversion] =
    useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<string>('');

  const conversionRate = useSelector(selectConversionRate);

  const handleEthBalance = () => {
    setCurrentBalance(`5 ETH`);
  };

  const onInputChange = (value: string) => {
    // Your input change handling logic here, simplified for illustration.
    setInputValue(value);
    // After validation and processing, update conversion values.
    if (conversionRate) {
      const convertedValue = (
        parseFloat(value) * Number(conversionRate)
      ).toFixed(2);
      setRenderableInputValueConversion(`${convertedValue} USD`);
    } else {
      setRenderableInputValueConversion(`${value} USD`);
    }
  };

  // Handle balance when component mounts or when selectedAddress changes
  useEffect(() => {
    handleEthBalance();
  }, [selectedAddress]);

  return (
    <View>
      <View style={styles.balanceWrapper}>
        <Text style={styles.balanceText}>{`${strings(
          'transaction.balance',
        )}: ${currentBalance}`}</Text>
      </View>
      <View style={styles.inputContainerWrapper}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputCurrencyText}>
            {`${getCurrencySymbol(currentCurrency)} `}
          </Text>
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={onInputChange}
            keyboardType={'numeric'}
            placeholder={'0'}
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.actionSwitch} onPress={onCurrencySwitch}>
        <Text style={styles.textSwitch}>{renderableInputValueConversion}</Text>
        <Icon name={IconName.SwapVertical} color={colors.primary.default} />
      </TouchableOpacity>

      {amountError && (
        <View style={styles.errorMessageWrapper}>
          <TouchableOpacity
            onPress={onNavigateToBuyOrSwaps}
            style={styles.errorBuyWrapper}
          >
            <Text style={styles.error}>{amountError}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default StakeInput;
