import React from 'react';
import { Pressable } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './custom-amount.styles';
import { getCurrencySymbol } from '../../../../../../util/number';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { AnimatedAmountDisplay } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';
import { Text, TextColor } from '@metamask/design-system-react-native';
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

  if (showLoader) {
    // Pressable so the user can always fall back to entering an amount, even
    // when the prefill or quote being awaited never resolves.
    return <CustomAmountSkeleton onPress={disabled ? undefined : onPress} />;
  }

  const amountColor = hasAlert
    ? TextColor.ErrorDefault
    : disabled
      ? TextColor.TextMuted
      : TextColor.TextDefault;
  const amountStyle = styles.input;

  return (
    <AnimatedAmountDisplay
      accessibilityLabel={`${fiatSymbol}${typedText}${assistiveText}`}
      amountAccessible
      amountTestID="custom-amount-input-value"
      animated
      color={amountColor}
      containerStyle={styles.container}
      cursor={
        cursorVisible
          ? {
              animated: true,
              style: styles.cursor,
              testID: 'custom-amount-cursor',
            }
          : false
      }
      onPress={disabled ? undefined : onPress}
      prefix={
        <Text testID="custom-amount-symbol" style={amountStyle}>
          {fiatSymbol}
        </Text>
      }
      style={amountStyle}
      suffix={
        assistiveText ? (
          <Text
            testID="custom-amount-assistive"
            onPress={disabled ? undefined : onPress}
            style={[amountStyle, styles.assistive]}
          >
            {assistiveText}
          </Text>
        ) : undefined
      }
      testID="custom-amount-input"
      value={typedText}
    />
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
