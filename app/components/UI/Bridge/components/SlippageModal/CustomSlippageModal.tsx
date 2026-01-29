import React, { useCallback, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
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

export const CustomSlippageModal = () => {
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { network } = useParams<DefaultSlippageModalParams>();
  const slippageConfig = useSlippageConfig(network);
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

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    dispatch(setSlippage(inputAmount));
    sheetRef.current?.onCloseBottomSheet();
  }, [dispatch, inputAmount]);

  const handleKeypadChange = useCallback(
    (data: { value: string; valueAsNumber: number }) => {
      const [, decimalPart] = data.value.split('.');
      setHasAttemptedToExceedMax(false);

      // Cap the value to input_max_decimals
      if ((decimalPart?.length ?? 0) > slippageConfig.input_max_decimals) {
        return;
      }

      if (data.valueAsNumber > slippageConfig.max_amount) {
        setHasAttemptedToExceedMax(true);
        return;
      }

      // Do not render dot when reaching max_amount
      if (data.value === slippageConfig.max_amount + '.') {
        setInputAmount(String(slippageConfig.max_amount));
        setHasAttemptedToExceedMax(true);
        return;
      }

      setInputAmount(data.value);
    },
    [slippageConfig],
  );

  const handleOnIncreasePress = useCallback(() => {
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
  }, [slippageConfig]);

  const handleOnDecreasePress = useCallback(() => {
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
  }, [slippageConfig]);

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderCenter title={strings('bridge.slippage')} onClose={handleClose} />
      <View style={customSlippageModalStyles.stepperContainer}>
        <InputStepper
          value={inputAmount}
          onDecrease={handleOnDecreasePress}
          onIncrease={handleOnIncreasePress}
          description={description}
          minAmount={slippageConfig.min_amount}
          maxAmount={slippageConfig.max_amount}
          postValue="%"
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
