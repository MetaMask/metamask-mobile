import React from 'react';
import { Animated, Pressable, View } from 'react-native';
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
import { parseAmountWithAssistiveDecimals } from './custom-amount.utils';

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

  const isEditing = showCursor && !disabled;
  const { typedText, assistiveText } = parseAmountWithAssistiveDecimals(
    amountFiat,
    isEditing,
  );

  const amountLength = typedText.length + assistiveText.length;

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
    // Pressable so the user can always fall back to entering an amount, even
    // when the prefill or quote being awaited never resolves.
    return <CustomAmountSkeleton onPress={disabled ? undefined : onPress} />;
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
        {typedText}
      </Text>
      {cursorVisible && (
        <Animated.View
          testID="custom-amount-cursor"
          style={[styles.cursor, { opacity: cursorOpacity }]}
        />
      )}
      {Boolean(assistiveText) && (
        <Text
          testID="custom-amount-assistive"
          style={[styles.input, styles.assistive]}
          onPress={disabled ? undefined : onPress}
        >
          {assistiveText}
        </Text>
      )}
    </View>
  );
});

export function CustomAmountSkeleton({
  onPress,
}: { onPress?: () => void } = {}) {
  const { styles } = useStyles(styleSheet, {
    amountLength: 1,
    hasAlert: false,
    disabled: false,
  });

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={styles.container}
      testID="custom-amount-skeleton"
    >
      <Skeleton height={70} width={80} />
    </Pressable>
  );
}
