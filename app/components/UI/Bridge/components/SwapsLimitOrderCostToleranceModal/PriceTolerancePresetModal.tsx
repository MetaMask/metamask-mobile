import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { CostToleranceButtonGroup } from './CostToleranceButtonGroup';
import {
  COST_TOLERANCE_OPTIONS,
  CUSTOM_COST_TOLERANCE_OPTION_ID,
} from './constants';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';
import type {
  CostToleranceOption,
  PriceTolerancePresetModalProps,
} from './types';

export function PriceTolerancePresetModal({
  initialValue,
  getDescription,
  onCustomPress,
  onSubmit,
  goBack,
}: PriceTolerancePresetModalProps) {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const [selectedPriceTolerance, setSelectedPriceTolerance] =
    useState(initialValue);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(selectedPriceTolerance);
    sheetRef.current?.onCloseBottomSheet();
  }, [onSubmit, selectedPriceTolerance]);

  const priceToleranceOptions = useMemo(() => {
    const options: CostToleranceOption[] = COST_TOLERANCE_OPTIONS.map(
      (value) => ({
        id: value,
        label: `${value}%`,
        selected: value === selectedPriceTolerance,
        onPress: () => setSelectedPriceTolerance(value),
      }),
    );

    options.push({
      id: CUSTOM_COST_TOLERANCE_OPTION_ID,
      label: strings('bridge.custom'),
      selected: !COST_TOLERANCE_OPTIONS.includes(selectedPriceTolerance),
      onPress: onCustomPress,
    });

    return options;
  }, [onCustomPress, selectedPriceTolerance]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={goBack}
      testID={SwapsLimitOrderCostToleranceModalSelectorsIDs.DEFAULT_SHEET}
    >
      <HeaderStandardGlass
        isFloating={false}
        isGlass={isGlassHeader}
        title={strings('bridge.cost_tolerance')}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('bridge.close'),
        }}
      />
      <Box paddingHorizontal={4} paddingVertical={2}>
        <Text twClassName="text-center">
          {getDescription(selectedPriceTolerance)}
        </Text>
      </Box>
      <CostToleranceButtonGroup options={priceToleranceOptions} />
      <Box padding={4}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleSubmit}
          isFullWidth
        >
          {strings('bridge.submit')}
        </Button>
      </Box>
    </BottomSheet>
  );
}
