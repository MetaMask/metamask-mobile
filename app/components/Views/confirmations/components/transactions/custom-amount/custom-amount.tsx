import React from 'react';
import { Animated, View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './custom-amount.styles';
import { getCurrencySymbol } from '../../../../../../util/number';
import { formatAmountWithLocaleSeparators } from '../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useBlinkingCursor } from '../../../../../UI/Ramp/hooks/useBlinkingCursor';
import { Text } from '@metamask/design-system-react-native';

export interface CustomAmountProps {
  amountFiat: string;
  currency?: string;
  disabled?: boolean;
  hasAlert?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  showCursor?: boolean;
}

export const CustomAmount: React.FC<CustomAmountProps> = React.memo((props) => {
  const {
    amountFiat,
    currency: currencyProp,
    disabled: disabledProp = false,
    hasAlert = false,
    isLoading,
    onPress,
    showCursor = true,
  } = props;

  const { isHeadlessBuyInProgress } = useConfirmationContext();
  const disabled = disabledProp || isHeadlessBuyInProgress;
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currency = currencyProp ?? selectedCurrency;
  const fiatSymbol = getCurrencySymbol(currency);

  const formattedAmount = formatAmountWithLocaleSeparators(
    roundFiatForDisplay(amountFiat),
  );

  const amountLength = formattedAmount.length;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
    disabled,
  });

  // The input always shows the full amount being paid (the balance on Max),
  // which is known synchronously and no longer changes once quotes resolve —
  // so there is no Max-specific quote-loading skeleton to show here.
  const showLoader = isLoading;
  const cursorVisible = showCursor && !disabled && !showLoader;
  const cursorOpacity = useBlinkingCursor(cursorVisible);

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
        {formattedAmount}
      </Text>
      {cursorVisible && (
        <Animated.View
          testID="custom-amount-cursor"
          style={[styles.cursor, { opacity: cursorOpacity }]}
        />
      )}
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

/**
 * Rounds the fiat amount to two decimals for display only, since `amountFiat`
 * carries full precision so that Max spends the entire balance.
 *
 * Amounts already within two decimals are returned as-is, so keypad input
 * renders exactly as typed and a mid-edit `12.` is never rewritten to `12.00`.
 */
function roundFiatForDisplay(amountFiat: string): string {
  const separatorIndex = amountFiat.search(/[.,]/u);

  if (separatorIndex === -1) {
    return amountFiat;
  }

  const decimalCount = amountFiat.length - separatorIndex - 1;

  if (decimalCount <= 2) {
    return amountFiat;
  }

  const value = new BigNumber(amountFiat.replace(',', '.'));

  return value.isFinite()
    ? value.toFixed(2, BigNumber.ROUND_HALF_UP)
    : amountFiat;
}
