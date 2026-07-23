import {
  Box,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import type { QuickBuyEditFieldError } from '../utils/validateQuickBuyEditAmounts';
import QuickBuyEditAmountField, {
  formatBuyEditDisplayValue,
  formatSellEditDisplayValue,
  getQuickBuyEditFieldErrorMessage,
} from './QuickBuyEditAmountField';

export type QuickBuyEditFocusedField =
  | { kind: 'buy'; index: number }
  | { kind: 'sell'; index: number }
  | null;

interface QuickBuyEditAmountRowProps {
  label: string;
  kind: 'buy' | 'sell';
  values: string[];
  errors: (QuickBuyEditFieldError | null)[];
  focusedField: QuickBuyEditFocusedField;
  currentCurrency: string;
  onFieldPress: (index: number) => void;
}

const QuickBuyEditAmountRow: React.FC<QuickBuyEditAmountRowProps> = ({
  label,
  kind,
  values,
  errors,
  focusedField,
  currentCurrency,
  onFieldPress,
}) => {
  const rowErrorIndex = useMemo(
    () => errors.findIndex((error) => error !== null),
    [errors],
  );

  return (
    <Box twClassName="gap-2 py-1">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {label}
      </Text>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
        {values.map((value, index) => {
          const isFocused =
            focusedField?.kind === kind && focusedField.index === index;
          const errorKey = errors[index];
          const errorMessage = getQuickBuyEditFieldErrorMessage(errorKey);
          const displayValue =
            kind === 'buy'
              ? formatBuyEditDisplayValue(value, currentCurrency)
              : formatSellEditDisplayValue(value);

          return (
            <QuickBuyEditAmountField
              key={`${kind}-${index}`}
              displayValue={displayValue}
              isFocused={isFocused}
              isError={errorKey !== null}
              errorMessage={errorMessage}
              showRowError={rowErrorIndex === index}
              testID={`quick-buy-edit-${kind}-field-${index}`}
              onPress={() => onFieldPress(index)}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default QuickBuyEditAmountRow;
