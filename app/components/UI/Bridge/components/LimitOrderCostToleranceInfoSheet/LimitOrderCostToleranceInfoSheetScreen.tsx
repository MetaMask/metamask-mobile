import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectLimitOrderCostTolerance } from '../../../../../core/redux/slices/bridge';
import { LIMIT_ORDER_DEFAULT_COST_TOLERANCE } from '../../constants/limitOrders';
import { COST_TOLERANCE_MAX_DECIMALS } from '../SwapsLimitOrderCostToleranceModal/constants';
import LimitOrderCostToleranceInfoSheet from './LimitOrderCostToleranceInfoSheet';

export const LimitOrderCostToleranceInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const costTolerance = useSelector(selectLimitOrderCostTolerance);
  const minReceivedPercentage = Number(
    (
      100 -
      Number.parseFloat(costTolerance ?? LIMIT_ORDER_DEFAULT_COST_TOLERANCE)
    ).toFixed(COST_TOLERANCE_MAX_DECIMALS),
  );

  return (
    <LimitOrderCostToleranceInfoSheet
      minReceivedPercentage={minReceivedPercentage}
      goBack={goBack}
    />
  );
};
