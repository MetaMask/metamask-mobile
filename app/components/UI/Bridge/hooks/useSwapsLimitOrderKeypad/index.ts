import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeypadChangeData } from '../../../../Base/Keypad';
import { MAX_INPUT_LENGTH } from '../../components/TokenInputArea';
import type { SwapsKeypadRef } from '../../components/SwapsKeypad/types';
import { useSourceAmountCursor } from '../useSourceAmountCursor';
import type { useSourceAmountInput } from '../useSourceAmountInput';
import type { BridgeToken } from '../../types';
import { LIMIT_ORDER_FIAT_PRICE_DECIMALS } from '../../utils/limitOrders/formatLimitOrderFiatPrice';

export enum LimitOrderKeypadField {
  Amount = 'amount',
  LimitPrice = 'limitPrice',
  CustomPercent = 'customPercent',
}

const FIAT_KEYPAD_CURRENCY = 'SWAPS_FIAT_INPUT';
const CUSTOM_PERCENT_KEYPAD_CURRENCY = 'LIMIT_ORDER_CUSTOM_PERCENT';
const CUSTOM_PERCENT_DECIMALS = 0;

interface UseLimitOrderKeypadOptions {
  customPercent: string | undefined;
  isLimitFiatMode: boolean;
  limitPrice: string | undefined;
  nativeToken: BridgeToken | undefined;
  onCustomPercentChange: (value: string | undefined) => void;
  onLimitPriceChange: (value: string | undefined) => void;
  sourceAmountInput: ReturnType<typeof useSourceAmountInput>;
}

export const useSwapsLimitOrderKeypad = ({
  customPercent,
  isLimitFiatMode,
  limitPrice,
  nativeToken,
  onCustomPercentChange,
  onLimitPriceChange,
  sourceAmountInput,
}: UseLimitOrderKeypadOptions) => {
  const keypadRef = useRef<SwapsKeypadRef>(null);
  const [focusedField, setFocusedField] = useState(
    LimitOrderKeypadField.Amount,
  );

  const limitPriceDecimals = isLimitFiatMode
    ? LIMIT_ORDER_FIAT_PRICE_DECIMALS
    : (nativeToken?.decimals ?? Infinity);

  const {
    sourceSelection: limitPriceSelection,
    handleSourceSelectionChange: handleLimitPriceSelectionChange,
    handleKeypadChange: handleLimitPriceKeypadChange,
    setSourceAmountCursorPositionToEnd: setLimitPriceCursorToEnd,
  } = useSourceAmountCursor({
    sourceAmount: limitPrice,
    sourceTokenDecimals: limitPriceDecimals,
    maxInputLength: MAX_INPUT_LENGTH,
    onSourceAmountChange: onLimitPriceChange,
  });

  const {
    sourceSelection: customPercentSelection,
    handleSourceSelectionChange: handleCustomPercentSelectionChange,
    handleKeypadChange: handleCustomPercentKeypadChange,
    setSourceAmountCursorPositionToEnd: setCustomPercentCursorToEnd,
  } = useSourceAmountCursor({
    sourceAmount: customPercent,
    sourceTokenDecimals: CUSTOM_PERCENT_DECIMALS,
    maxInputLength: MAX_INPUT_LENGTH,
    onSourceAmountChange: onCustomPercentChange,
  });

  const { handleKeypadChange: handleAmountKeypadChange } = sourceAmountInput;

  const focusField = useCallback((field: LimitOrderKeypadField) => {
    setFocusedField(field);
    keypadRef.current?.open();
  }, []);

  const focusAmount = useCallback(
    () => focusField(LimitOrderKeypadField.Amount),
    [focusField],
  );

  const focusLimitPrice = useCallback(() => {
    setLimitPriceCursorToEnd(limitPrice);
    focusField(LimitOrderKeypadField.LimitPrice);
  }, [focusField, limitPrice, setLimitPriceCursorToEnd]);

  const focusCustomPercent = useCallback(() => {
    setCustomPercentCursorToEnd(customPercent);
    focusField(LimitOrderKeypadField.CustomPercent);
  }, [customPercent, focusField, setCustomPercentCursorToEnd]);

  const close = useCallback(() => keypadRef.current?.close(), []);

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      if (focusedField === LimitOrderKeypadField.CustomPercent) {
        handleCustomPercentKeypadChange(data);
        return;
      }

      if (focusedField === LimitOrderKeypadField.LimitPrice) {
        handleLimitPriceKeypadChange(data);
        return;
      }

      handleAmountKeypadChange(data);
    },
    [
      focusedField,
      handleAmountKeypadChange,
      handleCustomPercentKeypadChange,
      handleLimitPriceKeypadChange,
    ],
  );

  const isAmountFocused = focusedField === LimitOrderKeypadField.Amount;
  const isCustomPercentFocused =
    focusedField === LimitOrderKeypadField.CustomPercent;

  const keypadProps = useMemo(() => {
    if (isAmountFocused) {
      return {
        value: sourceAmountInput.keypadValue,
        currency: sourceAmountInput.keypadCurrency,
        decimals: sourceAmountInput.keypadDecimals,
      };
    }

    if (isCustomPercentFocused) {
      return {
        value: customPercent || '0',
        currency: CUSTOM_PERCENT_KEYPAD_CURRENCY,
        decimals: CUSTOM_PERCENT_DECIMALS,
        periodButtonProps: { isDisabled: true },
      };
    }

    return {
      value: limitPrice || '0',
      currency: isLimitFiatMode
        ? FIAT_KEYPAD_CURRENCY
        : nativeToken?.symbol || '',
      decimals: limitPriceDecimals,
    };
  }, [
    customPercent,
    isAmountFocused,
    isCustomPercentFocused,
    isLimitFiatMode,
    limitPrice,
    limitPriceDecimals,
    sourceAmountInput.keypadCurrency,
    sourceAmountInput.keypadDecimals,
    sourceAmountInput.keypadValue,
    nativeToken?.symbol,
  ]);

  return {
    close,
    customPercentSelection,
    focusAmount,
    focusCustomPercent,
    focusLimitPrice,
    handleChange,
    handleCustomPercentSelectionChange,
    handleLimitPriceSelectionChange,
    isAmountFocused,
    isCustomPercentFocused,
    keypadProps,
    keypadRef,
    limitPriceSelection,
  };
};
