import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable } from 'react-native';
import { getCurrencySymbol } from '../../../../../../UI/Bridge/utils/currencyUtils';
import { strings } from '../../../../../../../../locales/i18n';
import type { QuickBuyEditFieldError } from '../utils/validateQuickBuyEditAmounts';

interface QuickBuyEditAmountFieldProps {
  displayValue: string;
  isFocused: boolean;
  isError: boolean;
  errorMessage?: string | null;
  showRowError?: boolean;
  testID?: string;
  onPress: () => void;
}

const QuickBuyEditAmountField: React.FC<QuickBuyEditAmountFieldProps> = ({
  displayValue,
  isFocused,
  isError,
  errorMessage,
  showRowError = false,
  testID,
  onPress,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="min-w-0 flex-1">
      <Pressable accessibilityRole="button" onPress={onPress} testID={testID}>
        <Box
          style={tw.style(
            'items-center justify-center rounded-xl border bg-muted px-4 py-3',
            isError ? 'border-error-default' : 'border-muted',
          )}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="text-center"
            numberOfLines={1}
          >
            {displayValue}
          </Text>
        </Box>
      </Pressable>
      {showRowError && errorMessage ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="mt-1"
        >
          {errorMessage}
        </Text>
      ) : null}
    </Box>
  );
};

export function getQuickBuyEditFieldErrorMessage(
  error: QuickBuyEditFieldError | null,
): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case 'buy_above_zero':
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_buy_above_zero',
      );
    case 'buy_below_max':
      return strings(
        'social_leaderboard.quick_buy.edit_quick_amounts_buy_below_max',
        { max: '10,000' },
      );
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

export function formatBuyEditDisplayValue(
  value: string,
  currency: string,
): string {
  if (!value) {
    return `${getCurrencySymbol(currency)}0`;
  }
  return `${getCurrencySymbol(currency)}${value}`;
}

export function formatSellEditDisplayValue(value: string): string {
  if (!value) {
    return '0%';
  }
  return `${value}%`;
}

export default QuickBuyEditAmountField;
