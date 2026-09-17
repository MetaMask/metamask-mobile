import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  selectLimitOrderCostTolerance,
  selectLimitOrderMarketComparison,
} from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { LimitOrderConfirmationModal } from './LimitOrderConfirmationModal';
import type { LimitOrderConfirmationModalParams } from './types';

export const LimitOrderConfirmationModalScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<LimitOrderConfirmationModalParams>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const triggerComparison = useSelector(selectLimitOrderMarketComparison);

  const handleEditCostTolerancePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_DEFAULT_COST_TOLERANCE_MODAL,
    });
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    // STUB FOR LIMIT ORDER CREATION
    console.warn('Confirm limit order');
  }, []);

  return (
    <LimitOrderConfirmationModal
      {...params}
      triggerComparison={triggerComparison}
      costTolerance={`${costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE}%`}
      goBack={navigation.goBack}
      onConfirm={handleConfirm}
      onEditCostTolerancePress={handleEditCostTolerancePress}
    />
  );
};
