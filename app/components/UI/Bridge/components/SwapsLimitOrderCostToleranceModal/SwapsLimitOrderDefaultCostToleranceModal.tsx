import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { CostToleranceButtonGroup } from './CostToleranceButtonGroup';
import {
  COST_TOLERANCE_OPTIONS,
  CUSTOM_COST_TOLERANCE_OPTION_ID,
} from './constants';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';
import type { CostToleranceOption } from './types';

export const SwapsLimitOrderDefaultCostToleranceModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const [selectedCostTolerance, setSelectedCostTolerance] = useState(
    costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE,
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleCustomOptionPress = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_CUSTOM_COST_TOLERANCE_MODAL,
    });
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    dispatch(setLimitOrderCostTolerance(selectedCostTolerance));
    sheetRef.current?.onCloseBottomSheet();
  }, [dispatch, selectedCostTolerance]);

  const costToleranceOptions = useMemo(() => {
    const options: CostToleranceOption[] = COST_TOLERANCE_OPTIONS.map(
      (value) => ({
        id: value,
        label: `${value}%`,
        selected: value === selectedCostTolerance,
        onPress: () => setSelectedCostTolerance(value),
      }),
    );

    options.push({
      id: CUSTOM_COST_TOLERANCE_OPTION_ID,
      label: strings('bridge.custom'),
      selected: !COST_TOLERANCE_OPTIONS.includes(selectedCostTolerance),
      onPress: handleCustomOptionPress,
    });

    return options;
  }, [handleCustomOptionPress, selectedCostTolerance]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={SwapsLimitOrderCostToleranceModalSelectorsIDs.DEFAULT_SHEET}
    >
      <HeaderStandard
        title={strings('bridge.cost_tolerance')}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('bridge.close'),
        }}
      />
      <Box paddingHorizontal={4} paddingVertical={2}>
        <Text twClassName="text-center">
          {strings('bridge.default_cost_tolerance_description')}
        </Text>
      </Box>
      <CostToleranceButtonGroup options={costToleranceOptions} />
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
};
