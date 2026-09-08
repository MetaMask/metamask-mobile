import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import InputStepper from '../../../component-library/components-temp/InputStepper';
import Keypad from '../../Base/Keypad';
import {
  CUSTOM_SLIPPAGE_BOTTOM_SHEET_TESTID,
  CUSTOM_SLIPPAGE_CANCEL_TESTID,
  CUSTOM_SLIPPAGE_CLOSE_TESTID,
  CUSTOM_SLIPPAGE_CONFIRM_TESTID,
  CUSTOM_SLIPPAGE_KEYPAD_TESTID,
} from './CustomSlippageBottomSheet.constants';
import type { CustomSlippageBottomSheetProps } from './CustomSlippageBottomSheet.types';
import { useCustomSlippageCursor } from './useCustomSlippageCursor';

const formatSteppedValue = (
  nextValue: number,
  maxDecimals: number,
  maxAmount: number,
  minAmount: number,
  normalizeValue?: (pct: number) => string,
): string => {
  const capped = Math.min(maxAmount, Math.max(minAmount, nextValue));
  if (normalizeValue) {
    return normalizeValue(capped);
  }
  return String(parseFloat(capped.toFixed(maxDecimals)));
};

const CustomSlippageBottomSheet: React.FC<CustomSlippageBottomSheetProps> = ({
  isVisible = true,
  goBack,
  onClose,
  title,
  primaryButtonLabel,
  secondaryButtonLabel,
  value,
  onValueChange,
  minAmount,
  maxAmount,
  step,
  inputMaxDecimals,
  keypadCurrency = 'native',
  keypadDecimals,
  description,
  isConfirmDisabled = false,
  onAttemptExceedMaxChange,
  onConfirm,
  normalizeValue,
  testID = CUSTOM_SLIPPAGE_BOTTOM_SHEET_TESTID,
  closeButtonTestID = CUSTOM_SLIPPAGE_CLOSE_TESTID,
  primaryButtonTestID = CUSTOM_SLIPPAGE_CONFIRM_TESTID,
  secondaryButtonTestID = CUSTOM_SLIPPAGE_CANCEL_TESTID,
  keypadTestID = CUSTOM_SLIPPAGE_KEYPAD_TESTID,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const handleAttemptExceedMaxChange = useCallback(
    (exceeded: boolean) => {
      onAttemptExceedMaxChange?.(exceeded);
    },
    [onAttemptExceedMaxChange],
  );

  const { selection, handleSelectionChange, handleKeypadChange, resetCursor } =
    useCustomSlippageCursor({
      value,
      inputMaxDecimals,
      maxAmount,
      onValueChange,
      onAttemptExceedMaxChange: handleAttemptExceedMaxChange,
    });

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    if (isConfirmDisabled) {
      return;
    }
    const sanitizedValue = value.endsWith('.') ? value.slice(0, -1) : value;
    onConfirm(sanitizedValue);
    closeSheet();
  }, [closeSheet, isConfirmDisabled, onConfirm, value]);

  const handleIncrease = useCallback(() => {
    resetCursor();
    handleAttemptExceedMaxChange(false);
    const next = parseFloat(value) + step;
    onValueChange(
      next >= maxAmount
        ? String(maxAmount)
        : formatSteppedValue(
            next,
            inputMaxDecimals,
            maxAmount,
            minAmount,
            normalizeValue,
          ),
    );
  }, [
    handleAttemptExceedMaxChange,
    inputMaxDecimals,
    maxAmount,
    minAmount,
    normalizeValue,
    onValueChange,
    resetCursor,
    step,
    value,
  ]);

  const handleDecrease = useCallback(() => {
    resetCursor();
    handleAttemptExceedMaxChange(false);
    const next = parseFloat(value) - step;
    onValueChange(
      next <= minAmount
        ? String(minAmount)
        : formatSteppedValue(
            next,
            inputMaxDecimals,
            maxAmount,
            minAmount,
            normalizeValue,
          ),
    );
  }, [
    handleAttemptExceedMaxChange,
    inputMaxDecimals,
    maxAmount,
    minAmount,
    normalizeValue,
    onValueChange,
    resetCursor,
    step,
    value,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      goBack={goBack}
      testID={testID}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{ testID: closeButtonTestID }}
      >
        {title}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <InputStepper
          value={value}
          onDecrease={handleDecrease}
          onIncrease={handleIncrease}
          description={description}
          minAmount={minAmount}
          maxAmount={maxAmount}
          postValue="%"
          selection={selection}
          onSelectionChange={handleSelectionChange}
        />
      </Box>
      <Box twClassName="px-4" testID={keypadTestID}>
        <Keypad
          value={value}
          onChange={handleKeypadChange}
          currency={keypadCurrency}
          decimals={keypadDecimals}
        />
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={{
          children: secondaryButtonLabel,
          onPress: closeSheet,
          size: ButtonSize.Lg,
          testID: secondaryButtonTestID,
        }}
        primaryButtonProps={{
          children: primaryButtonLabel,
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isDisabled: isConfirmDisabled,
          testID: primaryButtonTestID,
        }}
      />
    </BottomSheet>
  );
};

export default CustomSlippageBottomSheet;
