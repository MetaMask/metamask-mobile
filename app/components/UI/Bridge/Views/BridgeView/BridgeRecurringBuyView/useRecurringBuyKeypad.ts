import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectRecurringEveryValue,
  selectRecurringRepeatCount,
  setRecurringEveryValue,
  setRecurringRepeatCount,
} from '../../../../../../core/redux/slices/bridge';
import type { KeypadChangeData } from '../../../../../Base/Keypad';
import type { SwapsKeypadRef } from '../../../components/SwapsKeypad/types';
import type { useSwapsInputs } from '../../../hooks/useSwapsInputs';
import {
  capRecurringKeypadValue,
  RECURRING_EVERY_MAX_DIGITS,
  RECURRING_REPEAT_MAX_DIGITS,
} from '../../../utils/recurringSchedule';

export enum RecurringBuyKeypadField {
  Amount = 'amount',
  Every = 'every',
  Repeat = 'repeat',
}

// SwapsKeypad requires a currency code; the schedule fields are counts.
const SCHEDULE_KEYPAD_CURRENCY = '';

interface UseRecurringBuyKeypadOptions {
  sourceAmountInput: ReturnType<typeof useSwapsInputs>['sourceAmountInput'];
}

/**
 * Drives the single keypad the Recurring Buy tab shares between the swap
 * amount and the two schedule fields. Only one keypad exists because it is a
 * bottom sheet, so the field that was last pressed decides what it edits.
 */
export const useRecurringBuyKeypad = ({
  sourceAmountInput,
}: UseRecurringBuyKeypadOptions) => {
  const dispatch = useDispatch();
  const keypadRef = useRef<SwapsKeypadRef>(null);
  const [focusedField, setFocusedField] = useState(
    RecurringBuyKeypadField.Amount,
  );
  const everyValue = useSelector(selectRecurringEveryValue);
  const repeatCount = useSelector(selectRecurringRepeatCount);

  const { handleKeypadChange: handleAmountKeypadChange } = sourceAmountInput;

  const focusField = useCallback((field: RecurringBuyKeypadField) => {
    setFocusedField(field);
    keypadRef.current?.open();
  }, []);

  const focusAmount = useCallback(
    () => focusField(RecurringBuyKeypadField.Amount),
    [focusField],
  );
  const focusEvery = useCallback(
    () => focusField(RecurringBuyKeypadField.Every),
    [focusField],
  );
  const focusRepeat = useCallback(
    () => focusField(RecurringBuyKeypadField.Repeat),
    [focusField],
  );

  const close = useCallback(() => keypadRef.current?.close(), []);

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      if (focusedField === RecurringBuyKeypadField.Every) {
        dispatch(
          setRecurringEveryValue(
            capRecurringKeypadValue(
              everyValue,
              data.value,
              RECURRING_EVERY_MAX_DIGITS,
            ),
          ),
        );
        return;
      }

      if (focusedField === RecurringBuyKeypadField.Repeat) {
        dispatch(
          setRecurringRepeatCount(
            capRecurringKeypadValue(
              repeatCount,
              data.value,
              RECURRING_REPEAT_MAX_DIGITS,
            ),
          ),
        );
        return;
      }

      handleAmountKeypadChange(data);
    },
    [dispatch, everyValue, focusedField, handleAmountKeypadChange, repeatCount],
  );

  const isAmountFocused = focusedField === RecurringBuyKeypadField.Amount;

  const keypadProps = useMemo(() => {
    if (isAmountFocused) {
      return {
        value: sourceAmountInput.keypadValue,
        currency: sourceAmountInput.keypadCurrency,
        decimals: sourceAmountInput.keypadDecimals,
      };
    }

    return {
      value:
        focusedField === RecurringBuyKeypadField.Every
          ? everyValue
          : repeatCount,
      currency: SCHEDULE_KEYPAD_CURRENCY,
      decimals: 0,
      periodButtonProps: { isDisabled: true },
    };
  }, [
    everyValue,
    focusedField,
    isAmountFocused,
    repeatCount,
    sourceAmountInput.keypadCurrency,
    sourceAmountInput.keypadDecimals,
    sourceAmountInput.keypadValue,
  ]);

  return {
    close,
    focusAmount,
    focusEvery,
    focusRepeat,
    handleChange,
    isAmountFocused,
    keypadProps,
    keypadRef,
  };
};
