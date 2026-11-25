import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectLimitOrderCostTolerance,
  setLimitOrderCostTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeLimitOrderDefaultCostTolerance } from '../../../../../selectors/bridge/featureFlags';
import { PriceToleranceCustomModal } from './PriceToleranceCustomModal';

export const SwapsLimitOrderCustomCostToleranceModal = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const limitCostTolerance = useSelector(selectLimitOrderCostTolerance);
  const defaultLimitCostTolerance = useSelector(
    selectBridgeLimitOrderDefaultCostTolerance,
  );

  const handleConfirm = useCallback(
    (value: string) => {
      dispatch(setLimitOrderCostTolerance(value));
    },
    [dispatch],
  );

  return (
    <PriceToleranceCustomModal
      initialValue={limitCostTolerance ?? defaultLimitCostTolerance}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
};
