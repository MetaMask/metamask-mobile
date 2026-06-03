import React, { useCallback, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { CaipChainId, Hex } from '@metamask/utils';
import Keypad from '../../../../Base/Keypad';
import { InputStepper } from '../InputStepper';
import { customSlippageModalStyles } from './styles';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { useSlippageStepperDescription } from '../../hooks/useSlippageStepperDescription';
import { useShouldDisableCustomSlippageConfirm } from '../../hooks/useShouldDisableCustomSlippageConfirm';
import { useCustomSlippageCursor } from './useCustomSlippageCursor';

interface CustomSlippageModalContentProps {
  initialSlippage?: string;
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
  onConfirmSlippage: (slippage: string) => void;
}

export const CustomSlippageModalContent = ({
  initialSlippage,
  sourceChainId,
  destChainId,
  onConfirmSlippage,
}: CustomSlippageModalContentProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const slippageConfig = useSlippageConfig({ sourceChainId, destChainId });
  const [inputAmount, setInputAmount] = useState(initialSlippage ?? '0');
  const [hasAttemptedToExceedMax, setHasAttemptedToExceedMax] = useState(false);
  const shouldDisableConfirm = useShouldDisableCustomSlippageConfirm({
    inputAmount,
    slippageConfig,
  });
  const description = useSlippageStepperDescription({
    inputAmount,
    slippageConfig,
    hasAttemptedToExceedMax,
  });
  const { selection, handleSelectionChange, handleKeypadChange, resetCursor } =
    useCustomSlippageCursor({
      value: inputAmount,
      inputMaxDecimals: slippageConfig.input_max_decimals,
      maxAmount: slippageConfig.max_amount,
      onValueChange: setInputAmount,
      onAttemptExceedMaxChange: setHasAttemptedToExceedMax,
    });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    const sanitizedInputAmount = inputAmount.endsWith('.')
      ? inputAmount.slice(0, -1)
      : inputAmount;

    onConfirmSlippage(sanitizedInputAmount);
    sheetRef.current?.onCloseBottomSheet();
  }, [inputAmount, onConfirmSlippage]);

  const handleOnIncreasePress = useCallback(() => {
    resetCursor();
    setHasAttemptedToExceedMax(false);

    setInputAmount((value) => {
      const newValue = parseFloat(value) + slippageConfig.input_step;
      // Cap the value to max_amount and to input_max_decimals due to JS rounding issues
      return newValue >= slippageConfig.max_amount
        ? String(slippageConfig.max_amount)
        : String(
            parseFloat(newValue.toFixed(slippageConfig.input_max_decimals)),
          );
    });
  }, [resetCursor, slippageConfig]);

  const handleOnDecreasePress = useCallback(() => {
    resetCursor();
    setHasAttemptedToExceedMax(false);

    setInputAmount((value) => {
      const newValue = parseFloat(value) - slippageConfig.input_step;
      // Cap the value to min_amount and to input_max_decimals due to JS rounding issues
      return newValue <= slippageConfig.min_amount
        ? String(slippageConfig.min_amount)
        : String(
            parseFloat(newValue.toFixed(slippageConfig.input_max_decimals)),
          );
    });
  }, [resetCursor, slippageConfig]);

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderStandard
        title={strings('bridge.slippage')}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('bridge.close'),
        }}
      />
      <View style={customSlippageModalStyles.stepperContainer}>
        <InputStepper
          value={inputAmount}
          onDecrease={handleOnDecreasePress}
          onIncrease={handleOnIncreasePress}
          description={description}
          minAmount={slippageConfig.min_amount}
          maxAmount={slippageConfig.max_amount}
          postValue="%"
          selection={selection}
          onSelectionChange={handleSelectionChange}
        />
      </View>
      <View style={customSlippageModalStyles.keypadContainer}>
        <Keypad
          value={inputAmount}
          onChange={handleKeypadChange}
          currency="native"
        />
      </View>
      <View style={customSlippageModalStyles.footerContainer}>
        <View style={customSlippageModalStyles.footerContainerSection}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleClose}
            isFullWidth
          >
            {strings('bridge.cancel')}
          </Button>
        </View>
        <View style={customSlippageModalStyles.footerContainerSection}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleConfirm}
            isFullWidth
            isDisabled={shouldDisableConfirm}
          >
            {strings('bridge.confirm')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};
