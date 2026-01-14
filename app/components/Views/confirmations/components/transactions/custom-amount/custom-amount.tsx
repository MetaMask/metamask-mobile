import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './custom-amount.styles';
import { getCurrencySymbol } from '../../../../../../util/number';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import Text from '../../../../../../component-library/components/Texts/Text';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
} from '../../../hooks/pay/useTransactionPayData';

export interface CustomAmountProps {
  amountFiat: string;
  currency?: string;
  disabled?: boolean;
  hasAlert?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
}

export const CustomAmount: React.FC<CustomAmountProps> = React.memo((props) => {
  const {
    amountFiat,
    currency: currencyProp,
    disabled = false,
    hasAlert = false,
    isLoading,
    onPress,
  } = props;

  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isQuotesLoading = useIsTransactionPayLoading();
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currency = currencyProp ?? selectedCurrency;
  const fiatSymbol = getCurrencySymbol(currency);
  const amountLength = amountFiat.length;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
    disabled,
  });

  const showLoader = isLoading || (isMaxAmount && isQuotesLoading);

  if (showLoader) {
    return <CustomAmountSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Text testID="custom-amount-symbol" style={styles.input}>
        {fiatSymbol}
      </Text>
      <Text
        testID="custom-amount-input"
        style={styles.input}
        onPress={disabled ? undefined : onPress}
      >
        {amountFiat}
      </Text>
    </View>
  );
});

export function CustomAmountSkeleton() {
  const { styles } = useStyles(styleSheet, {
    amountLength: 1,
    hasAlert: false,
    disabled: false,
  });

  return (
    <View style={styles.container} testID="custom-amount-skeleton">
      <Skeleton height={70} width={80} />
    </View>
  );
}
