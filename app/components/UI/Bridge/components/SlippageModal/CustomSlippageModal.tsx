import React, { useCallback, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../Base/Keypad';
import { InputStepper } from '../InputStepper';
import { DefaultSlippageModalParams } from './types';
import { customSlippageModalStyles } from './styles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useSlippageStepperDescription } from '../../hooks/useSlippageStepperDescription';
import { useShouldDisableCustomSlippageConfirm } from '../../hooks/useShouldDisableCustomSlippageConfirm';
import { useCustomSlippageCursor } from './useCustomSlippageCursor';

export const CustomSlippageModal = () => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { sourceChainId, destChainId } =
    useParams<DefaultSlippageModalParams>();
  const slippageConfig = useSlippageConfig({ sourceChainId, destChainId });
  const currentSlippage = useSelector(selectSlippage);
  const [inputAmount, setInputAmount] = useState(currentSlippage ?? '0');
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

    dispatch(setSlippage(sanitizedInputAmount));
    sheetRef.current?.onCloseBottomSheet();
  }, [dispatch, inputAmount]);

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
      <HeaderCompactStandard
        title={strings('bridge.slippage')}
        onClose={handleClose}
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
