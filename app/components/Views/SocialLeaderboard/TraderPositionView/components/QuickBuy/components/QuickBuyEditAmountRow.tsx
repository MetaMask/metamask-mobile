import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Label,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import type {
  QuickBuyEditFieldError,
  QuickBuyEditValidationContext,
} from '../utils/validateQuickBuyEditAmounts';
import QuickBuyEditAmountField, {
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
  validationContext: QuickBuyEditValidationContext;
  onFieldPress: (index: number) => void;
}

const FIELD_ROWS = [
  [0, 1],
  [2, 3],
] as const;

const QuickBuyEditAmountRow: React.FC<QuickBuyEditAmountRowProps> = ({
  label,
  kind,
  values,
  errors,
  focusedField,
  currentCurrency,
  validationContext,
  onFieldPress,
}) => {
  const rowErrorMessage = useMemo(() => {
    const errorIndex = errors.findIndex((error) => error !== null);
    if (errorIndex === -1) {
      return null;
    }
    return getQuickBuyEditFieldErrorMessage(
      errors[errorIndex],
      validationContext,
    );
  }, [errors, validationContext]);

  return (
    <Box twClassName="gap-2 py-1">
      <Label fontWeight={FontWeight.Medium}>{label}</Label>
      <Box twClassName="gap-4">
        {FIELD_ROWS.map((rowIndexes) => (
          <Box
            key={`${kind}-row-${rowIndexes[0]}`}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-4"
          >
            {rowIndexes.map((index) => (
              <QuickBuyEditAmountField
                key={`${kind}-${index}`}
                value={values[index] ?? ''}
                kind={kind}
                currency={kind === 'buy' ? currentCurrency : undefined}
                isError={errors[index] !== null}
                isFocused={
                  focusedField?.kind === kind && focusedField.index === index
                }
                testID={`quick-buy-edit-${kind}-field-${index}`}
                onPress={() => onFieldPress(index)}
              />
            ))}
          </Box>
        ))}
      </Box>
      {rowErrorMessage ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          testID={`quick-buy-edit-${kind}-row-error`}
        >
          {rowErrorMessage}
        </Text>
      ) : null}
    </Box>
  );
};

export default QuickBuyEditAmountRow;
