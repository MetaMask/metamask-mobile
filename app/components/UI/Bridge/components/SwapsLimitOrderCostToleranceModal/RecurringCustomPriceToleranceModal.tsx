import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectRecurringPriceTolerance,
  setRecurringPriceTolerance,
} from '../../../../../core/redux/slices/bridge';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { PriceToleranceCustomModal } from './PriceToleranceCustomModal';

export function RecurringCustomPriceToleranceModal() {
  const { goBack } = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultRecurringPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );

  const handleConfirm = useCallback(
    (value: string) => {
      dispatch(setRecurringPriceTolerance(value));
    },
    [dispatch],
  );

  return (
    <PriceToleranceCustomModal
      initialValue={recurringPriceTolerance ?? defaultRecurringPriceTolerance}
      onConfirm={handleConfirm}
      goBack={goBack}
    />
  );
}
