import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import Keypad from '../../../../Base/Keypad';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { InputStepper } from '../InputStepper';
import {
  COST_TOLERANCE_MAX,
  COST_TOLERANCE_MAX_DECIMALS,
  COST_TOLERANCE_MIN,
  COST_TOLERANCE_STEP,
} from './constants';
import { useCostToleranceCursor } from './useCostToleranceCursor';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';

export const SwapsLimitOrderCustomCostToleranceModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const [inputAmount, setInputAmount] = useState(
    costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE,
  );
  const [hasAttemptedToExceedMax, setHasAttemptedToExceedMax] = useState(false);
  const parsedInputAmount = Number.parseFloat(inputAmount);
  const isBelowMin = !(parsedInputAmount > COST_TOLERANCE_MIN);
  const isAboveMax = parsedInputAmount >= COST_TOLERANCE_MAX;
  const shouldDisableConfirm = isBelowMin || isAboveMax;
  const { selection, handleSelectionChange, handleKeypadChange, resetCursor } =
    useCostToleranceCursor({
      value: inputAmount,
      inputMaxDecimals: COST_TOLERANCE_MAX_DECIMALS,
      maxAmount: COST_TOLERANCE_MAX,
      onValueChange: setInputAmount,
      onAttemptExceedMaxChange: setHasAttemptedToExceedMax,
    });

  const description = useMemo(() => {
    if (!isBelowMin && !isAboveMax && !hasAttemptedToExceedMax) {
      return undefined;
    }

    return {
      color: TextColor.ErrorDefault,
      icon: {
        name: IconName.Danger,
        size: IconSize.Lg,
        color: IconColor.ErrorDefault,
      },
      message: isBelowMin
        ? strings('bridge.exceeding_lower_cost_tolerance_error', {
            value: COST_TOLERANCE_MIN,
          })
        : strings('bridge.exceeding_upper_cost_tolerance_error', {
            value: COST_TOLERANCE_MAX,
          }),
    };
  }, [hasAttemptedToExceedMax, isAboveMax, isBelowMin]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    const sanitizedInputAmount = inputAmount.endsWith('.')
      ? inputAmount.slice(0, -1)
      : inputAmount;

    dispatch(setLimitOrderCostTolerance(sanitizedInputAmount));
    sheetRef.current?.onCloseBottomSheet();
  }, [dispatch, inputAmount]);

  const handleOnIncreasePress = useCallback(() => {
    resetCursor();
    setHasAttemptedToExceedMax(false);

    setInputAmount((value) => {
      const newValue = Number.parseFloat(value) + COST_TOLERANCE_STEP;
      // Cap the value to the max and to the allowed decimals due to JS rounding issues
      return newValue >= COST_TOLERANCE_MAX
        ? String(COST_TOLERANCE_MAX)
        : String(
            Number.parseFloat(newValue.toFixed(COST_TOLERANCE_MAX_DECIMALS)),
          );
    });
  }, [resetCursor]);

  const handleOnDecreasePress = useCallback(() => {
    resetCursor();
    setHasAttemptedToExceedMax(false);

    setInputAmount((value) => {
      const newValue = Number.parseFloat(value) - COST_TOLERANCE_STEP;
      // Cap the value to the min and to the allowed decimals due to JS rounding issues
      return newValue <= COST_TOLERANCE_MIN
        ? String(COST_TOLERANCE_MIN)
        : String(
            Number.parseFloat(newValue.toFixed(COST_TOLERANCE_MAX_DECIMALS)),
          );
    });
  }, [resetCursor]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={goBack}
      testID={SwapsLimitOrderCostToleranceModalSelectorsIDs.CUSTOM_SHEET}
    >
      <HeaderStandard
        title={strings('bridge.cost_tolerance')}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('bridge.close'),
        }}
      />
      <Box padding={4}>
        <InputStepper
          value={inputAmount}
          onDecrease={handleOnDecreasePress}
          onIncrease={handleOnIncreasePress}
          description={description}
          minAmount={COST_TOLERANCE_MIN}
          maxAmount={COST_TOLERANCE_MAX}
          postValue="%"
          selection={selection}
          onSelectionChange={handleSelectionChange}
        />
      </Box>
      <Box padding={4}>
        <Keypad
          value={inputAmount}
          onChange={handleKeypadChange}
          currency="native"
        />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Around}
        padding={4}
        gap={3}
      >
        <Box twClassName="flex-1">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleClose}
            isFullWidth
          >
            {strings('bridge.cancel')}
          </Button>
        </Box>
        <Box twClassName="flex-1">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleConfirm}
            isFullWidth
            isDisabled={shouldDisableConfirm}
          >
            {strings('bridge.confirm')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};
