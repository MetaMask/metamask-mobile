import React from 'react';
import { TextInput, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount-2.styles';
import { getCurrencySymbol } from '../../../../../util/number';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';

export const MAX_LENGTH = 28;

export interface EditAmountProps {
  amountFiat: string;
  currency?: string;
  hasAlert?: boolean;
  isLoading?: boolean;
  onChange?: (amount: string) => void;
  onPress?: () => void;
}

export function EditAmount({
  amountFiat,
  currency: currencyProp,
  hasAlert = false,
  isLoading,
  onChange,
  onPress,
}: Readonly<EditAmountProps>) {
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currency = currencyProp ?? selectedCurrency;
  const fiatSymbol = getCurrencySymbol(currency);
  const amountLength = amountFiat.length;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
  });

  if (isLoading) {
    return <EditAmountSkeleton />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        defaultValue={fiatSymbol}
        editable={false}
      />
      <TextInput
        testID="edit-amount-input"
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
}

export function EditAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {
    amountLength: 1,
    hasAlert: false,
  });

  return (
    <View style={styles.container}>
      <Skeleton height={70} width={80} />
    </View>
  );
}
