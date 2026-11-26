import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeLimitOrderDefaultCostTolerance } from '../../../../../selectors/bridge/featureFlags';
import { PriceTolerancePresetModal } from './PriceTolerancePresetModal';

export const SwapsLimitOrderDefaultCostToleranceModal = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const limitCostTolerance = useSelector(selectLimitOrderCostTolerance);
  const defaultLimitCostTolerance = useSelector(
    selectBridgeLimitOrderDefaultCostTolerance,
  );

  const handleCustomOptionPress = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_CUSTOM_COST_TOLERANCE_MODAL,
    });
  }, [navigation]);

  const handleSubmit = useCallback(
    (value: string) => {
      dispatch(setLimitOrderCostTolerance(value));
    },
    [dispatch],
  );

  return (
    <PriceTolerancePresetModal
      initialValue={limitCostTolerance ?? defaultLimitCostTolerance}
      getDescription={(value) =>
        strings('bridge.default_cost_tolerance_description', {
          costTolerance: value,
        })
      }
      onCustomPress={handleCustomOptionPress}
      onSubmit={handleSubmit}
      goBack={navigation.goBack}
    />
  );
};
