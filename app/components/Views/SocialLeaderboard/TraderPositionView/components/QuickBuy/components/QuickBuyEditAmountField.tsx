import {
  Box,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef } from 'react';
import { Pressable, type TextInput } from 'react-native';
import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import { strings } from '../../../../../../../../locales/i18n';
import {
  getBuyAmountMaxValid,
  type QuickBuyEditFieldError,
  type QuickBuyEditValidationContext,
} from '../utils/validateQuickBuyEditAmounts';

const ERROR_AMOUNT_CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

interface QuickBuyEditAmountFieldProps {
  value: string;
  kind: 'buy' | 'sell';
  currency?: string;
  isError: boolean;
  isFocused?: boolean;
  testID?: string;
  onPress: () => void;
}

const QuickBuyEditAmountField: React.FC<QuickBuyEditAmountFieldProps> = ({
  value,
  kind,
  currency,
  isError,
  isFocused = false,
  testID,
  onPress,
}) => {
  const inputRef = useRef<TextInput>(null);
  const displayValue = value || '0';
  const currencySymbol =
    kind === 'buy' && currency ? getCurrencySymbol(currency) : null;
  const caretPosition = displayValue.length;

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    // Keep the caret at the end while focused so keypad digits append.
    inputRef.current?.focus();
    inputRef.current?.setNativeProps({
      selection: { start: caretPosition, end: caretPosition },
    });
  }, [isFocused, caretPosition]);

  const handlePress = () => {
    onPress();
    inputRef.current?.focus();
    inputRef.current?.setNativeProps({
      selection: { start: caretPosition, end: caretPosition },
    });
  };

  return (
    <Box twClassName="min-w-0 flex-1">
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        testID={testID}
      >
        <TextField
          value={displayValue}
          isReadOnly
          isError={isError}
          pointerEvents="none"
          inputRef={inputRef}
          startAccessory={
            currencySymbol ? (
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {currencySymbol}
              </Text>
            ) : undefined
          }
          endAccessory={
            kind === 'sell' ? (
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                %
              </Text>
            ) : undefined
          }
          twClassName={
            isFocused && !isError ? 'w-full border-default' : 'w-full'
          }
          inputProps={{
            showSoftInputOnFocus: false,
            caretHidden: !isFocused,
            selection: isFocused
              ? { start: caretPosition, end: caretPosition }
              : undefined,
          }}
        />
      </Pressable>
    </Box>
  );
};

export function getQuickBuyEditFieldErrorMessage(
  error: QuickBuyEditFieldError | null,
  validationContext?: QuickBuyEditValidationContext,
): string | null {
  if (!error) {
    return null;
  }

  const currency = validationContext?.currency ?? 'USD';

  switch (error) {
    case 'buy_above_zero':
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_buy_above_zero',
        {
          min: formatCurrency(0, currency, ERROR_AMOUNT_CURRENCY_OPTIONS),
        },
      );
    case 'buy_below_max': {
      const maxValid = validationContext
        ? getBuyAmountMaxValid(
            validationContext.currency,
            validationContext.usdToCurrentCurrencyRate,
          )
        : 9_999_999;
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_buy_below_max',
        {
          max: formatCurrency(
            maxValid,
            currency,
            ERROR_AMOUNT_CURRENCY_OPTIONS,
          ),
        },
      );
    }
    case 'sell_above_zero':
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_sell_above_zero',
      );
    case 'sell_below_max':
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_sell_below_max',
      );
    default:
      return null;
  }
}

export default QuickBuyEditAmountField;
