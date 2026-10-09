import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import LimitOrderAccountUpgradeFeeInfoSheet from './LimitOrderAccountUpgradeFeeInfoSheet';

export const LimitOrderAccountUpgradeFeeInfoSheetScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();

  return <LimitOrderAccountUpgradeFeeInfoSheet goBack={goBack} />;
};
