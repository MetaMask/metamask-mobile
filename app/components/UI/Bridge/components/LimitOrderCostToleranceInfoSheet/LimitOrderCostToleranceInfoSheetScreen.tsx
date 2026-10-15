import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import LimitOrderCostToleranceInfoSheet from './LimitOrderCostToleranceInfoSheet';

export const LimitOrderCostToleranceInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();

  return <LimitOrderCostToleranceInfoSheet goBack={goBack} />;
};
