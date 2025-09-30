import React from 'react';
import { TextInput, View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './custom-amount.styles';
import { getCurrencySymbol } from '../../../../../../util/number';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { MAX_LENGTH } from '../../../hooks/transactions/useTransactionCustomAmount';

export interface CustomAmountProps {
  amountFiat: string;
  currency?: string;
  hasAlert?: boolean;
  isLoading?: boolean;
  onChange?: (amount: string) => void;
  onPress?: () => void;
}

export const CustomAmount: React.FC<CustomAmountProps> = React.memo((props) => {
  const {
    amountFiat,
    currency: currencyProp,
    hasAlert = false,
    isLoading,
    onChange,
    onPress,
  } = props;

  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currency = currencyProp ?? selectedCurrency;
  const fiatSymbol = getCurrencySymbol(currency);
  const amountLength = amountFiat.length;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
  });

  if (isLoading) {
    return <CustomAmountSkeleton />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        testID="custom-amount-symbol"
        style={styles.input}
        defaultValue={fiatSymbol}
        editable={false}
      />
      <TextInput
        testID="custom-amount-input"
        style={styles.input}
        defaultValue={amountFiat}
        showSoftInputOnFocus={false}
        onPress={onPress}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={MAX_LENGTH}
      />
    </View>
  );
});

export function CustomAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {
    amountLength: 1,
    hasAlert: false,
  });

  return (
    <View style={styles.container} testID="custom-amount-skeleton">
      <Skeleton height={70} width={80} />
    </View>
  );
}
